import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Env allowlist: hanya variabel ini yang diteruskan ke child process. */
const ENV_ALLOWLIST = [
  'SystemRoot',
  'SystemDrive',
  'windir',
  'ComSpec',
  'PATHEXT',
  'PATH',
  'USERPROFILE',
  'HOME',
  'HOMEDRIVE',
  'HOMEPATH',
  'APPDATA',
  'LOCALAPPDATA',
  'ProgramData',
  'ProgramFiles',
  'ProgramFiles(x86)',
  'ProgramW6432',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
  'PSModulePath',
  'LANG',
];

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function boolEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

/** Daftar env dipisah koma, dinormalisasi jadi ekstensi berekstensi titik. */
function extListEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const items = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => (item.startsWith('.') ? item : `.${item}`));
  return items.length > 0 ? items : fallback;
}

const IS_WINDOWS = process.platform === 'win32';

/**
 * Default root:
 * - di dalam container Linux → /sandbox (bind mount dari host)
 * - di host Windows → %TEMP%\opencode\ps-sandbox
 */
const defaultRoot = IS_WINDOWS
  ? path.join(os.tmpdir(), 'opencode', 'ps-sandbox')
  : '/sandbox';

const root = path.resolve(process.env.PS_SANDBOX_ROOT || defaultRoot);

/**
 * Path sandbox di sisi host, kalau server jalan di dalam container.
 * Dipakai supaya path yang dilaporkan ke pemanggil tetap bisa dibuka dari host.
 * Di Linux jangan di-resolve: nilai ini memang path Windows (mis. C:/Users/...)
 * yang hanya dipakai untuk ditampilkan.
 */
const hostRootEnv = process.env.PS_SANDBOX_HOST_ROOT;
const hostRoot = hostRootEnv
  ? IS_WINDOWS
    ? path.resolve(hostRootEnv)
    : hostRootEnv.replace(/\/+$/, '')
  : IS_WINDOWS
    ? root
    : null;

/** Shell PowerShell (default untuk .ps1). */
const psShell = process.env.PS_SANDBOX_SHELL || (IS_WINDOWS ? 'powershell.exe' : 'pwsh');

/** Argumen dasar PowerShell; `-File <script>` ditambahkan runtime. */
const psShellArgs = ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass'];

/**
 * Shell POSIX untuk .sh.
 * Di Windows, `bash.exe` bawaan dari WindowsApps cuma launcher interop WSL yang
 * merusak path Windows, jadi Git Bash (cygwin) yang diprioritaskan.
 */
