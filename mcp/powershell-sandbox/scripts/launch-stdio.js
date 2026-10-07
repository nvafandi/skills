#!/usr/bin/env node
/**
 * Launcher stdio untuk mode podman.
 *
 * Dipakai OpenCode sebagai command MCP:
 *   "command": ["C:/Program Files/nodejs/node.exe", ".../scripts/launch-stdio.js"]
 *
 * Kenapa perlu launcher, bukan `podman run` langsung?
 * 1. `podman run` yang di-spawn langsung oleh OpenCode (Bun) kadang langsung
 *    exit sehingga handshake MCP gagal dengan "Connection closed", padahal
 *    image-nya sehat. Spawn lewat proses Node intermediate stabil.
 * 2. Folder bind mount harus sudah ada. Kalau belum, podman membuatnya sendiri
 *    dan container (user non-root `sandboxer`) gagal `mkdir` di /sandbox.
 * 3. Podman machine kadang belum siap; launcher menyalakannya lebih dulu.
 * 4. Podman machine bisa mati saat laptop sleep → percobaan connect ulang.
 *
 * Semua argumen podman bisa dioverride lewat env PS_PODMAN_*.
 * Kalau node dipakai untuk spawn, file ini harus di-forward apa adanya:
 * stdout = protokol MCP, stderr = diagnostik.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const PODMAN = process.env.PS_PODMAN_BIN || 'C:/Program Files/RedHat/Podman/podman.exe';
const IMAGE = process.env.PS_PODMAN_IMAGE || 'localhost/powershell-sandbox-mcp:latest';
const HOST_ROOT = process.env.PS_PODMAN_HOST_ROOT
  || path.join(process.env.TEMP || process.env.TMP || '.', 'opencode', 'ps-sandbox');
const MACHINE = process.env.PS_PODMAN_MACHINE || 'podman-machine-default';
const ATTEMPTS = Number.parseInt(process.env.PS_PODMAN_ATTEMPTS || '3', 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.PS_PODMAN_RETRY_DELAY_MS || '3000', 10);

const envFlag = (name, fallback) => {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
};

function log(message) {
  const line = `[ps-sandbox-launch] ${message}\n`;
  process.stderr.write(line);
  // OpenCode membuang stderr MCP, jadi simpan juga ke file kalau diminta.
  if (process.env.PS_PODMAN_LOG) {
    try {
      fs.appendFileSync(process.env.PS_PODMAN_LOG, line);
    } catch { /* best effort */ }
  }
}

function podmanArgs() {
  return [
    'run', '-i', '--rm',
    '--network', envFlag('PS_PODMAN_NETWORK', 'none'),
    '--memory', envFlag('PS_PODMAN_MEMORY', '2g'),
    '--pids-limit', envFlag('PS_PODMAN_PIDS_LIMIT', '512'),
    '-v', `${HOST_ROOT}:/sandbox`,
    '-e', `PS_SANDBOX_HOST_ROOT=${HOST_ROOT}`,
    '-e', `PS_SANDBOX_DEFAULT_TIMEOUT_MS=${envFlag('PS_PODMAN_DEFAULT_TIMEOUT_MS', '120000')}`,
    '-e', `PS_SANDBOX_MAX_CONCURRENT=${envFlag('PS_PODMAN_MAX_CONCURRENT', '2')}`,
    '-e', `PS_SANDBOX_DENY=${envFlag('PS_PODMAN_DENY', '1')}`,
    IMAGE,
  ];
}

function podman(args, opts = {}) {
  return spawnSync(PODMAN, args, { encoding: 'utf8', timeout: 120_000, ...opts });
}

/** Pastikan folder bind mount ada; tanpa ini container non-root gagal start. */
function ensureHostRoot() {
  try {
    fs.mkdirSync(HOST_ROOT, { recursive: true });
    for (const sub of ['scripts', 'work', 'logs']) {
      fs.mkdirSync(path.join(HOST_ROOT, sub), { recursive: true });
    }
    return true;
  } catch (err) {
    log(`gagal menyiapkan ${HOST_ROOT}: ${err.message}`);
    return false;
  }
}

/** Podman siap pakai? `podman info` berhasil berarti machine hidup dan terjangkau. */
function podmanReady() {
  return podman(['info', '--format', '{{.Version.Version}}']).status === 0;
}

/**
 * Nyalakan podman machine kalau belum jalan (butuh beberapa detik).
 * `podman machine list` menandai machine default dengan `*`, jadi mencocokkan
 * nama dari sana rapuh; `podman info` lebih langsung dan apa adanya.
 */
function ensureMachine() {
  if (podmanReady()) return true;

  log('podman belum siap, mencoba menyalakan machine...');
  podman(['machine', 'start', MACHINE], { timeout: 180_000 });

  if (podmanReady()) {
    log('podman machine siap');
    return true;
  }
  log('podman tetap tidak bisa dihubungi');
  return false;
}

/** Sanity check singkat: podman bisa melihat image yang akan dijalankan. */
function imagePresent() {
  const res = podman(['image', 'exists', IMAGE]);
  if (res.status !== 0) {
    log(`image ${IMAGE} tidak ada, jalankan scripts/podman-build.ps1`);
    return false;
  }
  return true;
}

function launch() {
  const child = spawn(PODMAN, podmanArgs(), {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  // MCP butuh stdin tetap terbuka selama percakapan.
  process.stdin.on('data', (chunk) => {
    if (!child.stdin.destroyed) child.stdin.write(chunk);
  });
  process.stdin.on('end', () => {
    if (!child.stdin.destroyed) child.stdin.end();
  });
  process.stdin.on('error', () => {});
  child.stdin.on('error', () => {});

  let settled = false;
  let sawServerOutput = false;

  child.stdout.on('data', () => {
    sawServerOutput = true;
  });

  child.on('error', (err) => {
    if (settled) return;
    settled = true;
    log(`spawn podman gagal: ${err.message}`);
    process.exit(1);
  });

  child.on('close', (code) => {
    if (settled) return;
    settled = true;
    // Kalau sudah pernah ada balasan, ini cuma penutupan normal saat MCP
    // menutup stdin. Belum ada output = handshake memang gagal.
    if (sawServerOutput) {
      log(`podman selesai (code=${code})`);
      process.exit(code ?? 0);
    }
    log(`podman keluar tanpa membalas handshake (code=${code})`);
    process.exit(code ?? 1);
  });

  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
  return child;
}

async function main() {
  log(`image=${IMAGE} host_root=${HOST_ROOT}`);
  ensureHostRoot();

  for (let attempt = 1; ; attempt += 1) {
    if (ensureMachine() && imagePresent()) {
      launch();
      return;
    }
    if (attempt >= ATTEMPTS) {
      log(`gagal setelah ${attempt} percobaan, keluar`);
      process.exit(1);
    }
    log(`percobaan ${attempt} gagal, ulangi dalam ${RETRY_DELAY_MS}ms`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
}

await main();
