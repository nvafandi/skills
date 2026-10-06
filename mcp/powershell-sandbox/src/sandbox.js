import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import config from './config.js';

const RUN_ID_RE = /^\d{8}-\d{6}-[0-9a-f]{6}$/;
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Ubah path in-sandbox jadi path yang terlihat dari host.
 * Saat server jalan di container Linux, PS_SANDBOX_HOST_ROOT menunjuk ke folder
 * yang di-bind-mount ke /sandbox, jadi pemanggil (OpenCode di host) tetap bisa
 * membuka file log/artifact dengan tool filesystem miliknya.
 */
export function toHostPath(target) {
  if (!config.hostRoot || config.hostRoot === config.dirs.root) return target;
  const rel = path.relative(config.dirs.root, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return target;
  return path.join(config.hostRoot, rel);
}

/* ------------------------------------------------------------------ layout */

export async function ensureLayout() {
  for (const dir of Object.values(config.dirs)) {
    await fsp.mkdir(dir, { recursive: true });
  }
}

/* ------------------------------------------------------------- path guards */

export class SandboxError extends Error {
  constructor(message, code = 'SANDBOX_ERROR') {
    super(message);
    this.name = 'SandboxError';
    this.code = code;
  }
}

function assertNoNul(value) {
  if (typeof value !== 'string' || value.includes('\0')) {
    throw new SandboxError('Path tidak valid.', 'INVALID_PATH');
  }
}

/** Pastikan `target` berada di dalam `base` (anti path traversal / symlink escape). */
function resolveInside(base, target, label = 'path') {
  assertNoNul(target);
  const baseResolved = path.resolve(base);
  const resolved = path.resolve(baseResolved, target);
  const rel = path.relative(baseResolved, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new SandboxError(
      `${label} berada di luar sandbox: ${target}`,
      'PATH_ESCAPE',
    );
  }
  return resolved;
}

/** Kalau target sudah ada, pastikan realpath-nya tetap di dalam base. */
async function assertRealpathInside(base, target, label = 'path') {
  let real;
  try {
    real = await fsp.realpath(target);
  } catch {
    return target; // belum ada; tidak ada symlink untuk diperiksa
  }
  return resolveInside(await fsp.realpath(base), real, label);
}

/** Deteksi path absolut lintas-platform (POSIX, drive Windows, UNC). */
const ABSOLUTE_RE = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;

/** Resolusi nama script relatif terhadap folder scripts/. */
export async function resolveScriptPath(name) {
  assertNoNul(name);
  if (path.isAbsolute(name) || ABSOLUTE_RE.test(name)) {
    throw new SandboxError(
      'Gunakan path relatif terhadap folder scripts/ sandbox.',
      'INVALID_PATH',
    );
  }
  if (!name.toLowerCase().endsWith('.ps1')) {
    throw new SandboxError('Hanya file .ps1 yang bisa dieksekusi.', 'INVALID_SCRIPT');
  }
  const target = resolveInside(config.dirs.scripts, name, 'script');
  return assertRealpathInside(config.dirs.scripts, target, 'script');
}

/* ------------------------------------------------------------ script files */

export async function listScripts() {
  await ensureLayout();
  const out = [];
  async function walk(dir, prefix = '') {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.name.toLowerCase().endsWith('.ps1')) {
        const stat = await fsp.stat(full);
        out.push({
          name: rel,
          size_bytes: stat.size,
          modified_at: stat.mtime.toISOString(),
        });
      }
    }
  }
  await walk(config.dirs.scripts);
  return out.sort((a, b) => b.modified_at.localeCompare(a.modified_at));
}

export async function writeScript({ name, content, overwrite = false }) {
  await ensureLayout();
  assertNoNul(content);
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > config.maxScriptBytes) {
    throw new SandboxError(
      `Ukuran script ${bytes} byte melebihi batas ${config.maxScriptBytes} byte.`,
      'TOO_LARGE',
    );
  }
  const target = await resolveScriptPath(name);
  const existed = fs.existsSync(target);
  if (existed && !overwrite) {
    throw new SandboxError(
      `Script sudah ada: ${name}. Gunakan overwrite=true untuk menimpa.`,
      'ALREADY_EXISTS',
    );
  }
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, content.replace(/^\uFEFF/, ''), 'utf8');
  return { name: path.relative(config.dirs.scripts, target).split(path.sep).join('/'), size_bytes: bytes, created: !existed };
}

