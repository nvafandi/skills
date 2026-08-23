# MCP Config Backup

Snapshot konfigurasi MCP server OpenCode. Sumber sebenarnya tetap di mesin lokal — folder ini hanya backup yang versioned.

## File

| File | Asal | Catatan |
|---|---|---|
| `opencode.jsonc` | `~/.config/opencode/opencode.jsonc` (blok `mcp` saja) | Blok `provider` tidak disertakan karena berisi API keys |
| `postgres-mcp-config.json` | `~/.config/opencode/postgres-mcp-config.json` | **Password di-redact** (`<REDACTED>`) |

## Server Terdaftar

| Nama | Type | Fungsi |
|---|---|---|
| `context7` | remote | Dokumentasi library/framework terkini |
| `filesystem` | local | Akses filesystem `/home/nurvan` |
| `sequential-thinking` | local | Problem solving bertahap |
| `memory` | local | Knowledge graph memori sesi |
| `postgres` | local | Introspection & monitoring PostgreSQL (multi-DB: aob, newods, nbwf) |
| `graphify` | local | Query knowledge graph kode (`query_graph`, `shortest_path`, dll.) — menunjuk ke `~/.config/opencode/graph.json` |

## Restore

1. **opencode.jsonc** → merge blok `"mcp"` ke `~/.config/opencode/opencode.jsonc`, lalu restart OpenCode.
2. **postgres-mcp-config.json** → salin ke `~/.config/opencode/postgres-mcp-config.json` dan isi ulang password asli (tidak pernah disimpan di repo ini).
3. **context7** membutuhkan env `CONTEXT7_API_KEY`.
4. **graphify** membutuhkan instalasi CLI: `uv tool install "graphifyy[mcp]"` dan graph sudah dibangun (`graphify extract . --code-only`).

## Keamanan

- Jangan pernah menghapus redaksi `<REDACTED>` di file repo ini.
- Kredensial asli hanya hidup di `~/.config/opencode/` (lokal).
