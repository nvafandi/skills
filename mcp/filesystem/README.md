# filesystem (MCP)

Server MCP resmi untuk akses filesystem, dipakai OpenCode agar agent bisa
membaca/menulis file dalam folder yang diizinkan.

## Isi folder ini

Hanya manifest paket — `node_modules` sengaja tidak di-copy (23 MB, bisa
dibangun ulang):

| File | Isi |
|---|---|
| `package.json` | dependency: `@modelcontextprotocol/server-filesystem` |
| `package-lock.json` | lock versi persis |

## Install

```powershell
cd C:\Users\irvan\Documents\project\skills\mcp\filesystem
npm install
```

## Jalankan / daftarkan di OpenCode

Entry yang aktif di config lokal:

```jsonc
"filesystem": {
  "type": "local",
  "command": [
    "C:/Program Files/nodejs/node.exe",
    "C:/Users/irvan/AppData/Local/mcp-servers/filesystem/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js",
    "C:/Users/irvan"
  ]
}
```

Kalau mau pakai salinan di repo ini (setelah `npm install`):

```jsonc
"filesystem": {
  "type": "local",
  "command": [
    "C:/Program Files/nodejs/node.exe",
    "C:/Users/irvan/Documents/project/skills/mcp/filesystem/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js",
    "C:/Users/irvan"
  ]
}
```

Argumen terakhir = folder yang boleh diakses. Server menolak path di luar
folder tersebut.

## Cek cepat

```powershell
& "C:\Program Files\nodejs\node.exe" node_modules/@modelcontextprotocol/server-filesystem/dist/index.js C:/Users/irvan
```

Server akan الاتصال di stdio dan menunggu JSON-RPC; tekan `Ctrl+C` untuk berhenti.