export async function readScript(name) {
  const target = await resolveScriptPath(name);
  const stat = await fsp.stat(target);
  return {
    name: path.relative(config.dirs.scripts, target).split(path.sep).join('/'),
    size_bytes: stat.size,
    modified_at: stat.mtime.toISOString(),
    content: await fsp.readFile(target, 'utf8'),
  };
}

export async function deleteScript(name) {
  const target = await resolveScriptPath(name);
  await fsp.unlink(target);
  return { name: path.relative(config.dirs.scripts, target).split(path.sep).join('/'), deleted: true };
}

/* ------------------------------------------------------------- guardrails */

export function scanDenied(content) {
  const hits = [];
  const lines = String(content).split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const code = line.replace(/^\s*#.*$/, '');
    for (const { re, reason } of config.denyPatterns) {
      if (re.test(code)) {
        hits.push({ line: index + 1, reason, text: line.trim().slice(0, 160) });
        break;
      }
    }
  }
  return hits;
}

/* ------------------------------------------------------------ concurrency */

let active = 0;
const waiters = [];

async function acquire() {
  if (active < config.maxConcurrent) {
    active += 1;
    return;
  }
  await new Promise((resolve) => waiters.push(resolve));
  active += 1;
}

function release() {
  active -= 1;
  const next = waiters.shift();
  if (next) next();
}

/* ------------------------------------------------------------------- utils */

function clampTimeout(ms) {
  const value = Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : config.defaultTimeoutMs;
  return Math.min(value, config.maxTimeoutMs);
}

function truncate(text, maxBytes) {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= maxBytes) return { text, truncated: false, bytes: buf.length };
  return {
    text: `${buf.subarray(0, maxBytes).toString('utf8')}\n...[dipotong @ ${maxBytes} byte]`,
    truncated: true,
    bytes: buf.length,
  };
}

function validateExtraEnv(extra = {}) {
  const entries = Object.entries(extra);
  if (entries.length > config.maxEnvVars) {
    throw new SandboxError(
      `Maksimal ${config.maxEnvVars} env var tambahan per run.`,
      'INVALID_ENV',
    );
  }
  const clean = {};
  for (const [key, value] of entries) {
    if (!ENV_NAME_RE.test(key)) {
      throw new SandboxError(`Nama env var tidak valid: ${key}`, 'INVALID_ENV');
    }
    if (typeof value !== 'string' || value.includes('\0')) {
      throw new SandboxError(`Nilai env var tidak valid: ${key}`, 'INVALID_ENV');
    }
    clean[key] = value;
  }
  return clean;
}

function buildEnv(runId, runDir, extra) {
  const env = {};
  for (const key of config.envAllowlist) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  // Folder temp diarahkan ke dalam sandbox supaya tidak mengotori folder user.
  env.TEMP = runDir;
  env.TMP = runDir;
  env.PS_SANDBOX = '1';
  env.PS_SANDBOX_ROOT = config.dirs.root;
  if (config.hostRoot) env.PS_SANDBOX_HOST_ROOT = config.hostRoot;
  env.PS_SANDBOX_RUN_ID = runId;
  env.POWERSHELL_TELEMETRY_OPTOUT = '1';
  env.POWERSHELL_UPDATECHECK = 'Off';
  if (env.PSModulePath) {
    env.PSModulePath = `${env.PSModulePath}${path.delimiter}${path.join(runDir, 'modules')}`;
  }
  return { ...env, ...extra };
}

