// Verifikasi command MCP yang terdaftar di config OpenCode: handshake + 1 run script.
//
//   node test/config-check.mjs "C:/Users/irvan/.config/opencode/opencode.json"
import fs from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

if (!process.argv[2]) {
  console.error('usage: node test/config-check.mjs <path-to-opencode.json>');
  process.exit(2);
}

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const entry = cfg.mcp.servers['powershell-sandbox'];
const [command, ...args] = entry.command;
console.log('command:', command);
console.log('args   :', args.join(' '));

const transport = new StdioClientTransport({ command, args, stderr: 'inherit' });
const client = new Client({ name: 'config-check', version: '1.0.0' });
const t0 = Date.now();

await client.connect(transport);
const tools = await client.listTools();
console.log(`handshake ok dalam ${Date.now() - t0}ms, tools=${tools.tools.length}`);

const info = JSON.parse((await client.callTool({ name: 'sandbox_info' })).content[0].text);
console.log('runtime :', JSON.stringify(info.runtime));
console.log('root    :', info.root, '| host_root:', info.host_root);
console.log('pwsh    :', info.powershell.version);

const run = JSON.parse(
  (await client.callTool({
    name: 'run_code',
    arguments: {
      code: [
        'Write-Output "hostname=$(hostname)"',
        'Write-Output "os=$($PSVersionTable.OS) pwsh=$($PSVersionTable.PSVersion)"',
        'Write-Output "in_container=$(Test-Path /run/.containerenv)"',
        'Write-Output "user=$(id -un) uid=$(id -u)"',
        'Write-Output "root_fs=$(Test-Path /proc/1/cmdline)"',
        'Set-Content -Path out.txt -Value "artifact dari container"',
        'Write-Output "cwd=$PWD"',
      ].join('\n'),
      timeout_ms: 30000,
    },
  })).content[0].text,
);
console.log('exit    :', run.exit_code, '| durasi:', run.duration_ms + 'ms');
console.log(run.stdout.trim());
console.log('cwd(host):', run.cwd);

await client.close();
console.log('\nOK');