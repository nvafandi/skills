#!/usr/bin/env node
/**
 * MCP server (stdio) — powershell-sandbox
 *
 * Menjalankan script PowerShell di sandbox ringan:
 * - working dir khusus per run (di dalam sandbox root)
 * - env minimal (allowlist) + TEMP/TMP diarahkan ke dalam sandbox
 * - timeout + kill seluruh pohon proses
 * - log stdout/stderr + result.json per run, output dipotong untuk pemanggil
 * - penjaga path (anti traversal/symlink escape) + guardrails pola berbahaya
 *
 * CATATAN: ini isolasi ringan, bukan security boundary. Jangan jalankan script
 * yang tidak dipercaya tanpa sandbox OS (AppContainer/WDAC, container, VM).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import config from './config.js';
import {
  SandboxError,
  deleteScript,
  ensureLayout,
  listScripts,
  readLog,
  readScript,
  runCode,
  runScript,
  sandboxInfo,
  writeScript,
} from './sandbox.js';

const server = new McpServer(
  { name: 'powershell-sandbox', version: '1.1.0' },
  {
    capabilities: { tools: {} },
    instructions:
      'Gunakan tool ini untuk menulis dan menjalankan script tanpa mencemari folder kerja utama. ' +
      'Alur umum: write_script -> run_script -> baca stdout/stderr dari hasil. ' +
      'Ekstensi .ps1 dieksekusi dengan PowerShell (pwsh), .sh dengan bash; interpreter dipilih ' +
      'otomatis dari ekstensi file. Semua path relatif terhadap folder scripts/ di dalam sandbox; ' +
      'path di luar sandbox ditolak.',
  },
);

function ok(payload) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function fail(err) {
  const payload =
    err instanceof SandboxError
      ? { ok: false, error: err.message, code: err.code }
      : { ok: false, error: err?.message || String(err), code: 'INTERNAL_ERROR' };
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function wrap(handler) {
  return async (args) => {
    try {
      return await handler(args);
    } catch (err) {
      if (err instanceof SandboxError) {
        console.error(`[powershell-sandbox] ditolak (${err.code}): ${err.message}`);
      } else {
        console.error('[powershell-sandbox] error:', err?.stack || err);
      }
      return fail(err);
    }
  };
}

const timeoutSchema = z
  .number()
  .int()
  .positive()
  .max(config.maxTimeoutMs)
  .optional()
  .describe(`Timeout dalam ms (default ${config.defaultTimeoutMs}, maks ${config.maxTimeoutMs}).`);

const envSchema = z
  .record(z.string(), z.string())
  .optional()
  .describe('Env var tambahan untuk run ini (maks 20).');

/* ------------------------------------------------------------ sandbox_info */

server.registerTool(
  'sandbox_info',
  {
    title: 'Info sandbox',
    description:
      'Informasi sandbox: folder root/scripts/work/logs, versi tiap shell (.ps1/.sh), limit, ' +
      'guardrails, env allowlist, dan jumlah file.',
    inputSchema: {},
  },
  wrap(async () => ok(await sandboxInfo())),
);

/* ------------------------------------------------------------ list_scripts */

server.registerTool(
  'list_scripts',
  {
    title: 'Daftar script',
    description:
      'Daftar semua file script (.ps1/.sh) yang ada di folder scripts/ sandbox, diurutkan dari yang terbaru.',
    inputSchema: {},
  },
  wrap(async () => ok({ ok: true, scripts: await listScripts() })),
);

/* ------------------------------------------------------------ write_script */

server.registerTool(
  'write_script',
  {
    title: 'Tulis script',
    description:
      'Membuat atau menimpa file script di dalam folder scripts/ sandbox. Path relatif saja ' +
      '(subfolder dibolehkan). .ps1 ditulis apa adanya; .sh dinormalisasi ke line ending LF ' +
      'dan dilaporkan lewat normalized_crlf.',
    inputSchema: {
      name: z.string().describe('Nama file relatif, contoh: deploy/check.ps1 atau deploy/check.sh'),
      content: z.string().describe('Isi script (UTF-8): PowerShell untuk .ps1, bash untuk .sh.'),
      overwrite: z.boolean().optional().describe('Set true untuk menimpa file yang sudah ada.'),
    },
  },
  wrap(async ({ name, content, overwrite }) => ok({ ok: true, ...(await writeScript({ name, content, overwrite })) })),
);