async function pruneOld(dir, keep) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  const runs = entries
    .filter((e) => e.isDirectory() && RUN_ID_RE.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
  let removed = 0;
  for (const name of runs.slice(keep)) {
    await fsp.rm(path.join(dir, name), { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

/* -------------------------------------------------------------- run engine */

export async function runScript({
  script,
  args = [],
  timeoutMs,
  env = {},
  label,
  kind = 'file',
}) {
  await ensureLayout();

  const scriptPath = await resolveScriptPath(script);
  const extraEnv = validateExtraEnv(env);
  const stat = await fsp.stat(scriptPath);

  let hits = [];
  if (config.denyPatterns.length > 0) {
    hits = scanDenied(await fsp.readFile(scriptPath, 'utf8'));
    if (hits.length > 0) {
      throw new SandboxError(
        `Script diblokir guardrail: ${hits.map((h) => `baris ${h.line} (${h.reason})`).join(', ')}. ` +
          'Set PS_SANDBOX_DENY=0 untuk menonaktifkan.',
        'DENIED',
      );
    }
  }

  const limit = clampTimeout(timeoutMs);
  const runId = `${stamp()}-${randomBytes(3).toString('hex')}`;
  const runDir = path.join(config.dirs.work, runId);
  const logDir = path.join(config.dirs.logs, runId);
  await fsp.mkdir(runDir, { recursive: true });
  await fsp.mkdir(path.join(runDir, 'modules'), { recursive: true });
  await fsp.mkdir(logDir, { recursive: true });

  const childEnv = buildEnv(runId, runDir, extraEnv);
  const shellArgs = [...config.shellArgs, '-File', scriptPath, ...args.map(String)];
  const startedAt = new Date();

  await acquire();
  let result;
  try {
    result = await execute({
      shellArgs,
      childEnv,
      runDir,
      logDir,
      limit,
      startedAt,
      meta: {
        run_id: runId,
        kind,
        label: label || null,
        script: path.relative(config.dirs.scripts, scriptPath).split(path.sep).join('/'),
        script_path: toHostPath(scriptPath),
        script_size_bytes: stat.size,
        args: args.map(String),
        timeout_ms: limit,
        extra_env_keys: Object.keys(extraEnv),
      },
    });
  } finally {
    release();
  }

  await Promise.all([
    pruneOld(config.dirs.work, config.keepRuns),
    pruneOld(config.dirs.logs, config.keepRuns),
  ]);

  return result;
}

/** Jalankan kode inline: ditulis ke file .ps1 di work dir lalu dieksekusi. */
export async function runCode({ code, args = [], timeoutMs, env = {}, label }) {
  assertNoNul(code);
  const runId = `${stamp()}-${randomBytes(3).toString('hex')}`;
  await ensureLayout();
  const tmpDir = path.join(config.dirs.work, '_inline');
  await fsp.mkdir(tmpDir, { recursive: true });
  const name = `inline-${runId}.ps1`;
  await writeScript({ name: `__inline/${name}`, content: code, overwrite: true });
  try {
    return await runScript({
      script: `__inline/${name}`,
      args,
      timeoutMs,
      env,
      label: label || 'inline',
      kind: 'inline',
    });
  } finally {
    await fsp.rm(path.join(tmpDir, name), { force: true }).catch(() => {});
  }
}

function stamp(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}

function execute({ shellArgs, childEnv, runDir, logDir, limit, startedAt, meta }) {
  return new Promise((resolve) => {
    const stdoutFile = path.join(logDir, 'stdout.log');
    const stderrFile = path.join(logDir, 'stderr.log');
    const outStream = fs.createWriteStream(stdoutFile, { encoding: 'utf8' });
    const errStream = fs.createWriteStream(stderrFile, { encoding: 'utf8' });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let spawnError = null;

    const child = spawn(config.shell, shellArgs, {
      cwd: runDir,
      env: childEnv,
      windowsHide: true,
      // Di Linux spawn jadi leader process group supaya killTree bisa menyapu
      // seluruh anak pwsh dengan satu sinyal ke -pid.
      detached: !config.isWindows,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
      if (config.isWindows) child.kill('SIGKILL');
    }, limit);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (stdout.length < config.maxOutputBytes * 4) stdout += chunk;
      outStream.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < config.maxOutputBytes * 4) stderr += chunk;
      errStream.write(chunk);
    });
    child.on('error', (err) => {
      spawnError = err;
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      outStream.end();
      errStream.end();

      const finishedAt = new Date();
      const out = truncate(stdout, config.maxOutputBytes);
      const err = truncate(stderr, config.maxOutputBytes);

      const summary = {
        ok: !timedOut && !spawnError && code === 0,
        ...meta,
        exit_code: code,
        signal: signal || null,
        timed_out: timedOut,
        spawn_error: spawnError ? spawnError.message : null,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: finishedAt - startedAt,
        stdout: out.text,
        stderr: err.text,
        stdout_truncated: out.truncated,
        stderr_truncated: err.truncated,
        stdout_bytes: out.bytes,
        stderr_bytes: err.bytes,
        cwd: toHostPath(runDir),
        sandbox_cwd: runDir,
        log_dir: toHostPath(logDir),
        stdout_log: toHostPath(stdoutFile),
        stderr_log: toHostPath(stderrFile),
      };

      fsp
        .writeFile(path.join(logDir, 'result.json'), JSON.stringify(summary, null, 2), 'utf8')
        .catch(() => {});
      resolve(summary);
    });
  });
}

/** Matikan seluruh pohon proses: taskkill di Windows, sinyal process group di Linux. */
function killTree(pid) {
  if (!pid) return;
  if (config.isWindows) {
    try {
      spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      }).on('error', () => {});
    } catch {
      /* best effort */
    }
    return;
  }
  // detached:true di spawn membuat child jadi leader group, jadi -pid = seluruh grup.
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    try {
      process.kill(-pid, signal);
    } catch {
      try {
        process.kill(pid, signal);
      } catch {
        /* proses sudah mati */
      }
    }
  }
}

