# Scripts

Folder ini berisi script yang mendukung skill continuous-learning.

## Daftar Script

| Script | Deskripsi | Usage |
|---|---|---|
| `evaluate-session.sh` | Mengevaluasi sesi AI agent di akhir sesi untuk mengekstrak pola yang dapat digunakan kembali dan menyimpannya sebagai learned skills | `bash evaluate-session.sh [--session-file <path>] [--config <path>] [--dry-run]` |

## Prasyarat

- `bash` (Linux/macOS) atau Git Bash (Windows)
- `python3` (untuk membaca config.json)
- `grep` (untuk deteksi pola)

## Cara Kerja

1. Membaca `config.json` untuk konfigurasi (min_session_length, learned_skills_path, auto_approve)
2. Membaca session transcript dari file atau stdin
3. Menghitung jumlah pesan dalam sesi
4. Jika jumlah pesan >= `min_session_length`, lanjut ke deteksi pola
5. Mendeteksi pola: `error_resolution`, `user_corrections`, `workarounds`, `debugging_techniques`, `project_specific`
6. Menyimpan learned skills ke `learned_skills_path` (default: `~/.cline/skills/learned/`)