/* ------------------------------------------------------------- read_script */

server.registerTool(
  'read_script',
  {
    title: 'Baca script',
    description: 'Membaca isi file script (.ps1/.sh) dari folder scripts/ sandbox.',
    inputSchema: {
      name: z.string().describe('Nama file relatif, contoh: deploy/check.ps1'),
    },
  },
  wrap(async ({ name }) => ok({ ok: true, ...(await readScript(name)) })),
);

/* ----------------------------------------------------------- delete_script */

server.registerTool(
  'delete_script',
  {
    title: 'Hapus script',
    description: 'Menghapus file script (.ps1/.sh) dari folder scripts/ sandbox.',
    inputSchema: {
      name: z.string().describe('Nama file relatif, contoh: deploy/check.ps1'),
    },
  },
  wrap(async ({ name }) => ok({ ok: true, ...(await deleteScript(name)) })),
);

/* -------------------------------------------------------------- run_script */

server.registerTool(
  'run_script',
  {
    title: 'Jalankan script',
    description:
      'Menjalankan file script di sandbox: proses terpisah, working dir per-run, env minimal, timeout, log, ' +
      'dan hasil berisi exit_code/duration/stdout/stderr. Path relatif terhadap scripts/. ' +
      'Interpreter dipilih dari ekstensi: .ps1 -> pwsh -File, .sh -> bash <script>. ' +
      'Argumen tools/call ditulis sebagai array agar spasi tidak terpecah.',
    inputSchema: {
      script: z.string().describe('Path relatif script, contoh: deploy/check.ps1 atau deploy/check.sh'),
      args: z.array(z.string()).optional().describe('Argumen tambahan setelah nama script.'),
      timeout_ms: timeoutSchema,
      env: envSchema,
      label: z.string().optional().describe('Label bebas untuk keperluan Pencatatan run.'),
    },
  },
  wrap(async (args) => ok(await runScript(args))),
);

/* ---------------------------------------------------------------- run_code */

server.registerTool(
  'run_code',
  {
    title: 'Jalankan kode inline',
    description:
      'Menjalankan potongan kode PowerShell langsung. Kode ditulis ke file sementara di sandbox lalu dieksekusi ' +
      'dengan proteksi yang sama seperti run_script. Untuk kode panjang, pakai write_script + run_script.',
    inputSchema: {
      code: z.string().describe('Kode PowerShell yang akan dieksekusi.'),
      args: z.array(z.string()).optional(),
      timeout_ms: timeoutSchema,
      env: envSchema,
      label: z.string().optional(),
    },
  },
  wrap(async (args) => ok(await runCode(args))),
);

/* ---------------------------------------------------------------- read_log */

server.registerTool(
  'read_log',
  {
    title: 'Baca log run',
    description:
      'Membaca log stdout/stderr lengkap dari sebuah run (output yang dikembalikan run_script sudah dipotong).',
    inputSchema: {
      run_id: z.string().describe('run_id dari hasil run, contoh: 20260101-120000-a1b2c3'),
      which: z.enum(['stdout', 'stderr']).optional().describe('Default: stdout'),
    },
  },
  wrap(async ({ run_id, which }) => ok({ ok: true, ...(await readLog(run_id, which || 'stdout')) })),
);

/* ------------------------------------------------------------------- start */

async function main() {
  await ensureLayout();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr saja — stdout dipakai protokol MCP.
  console.error(`[powershell-sandbox] siap, root=${config.dirs.root}`);
}

main().catch((err) => {
  console.error('[powershell-sandbox] gagal start:', err);
  process.exit(1);
});