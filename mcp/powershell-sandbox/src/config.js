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

const root = path.resolve(
  process.env.PS_SANDBOX_ROOT || path.join(os.tmpdir(), 'opencode', 'ps-sandbox'),
);

export const config = {
  root,
  dirs: {
    root,
    scripts: path.join(root, 'scripts'),
    work: path.join(root, 'work'),
    logs: path.join(root, 'logs'),
  },
  /** Shell yang dipakai untuk eksekusi. */
  shell: process.env.PS_SANDBOX_SHELL || 'powershell.exe',
  /** Argumen dasar; `-File <script>` ditambahkan runtime. */
  shellArgs: ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass'],
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
};

export default config;