/* ------------------------------------------------------------------- info */

export async function sandboxInfo() {
  await ensureLayout();
  let powershell = { available: false, version: null, error: null };
  await acquire();
  try {
    const probe = await new Promise((resolve) => {
      const child = spawn(
        config.shell,
        [...config.shellArgs, '-Command', '$PSVersionTable.PSVersion.ToString()'],
        {
          cwd: config.dirs.root,
          env: { ...pickProcessEnv(), TEMP: config.dirs.root, TMP: config.dirs.root },
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      let out = '';
      child.stdout.on('data', (c) => (out += c.toString()));
      child.on('error', (err) => resolve({ ok: false, error: err.message }));
      child.on('close', (code) => resolve({ ok: code === 0, version: out.trim() }));
    });
    powershell = {
      available: probe.ok,
      version: probe.ok ? probe.version : null,
      error: probe.ok ? null : probe.error || 'tidak bisa menjalankan PowerShell',
    };
  } finally {
    release();
  }

  const [workCount, logCount, scriptCount] = await Promise.all([
    countRunDirs(config.dirs.work),
    countRunDirs(config.dirs.logs),
    countScripts(config.dirs.scripts),
  ]);

  return {
    runtime: {
      platform: process.platform,
      in_container: fs.existsSync('/.dockerenv') || fs.existsSync('/run/.containerenv'),
      node_version: process.version,
    },
    root: config.dirs.root,
    host_root: config.hostRoot,
    scripts_dir: config.dirs.scripts,
    work_dir: config.dirs.work,
    logs_dir: config.dirs.logs,
    shell: config.shell,
    shell_args: config.shellArgs,
    powershell,
    limits: {
      default_timeout_ms: config.defaultTimeoutMs,
      max_timeout_ms: config.maxTimeoutMs,
      max_output_bytes: config.maxOutputBytes,
      max_concurrent: config.maxConcurrent,
      max_script_bytes: config.maxScriptBytes,
      keep_runs: config.keepRuns,
    },
    guardrails: {
      deny_enabled: config.denyPatterns.length > 0,
      deny_rules: config.denyPatterns.map((d) => d.reason),
    },
    env_allowlist: config.envAllowlist,
    counts: { scripts: scriptCount, work_dirs: workCount, log_dirs: logCount },
  };
}

function pickProcessEnv() {
  const env = {};
  for (const key of config.envAllowlist) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return env;
}

async function countRunDirs(dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && RUN_ID_RE.test(e.name)).length;
  } catch {
    return 0;
  }
}

async function countScripts(dir) {
  let total = 0;
  const walk = async (current) => {
    for (const entry of await fsp.readdir(current, { withFileTypes: true })) {
      if (entry.isDirectory()) await walk(path.join(current, entry.name));
      else if (entry.name.toLowerCase().endsWith('.ps1')) total += 1;
    }
  };
  try {
    await walk(dir);
  } catch {
    /* ignore */
  }
  return total;
}

export const readLog = async (runId, which = 'stdout') => {
  assertNoNul(runId);
  if (!RUN_ID_RE.test(runId)) throw new SandboxError('run_id tidak valid.', 'INVALID_PATH');
  const file = path.join(config.dirs.logs, runId, `${which}.log`);
  await assertRealpathInside(config.dirs.logs, file, 'log');
  return { run_id: runId, which, content: await fsp.readFile(file, 'utf8') };
};