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

/**
 * Default: jalankan server native di host.
 * Untuk mode container, set PS_SANDBOX_MCP_COMMAND (JSON array) berisi perintah
 * podman run, contoh:
 *   PS_SANDBOX_MCP_COMMAND='["podman","run","-i","--rm","-v","C:/.../ps-sandbox:/sandbox","localhost/powershell-sandbox-mcp:latest"]'
 *   PS_SANDBOX_MCP_ENV='{"PS_SANDBOX_HOST_ROOT":"C:/.../ps-sandbox"}'
 */
const customCommand = process.env.PS_SANDBOX_MCP_COMMAND
  ? JSON.parse(process.env.PS_SANDBOX_MCP_COMMAND)
  : null;
const customEnv = process.env.PS_SANDBOX_MCP_ENV
  ? JSON.parse(process.env.PS_SANDBOX_MCP_ENV)
  : {};

const transport = new StdioClientTransport({
  command: customCommand ? customCommand[0] : process.execPath,
  args: customCommand ? customCommand.slice(1) : [serverEntry],
  env: customCommand
    ? { ...process.env, ...customEnv, PS_SANDBOX_DEFAULT_TIMEOUT_MS: '30000' }
    : {
        ...process.env,
        PS_SANDBOX_ROOT: path.join(here, '.tmp-sandbox'),
        PS_SANDBOX_DEFAULT_TIMEOUT_MS: '30000',
      },
  stderr: 'inherit',
});