function defaultShShell() {
  if (!IS_WINDOWS) return 'bash';
  const candidates = [
    'C:/Program Files/Git/bin/bash.exe',
    'C:/Program Files (x86)/Git/bin/bash.exe',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || 'bash';
}

const shShell = process.env.PS_SANDBOX_SH_SHELL || defaultShShell();

/**
 * Argumen sebelum nama script untuk shell POSIX.
 * Default kosong supaya `bash <script> <args...>` — argumen script langsung
 * diterima sebagai $1, $2, ... tanpa perlu `--`.
 */
const shShellArgs = (process.env.PS_SANDBOX_SH_ARGS || '')
  .split(' ')
  .map((arg) => arg.trim())
  .filter(Boolean);

/**
 * Ekstensi script yang boleh ditulis/dijalankan.
 * Default: .ps1 (PowerShell) + .sh (bash).
 */
const extensions = extListEnv('PS_SANDBOX_EXTENSIONS', ['.ps1', '.sh']);

/** Registry shell per ekstensi. `args` dijalankan sebelum nama script. */
const shells = {
  '.ps1': { kind: 'powershell', shell: psShell, args: psShellArgs },
  '.sh': { kind: 'sh', shell: shShell, args: shShellArgs },
};

export const config = {
  root,
  hostRoot,
  isWindows: IS_WINDOWS,
  dirs: {
    root,
    scripts: path.join(root, 'scripts'),
    work: path.join(root, 'work'),
    logs: path.join(root, 'logs'),
  },
  /** Shell yang dipakai untuk eksekusi (pwsh di container Linux). */
  shell: psShell,
  /** Argumen dasar; `-File <script>` ditambahkan runtime. */
  shellArgs: psShellArgs,
  /** Ekstensi script yang diizinkan + registry shell per ekstensi. */
  extensions,
  shells,
  /** Normalisasi CRLF -> LF saat menulis .sh (bash gagal kalau ada \r). */
  normalizeShLineEndings: boolEnv('PS_SANDBOX_SH_NORMALIZE_EOL', true),
  defaultTimeoutMs: intEnv('PS_SANDBOX_DEFAULT_TIMEOUT_MS', 120_000),
  maxTimeoutMs: intEnv('PS_SANDBOX_MAX_TIMEOUT_MS', 600_000),
  /** Batas byte output yang dikembalikan ke pemanggil (sisanya dipotong + disimpan penuh di log). */
  maxOutputBytes: intEnv('PS_SANDBOX_MAX_OUTPUT_BYTES', 200_000),
  maxConcurrent: intEnv('PS_SANDBOX_MAX_CONCURRENT', 2),
  /** Jumlah run terbaru yang tetap disimpan di disk. */
  keepRuns: intEnv('PS_SANDBOX_KEEP_RUNS', 50),
  maxScriptBytes: intEnv('PS_SANDBOX_MAX_SCRIPT_BYTES', 1_000_000),
  maxEnvVars: 20,
  envAllowlist: ENV_ALLOWLIST,
  /** Guardrails ringan (bukan security boundary). */
  denyPatterns: boolEnv('PS_SANDBOX_DENY', true)
    ? [
        { re: /\bFormat-Volume\b/i, reason: 'Format-Volume' },
        { re: /\bClear-Disk\b/i, reason: 'Clear-Disk' },
        { re: /\bInitialize-Disk\b/i, reason: 'Initialize-Disk' },
        { re: /\bRemove-Partition\b/i, reason: 'Remove-Partition' },
        { re: /\bRemove-Item\b[^\n]*-[^\n]*\b-[rR]ecurse\b[^\n]*\b([A-Za-z]:\\|C:\\|D:\\|E:\\)\s*$/i, reason: 'Remove-Item -Recurse pada drive root' },
        { re: /\brd\s+\/[sq]\b/i, reason: 'rd /s' },
        { re: /\bformat\s+[a-z]:/i, reason: 'format drive' },
        { re: /\bRemove-CimInstance\b/i, reason: 'Remove-CimInstance' },
        { re: /\bStop-Computer\b/i, reason: 'Stop-Computer' },
        { re: /\bRestart-Computer\b/i, reason: 'Restart-Computer' },
        { re: /\bSet-ExecutionPolicy\b/i, reason: 'Set-ExecutionPolicy' },
        { re: /\bDisable-WindowsOptionalFeature\b/i, reason: 'Disable-WindowsOptionalFeature' },
        { re: /\breg(\.exe)?\s+delete\b/i, reason: 'reg delete' },
        { re: /\bcipher\s+[a-z]:\s*\/w/i, reason: 'cipher /w' },
      ]
    : [],
  /**
   * Guardrail untuk script .sh.
   * Dipisah dari daftar PowerShell supaya tidak ada false positive lintas bahasa.
   */
  shDenyPatterns: boolEnv('PS_SANDBOX_DENY_SH', boolEnv('PS_SANDBOX_DENY', true))
    ? [
        { re: /\brm\b[^\n]*\s-[a-z]*[rf][a-z]*[^\n]*\s\/(?:\s|$)/, reason: 'rm -rf /' },
        { re: /\brm\b[^\n]*\s--no-preserve-root\b/i, reason: 'rm --no-preserve-root' },
        { re: /\bmkfs(\.[a-z0-9]+)?\b/i, reason: 'mkfs' },
        { re: /\bwipefs\b/i, reason: 'wipefs' },
        { re: /\bdd\b[^\n]*\bof=\/dev\//i, reason: 'dd ke device' },
        { re: />\s*\/dev\/(sd|nvme|hd|disk)/i, reason: 'tulis ke device blok' },
        { re: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/, reason: 'fork bomb' },
        { re: /\bchmod\b[^\n]*\s-[a-z]*r[a-z]*[^\n]*\s\/(?:\s|$)/i, reason: 'chmod rekursif pada root' },
        { re: /\b(shutdown|reboot|halt|poweroff)\b/i, reason: 'matikan mesin' },
        { re: /\binit\s+[06]\b/, reason: 'init 0/6' },
        { re: /\bshred\b[^\n]*\s\/dev\//i, reason: 'shred device' },
      ]
    : [],
};

export default config;

/** Ekstensi (lowercase, berekstensi titik) dari nama file script. */
export function extOf(name) {
  return path.extname(String(name)).toLowerCase();
}

/** Shell yang dipakai untuk sebuah nama file, atau null kalau ekstensinya tidak didukung. */
export function shellFor(name) {
  return config.shells[extOf(name)] || null;
}

/** Daftar guardrail sesuai bahasa script supaya tidak ada false positive lintas bahasa. */
export function denyPatternsFor(kind) {
  return kind === 'sh' ? config.shDenyPatterns : config.denyPatterns;
}