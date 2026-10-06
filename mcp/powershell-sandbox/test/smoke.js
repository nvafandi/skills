/**
 * Smoke test: jalankan MCP server lewat stdio dan panggil semua tool inti.
 * Jalankan: npm test
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverEntry = path.join(here, '..', 'src', 'server.js');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  env: {
    ...process.env,
    PS_SANDBOX_ROOT: path.join(here, '.tmp-sandbox'),
    PS_SANDBOX_DEFAULT_TIMEOUT_MS: '30000',
  },
  stderr: 'inherit',
});

const client = new Client({ name: 'smoke-test', version: '1.0.0' });

async function call(name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text ?? '';
  const data = text ? JSON.parse(text) : {};
  return { res, data };
}

function check(label, condition, extra = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    console.error(`  FAIL  ${label} ${extra}`);
    process.exitCode = 1;
  }
}

try {
  await client.connect(transport);
  console.log('connected');

  const tools = await client.listTools();
  console.log(`tools: ${tools.tools.map((t) => t.name).join(', ')}`);
  check('8 tool terdaftar', tools.tools.length === 8, `dapat ${tools.tools.length}`);

  const info = await call('sandbox_info');
  check('sandbox_info ok', info.data.ok === undefined && !!info.data.root, JSON.stringify(info.data).slice(0, 200));
  check('PowerShell terdeteksi', info.data.powershell?.available === true, info.data.powershell?.error || '');
  console.log(`  info: root=${info.data.root} ps=${info.data.powershell?.version}`);

  await call('write_script', {
    name: 'smoke/hello.ps1',
    content: [
      'param([string]$Name = "world")',
      '$ErrorActionPreference = "Stop"',
      'Write-Output "hello $Name"',
      'New-Item -ItemType File -Path (Join-Path $PWD "artifact.txt") -Force | Out-Null',
      'Write-Output "cwd=$PWD"',
      'Write-Output "temp=$env:TEMP"',
      'exit 0',
    ].join('\n'),
  });
  const dup = await call('write_script', { name: 'smoke/hello.ps1', content: 'Write-Output "x"' });
  check('tolak overwrite tanpa flag', dup.res.isError === true && dup.data.code === 'ALREADY_EXISTS');

  const list = await call('list_scripts');
  check('script terdaftar', list.data.scripts?.some((s) => s.name === 'smoke/hello.ps1'), JSON.stringify(list.data));

  const read = await call('read_script', { name: 'smoke/hello.ps1' });
  check('baca script', /hello \$Name/.test(read.data.content || ''));

  const traversal = await call('read_script', { name: '../../../Windows/System32/drivers/etc/hosts.ps1' });
  check('tolak path traversal', traversal.res.isError === true && traversal.data.code === 'PATH_ESCAPE');

  const absolute = await call('run_script', { script: 'C:/Windows/System32/calc.ps1' });
  check('tolak path absolut', absolute.res.isError === true && absolute.data.code === 'INVALID_PATH');

  const okRun = await call('run_script', { script: 'smoke/hello.ps1', args: ['-Name', 'sandbox'] });
  check('run exit 0', okRun.data.exit_code === 0, JSON.stringify(okRun.data).slice(0, 300));
  check('stdout berisi hello', /hello sandbox/.test(okRun.data.stdout || ''));
  check('cwd di dalam sandbox', String(okRun.data.cwd || '').startsWith(info.data.work_dir));
  check('TEMP diarahkan ke run dir', String(okRun.data.stdout || '').includes(String(okRun.data.cwd)));
  console.log(`  run_id=${okRun.data.run_id} durasi=${okRun.data.duration_ms}ms log=${okRun.data.stdout_log}`);

  const logRead = await call('read_log', { run_id: okRun.data.run_id, which: 'stdout' });
  check('baca log run', /hello sandbox/.test(logRead.data.content || ''));

  await call('write_script', { name: 'smoke/fail.ps1', content: 'Write-Error "boom"; exit 3' });
  const failRun = await call('run_script', { script: 'smoke/fail.ps1' });
  check('exit code diteruskan', failRun.data.exit_code === 3, JSON.stringify(failRun.data).slice(0, 200));
  check('stderr tertangkap', /boom/.test(failRun.data.stderr || ''));

  await call('write_script', { name: 'smoke/slow.ps1', content: 'Start-Sleep -Seconds 30' });
  const timeoutRun = await call('run_script', { script: 'smoke/slow.ps1', timeout_ms: 2000 });
  check('timeout terpenuhi', timeoutRun.data.timed_out === true, JSON.stringify(timeoutRun.data).slice(0, 200));

  const inline = await call('run_code', {
    code: 'Write-Output ("ps=" + $PSVersionTable.PSVersion.ToString())',
  });
  check('run_code inline', /ps=5\./.test(inline.data.stdout || ''), JSON.stringify(inline.data).slice(0, 200));

  await call('write_script', { name: 'smoke/denied.ps1', content: 'Format-Volume -DriveLetter D' });
  const denied = await call('run_script', { script: 'smoke/denied.ps1' });
  check('guardrail memblokir', denied.res.isError === true && denied.data.code === 'DENIED', JSON.stringify(denied.data));

  await call('write_script', { name: 'smoke/env.ps1', content: 'Write-Output "custom=$env:PS_SANDBOX_TOKEN"' });
  const envRun = await call('run_script', { script: 'smoke/env.ps1', env: { PS_SANDBOX_TOKEN: 'abc123' } });
  check('env tambahan diteruskan', /custom=abc123/.test(envRun.data.stdout || ''), envRun.data.stderr || '');

  const del = await call('delete_script', { name: 'smoke/env.ps1' });
  check('hapus script', del.data.deleted === true);

  console.log('\nsmoke test selesai');
} catch (err) {
  console.error('smoke test error:', err);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}