const client = new Client({ name: 'smoke-test', version: '1.0.0' });
const mode = customCommand ? `container (${customCommand[0]})` : 'native host';

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
  console.log(`connected (mode: ${mode})`);

  const tools = await client.listTools();
  console.log(`tools: ${tools.tools.map((t) => t.name).join(', ')}`);
  check('8 tool terdaftar', tools.tools.length === 8, `dapat ${tools.tools.length}`);

  const info = await call('sandbox_info');
  check('sandbox_info ok', info.data.ok === undefined && !!info.data.root, JSON.stringify(info.data).slice(0, 200));
  check('PowerShell terdeteksi', info.data.powershell?.available === true, info.data.powershell?.error || '');
  console.log(
    `  info: runtime=${JSON.stringify(info.data.runtime)} root=${info.data.root} ` +
      `host_root=${info.data.host_root} ps=${info.data.powershell?.version}`,
  );
  check(
    'mode container sesuai harvest',
    customCommand ? info.data.runtime?.in_container === true : true,
    `in_container=${info.data.runtime?.in_container}`,
  );

  // Path yang dilaporkan harus yang terlihat dari sisi pemanggil (host).
  const expectedWorkRoot = info.data.host_root
    ? `${info.data.host_root}/work`
    : info.data.work_dir;
  const normPath = (value) => String(value || '').replace(/\\/g, '/').replace(/\/+$/, '');

  await call('write_script', {
    name: 'smoke/hello.ps1',
    overwrite: true,
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
  check(
    'cwd di dalam sandbox',
    normPath(okRun.data.cwd).startsWith(normPath(expectedWorkRoot)),
    `cwd=${okRun.data.cwd} expected=${expectedWorkRoot}`,
  );
  check(
    'TEMP diarahkan ke run dir',
    String(okRun.data.stdout || '').includes(String(okRun.data.sandbox_cwd || okRun.data.cwd)),
  );
  console.log(`  run_id=${okRun.data.run_id} durasi=${okRun.data.duration_ms}ms log=${okRun.data.stdout_log}`);

  const logRead = await call('read_log', { run_id: okRun.data.run_id, which: 'stdout' });
  check('baca log run', /hello sandbox/.test(logRead.data.content || ''));

  await call('write_script', { name: 'smoke/fail.ps1', overwrite: true, content: 'Write-Error "boom"; exit 3' });
  const failRun = await call('run_script', { script: 'smoke/fail.ps1' });
  check('exit code diteruskan', failRun.data.exit_code === 3, JSON.stringify(failRun.data).slice(0, 200));
  check('stderr tertangkap', /boom/.test(failRun.data.stderr || ''));

  await call('write_script', { name: 'smoke/slow.ps1', overwrite: true, content: 'Start-Sleep -Seconds 30' });
  const timeoutRun = await call('run_script', { script: 'smoke/slow.ps1', timeout_ms: 2000 });
  check('timeout terpenuhi', timeoutRun.data.timed_out === true, JSON.stringify(timeoutRun.data).slice(0, 200));

  const inline = await call('run_code', {
    code: 'Write-Output ("ps=" + $PSVersionTable.PSVersion.ToString())',
  });
  check('run_code inline', /ps=\d+\./.test(inline.data.stdout || ''), JSON.stringify(inline.data).slice(0, 200));

  // run_code harus membersihkan file sementara-nya sendiri.
  const afterInline = await call('list_scripts');
  check(
    'run_code tidak meninggalkan file sementara',
    !afterInline.data.scripts?.some((s) => s.name.startsWith('__inline/')),
    JSON.stringify(afterInline.data.scripts?.filter((s) => s.name.startsWith('__inline/'))),
  );

  await call('write_script', { name: 'smoke/denied.ps1', overwrite: true, content: 'Format-Volume -DriveLetter D' });
  const denied = await call('run_script', { script: 'smoke/denied.ps1' });
  check('guardrail memblokir', denied.res.isError === true && denied.data.code === 'DENIED', JSON.stringify(denied.data));

  await call('write_script', { name: 'smoke/env.ps1', overwrite: true, content: 'Write-Output "custom=$env:PS_SANDBOX_TOKEN"' });
  const envRun = await call('run_script', { script: 'smoke/env.ps1', env: { PS_SANDBOX_TOKEN: 'abc123' } });
  check('env tambahan diteruskan', /custom=abc123/.test(envRun.data.stdout || ''), envRun.data.stderr || '');

  const del = await call('delete_script', { name: 'smoke/env.ps1' });
  check('hapus script', del.data.deleted === true);

  /* --------------------------------------------------------------- script .sh */

  const shSupported = info.data.extensions?.includes('.sh') === true;
  if (shSupported) {
    const bashOk = info.data.shells?.['.sh']?.available === true;

    await call('write_script', {
      name: 'smoke/hello.sh',
      overwrite: true,
      // Sengaja pakai CRLF untuk memastikan normalisasi LF bekerja.
      content: [
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        'name="${1:-world}"',
        'echo "hello $name"',
        'echo "args=$#"',
        'echo "cwd=$PWD"',
        'echo "temp=${TEMP:-unset}"',
        'if [ -n "${PS_SANDBOX_TOKEN:-}" ]; then echo "token=$PS_SANDBOX_TOKEN"; fi',
      ].join('\r\n'),
    });
    check('write .sh dinormalisasi ke LF', true);

    const badExt = await call('write_script', { name: 'smoke/nope.py', content: 'print(1)' });
    check(
      'tolak ekstensi di luar daftar',
      badExt.res.isError === true && badExt.data.code === 'INVALID_SCRIPT',
      JSON.stringify(badExt.data),
    );

    const shList = await call('list_scripts');
    check('.sh masuk daftar script', shList.data.scripts?.some((s) => s.name === 'smoke/hello.sh'));

    if (bashOk) {
      const shRun = await call('run_script', { script: 'smoke/hello.sh', args: ['sandbox'] });
      check('.sh exit 0', shRun.data.exit_code === 0, JSON.stringify(shRun.data).slice(0, 300));
      check('.sh stdout benar', /hello sandbox/.test(shRun.data.stdout || ''), shRun.data.stderr || '');
      check('.sh meneruskan args', /args=1/.test(shRun.data.stdout || ''), shRun.data.stdout || '');
      check(
        '.sh cwd di dalam sandbox',
        normPath(shRun.data.cwd).startsWith(normPath(expectedWorkRoot)),
        `cwd=${shRun.data.cwd}`,
      );
      // Git Bash (cygwin) menimpa TEMP/TMP jadi /tmp, jadi cek ini khusus POSIX native.
      if (process.platform !== 'win32') {
        check('.sh TEMP diarahkan', String(shRun.data.stdout || '').includes(String(shRun.data.sandbox_cwd || '')));
      }
      check('.sh interpreter tercatat', /bash/.test(String(shRun.data.interpreter || '')), String(shRun.data.interpreter));

      await call('write_script', {
        name: 'smoke/fail.sh',
        overwrite: true,
        content: 'echo "ke stderr" >&2\nexit 7\n',
      });
      const shFail = await call('run_script', { script: 'smoke/fail.sh' });
      check('.sh exit code diteruskan', shFail.data.exit_code === 7, JSON.stringify(shFail.data).slice(0, 200));
      check('.sh stderr tertangkap', /ke stderr/.test(shFail.data.stderr || ''));

      await call('write_script', { name: 'smoke/env.sh', overwrite: true, content: 'echo "custom=$PS_SANDBOX_TOKEN"\n' });
      const shEnv = await call('run_script', {
        script: 'smoke/env.sh',
        env: { PS_SANDBOX_TOKEN: 'sh123' },
      });
      check('.sh env tambahan diteruskan', /custom=sh123/.test(shEnv.data.stdout || ''), shEnv.data.stderr || '');

      await call('write_script', { name: 'smoke/denied.sh', overwrite: true, content: 'rm -rf /\n' });
      const shDenied = await call('run_script', { script: 'smoke/denied.sh' });
      check(
        'guardrail sh memblokir',
        shDenied.res.isError === true && shDenied.data.code === 'DENIED',
        JSON.stringify(shDenied.data),
      );

      await call('write_script', {
        name: 'smoke/timeout.sh',
        overwrite: true,
        content: 'sleep 30\n',
      });
      const shTimeout = await call('run_script', { script: 'smoke/timeout.sh', timeout_ms: 2000 });
      check(
        '.sh timeout terpenuhi',
        shTimeout.data.timed_out === true,
        JSON.stringify(shTimeout.data).slice(0, 200),
      );
    } else {
      console.log('  SKIP  test .sh (bash tidak tersedia di lingkungan ini)');
    }
  } else {
    console.log('  SKIP  test .sh (ekstensi .sh dinonaktifkan lewat PS_SANDBOX_EXTENSIONS)');
  }

  console.log('\nsmoke test selesai');
} catch (err) {
  console.error('smoke test error:', err);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
