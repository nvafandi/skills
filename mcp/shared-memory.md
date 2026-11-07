# shared-memory — Remote MCP Memory Service

Shared semantic memory (SQLite-vec + knowledge graph) yang di-host di
InstaBox dan di-expose lewat Cloudflare Tunnel. Bisa dipakai dari device
mana pun tanpa install server lokal.

## Endpoint

| Item | Nilai |
|---|---|
| URL | `https://mcp-memory.nurvan.my.id/mcp` |
| Transport | Streamable HTTP (MCP 2025-03-26) |
| Auth | `Authorization: Bearer mcp-memory-secret-2026` |
| Backend | SQLite-vec (`all-MiniLM-L6-v2` embeddings) |
| Versi server | `mcp-memory-service` 12.7.0 / MCP 1.30.0 |

## Prasyarat (device client)

- Akses internet ke `mcp-memory.nurvan.my.id` (Cloudflare proxied).
- MCP client yang mendukung transport `streamable-http` (OpenCode, Claude
  Code, Cursor, Hermes, dll.).
- Token Bearer di atas (shared global — lihat bagian keamanan).

Tidak perlu install Python/Node/DB di device client; semua ada di server.

## Instalasi per client

### OpenCode (`~/.config/opencode/opencode.json`)

Merge blok berikut ke `mcp.servers` (atau `mcpServers` tergantung schema):

```json
"shared-memory": {
  "type": "remote",
  "url": "https://mcp-memory.nurvan.my.id/mcp",
  "headers": {
    "Authorization": "Bearer mcp-memory-secret-2026"
  }
}
```

Restart OpenCode setelah edit.

### Claude Code / Claude Desktop (`~/.claude.json` atau `claude_desktop_config.json`)

```json
"mcpServers": {
  "shared-memory": {
    "type": "streamable-http",
    "url": "https://mcp-memory.nurvan.my.id/mcp",
    "headers": {
      "Authorization": "Bearer mcp-memory-secret-2026"
    }
  }
}
```

### Cline (VS Code) — `cline_mcp_settings.json`

Lokasi file (Windows): `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "shared-memory": {
      "url": "https://mcp-memory.nurvan.my.id/mcp",
      "headers": {
        "Authorization": "Bearer mcp-memory-secret-2026"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Catatan Cline: transport streamable-http didukung; jika Cline versi lama hanya
sse/stdio, gunakan wrapper `mcp-remote` (lihat bagian fallback di bawah).

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "shared-memory": {
      "url": "https://mcp-memory.nurvan.my.id/mcp",
      "headers": {
        "Authorization": "Bearer mcp-memory-secret-2026"
      }
    }
  }
}
```

### Hermes (`~/.hermes/config.yaml` → `mcp_servers`)

```yaml
mcp_servers:
  shared-memory:
    url: https://mcp-memory.nurvan.my.id/mcp
    headers:
      Authorization: "Bearer mcp-memory-secret-2026"
```

## Fallback: client yang hanya mendukung stdio

Untuk client lama yang belum mendukung streamable-http (mis. Cline versi
lama, atau tool yang hanya bicara stdio), gunakan wrapper `mcp-remote`:

```json
{
  "mcpServers": {
    "shared-memory": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp-memory.nurvan.my.id/mcp",
        "--header",
        "Authorization: Bearer mcp-memory-secret-2026"
      ]
    }
  }
}
```

Prasyarat: Node.js + npx tersedia di device client. Wrapper ini men-bridge
stdio ↔ streamable-http.

## Verifikasi

### 1. Handshake (curl)

```bash
curl -s -m 30 \
  -H "Authorization: Bearer mcp-memory-secret-2026" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  https://mcp-memory.nurvan.my.id/mcp
```

Harapan: `event: message` + JSON dengan `serverInfo.name = "memory"` dan
`protocolVersion = "2025-03-26"`. Tanpa token → `401`.

### 2. Health check (via MCP tool)

Panggil tool `memory_health`. Harapan: `status: healthy`, backend
`sqlite-vec`, `total_memories` ≥ 0.

### 3. Smoke test store + search

- `memory_store` dengan content + tags.
- `memory_search` semantic dengan query terkait → harus menemukan memory
  yang baru disimpan.
- `memory_list` untuk konfirmasi pagination.

## Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `401 Unauthorized` | Token salah/kosong | Cek header `Authorization: Bearer mcp-memory-secret-2026` |
| `404 Not Found` | DNS/tunnel belum propagate atau ingress remote config belum include mcp-memory | Tunggu 1-2 menit; cek `https://mcp-memory.nurvan.my.id/health` |
| `530` / `1033` | VM InstaBox idle-paused | Request ke endpoint membangunkan VM (~30s). Coba ulang. Lihat wake strategy di `9router` notes. |
| Handshake timeout | Cold start embedding model | Naikkan timeout client ke 60s |
| `Parse error` di body | JSON malformed (escape quotes) | Pakai file `--data-binary @file.json` |

## Tools yang tersedia (ringkas)

- Simpan: `memory_store`, `memory_store_session`
- Cari: `memory_search` (semantic/exact/hybrid/ranked), `memory_list`
- Kelola: `memory_update`, `memory_delete`, `memory_cleanup`
- Kualitas: `memory_quality`, `memory_health`, `memory_stats`
- Konsolidasi: `memory_consolidate`, `memory_distill`
- Graf: `memory_graph`, `memory_explore`, `memory_detail`
- Konflik: `memory_conflicts`, `memory_resolve`
- Mistake notes: `mistake_note_add/search/update/delete`
- Sesi: `commit_session_legacy`, `get_bootstrap_profile`, `get_onboarding_guide`
- Quarantine: `get_quarantined_memories`, `unquarantine_memory`

Lihat schema lengkap via `tools/list` pada endpoint.

## Keamanan

- **Token tunggal global** (`MCP_API_KEY=mcp-memory-secret-2026`) dibagi semua
  client. Siapa pun yang punya token bisa baca/tulis/hapus semua memory.
- Jangan commit token ke repo publik; simpan di config lokal device.
- Rotasi token: edit `Environment=MCP_API_KEY=...` di
  `/data/home/.config/systemd/user/mcp-memory.service` (InstaBox), lalu
  `systemctl --user daemon-reload && systemctl --user restart mcp-memory`,
  dan update semua client config.
- Data disimpan di disk sandbox InstaBox (`sqlite_vec.db`); backup folder
  `.../mcp-memory/backups` + snapshot InstaBox tersedia.
- Port `8765` juga di-publish via `instabox-port` (public, no token) —
  jangan expose data sensitif lewat path itu; akses publik tetap lewat
  Cloudflare + Bearer token.

## Server-side (InstaBox) — referensi

- Service unit: `/data/home/.config/systemd/user/mcp-memory.service`
- DB: `/data/home/.local/share/mcp-memory/sqlite_vec.db`
- Tunnel ingress (remote config Cloudflare): `mcp-memory.nurvan.my.id → http://localhost:8765`
- DNS: CNAME `mcp-memory.nurvan.my.id → 57feb496-…cfargotunnel.com` (proxied)
- Restart service: `systemctl --user restart mcp-memory`
- Cek status: `systemctl --user status mcp-memory` / `memory info`

## Catatan migrasi dari `memory` (local knowledge graph)

Jika device lama memakai `@modelcontextprotocol/server-memory` (knowledge
graph entities/relations/observations), data-nya berbeda format dengan
shared-memory (semantic vector store). Migrasi manual: baca graph lama via
`read_graph`, lalu `memory_store` tiap entity/observation dengan tags sesuai.
Pada mesin referensi, graph lama **kosong**, jadi migrasi = no-op.