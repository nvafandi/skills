# android-mcp (MCP)

Server MCP untuk mengoperasikan perangkat Android lewat ADB —等同 dengan
"agent memakai HP sebagai user".

Source tidak ada di disk — ini paket PyPI yang dijalankan sekali jalan oleh
`uvx`, jadi folder ini berisi **dokumentasi + run script** saja.

## Command yang dipakai di config project

```jsonc
"android-mcp": {
  "type": "local",
  "command": ["uvx", "--python", "3.13", "android-mcp"]
}
```

`--python 3.13` memaksa interpreter; `--from` tidak dipakai karena `uvx`
mengambil paket dengan nama yang sama dengan command-nya.

## Prasyarat

1. **ADB + perangkat terdeteksi**

   ```powershell
   adb devices -l
   ```

   Kalau `adb` tidak ada, install Android platform-tools dan pastikan
   `platform-tools\adb.exe` ada di PATH.

2. **USB debugging aktif** di perangkat, dan sudah authorize (muncul prompt di HP).

## Jalankan manual

```powershell
pwsh -File C:\Users\irvan\Documents\project\skills\mcp\android-mcp\run.ps1
```

## Tool

| Tool | Fungsi |
|---|---|
| `ConnectDevice` | Hubungkan ke perangkat berdasarkan serial number |
| `ListDevices` | Daftar perangkat yang terlihat |
| `Notification` | Baca notifikasi yang terlihat di perangkat |
| `Press` | Tekan tombol (`home`, `back`, `power`, dll) |
| `Wait` | Tunggu selama N detik |

Alur pakai: `ListDevices` → `ConnectDevice` → operasi → `Wait` untuk memberi
waktu UI merespons.

## Troubleshooting

- `no devices/emulators found` → `adb devices` kosong; cek kabel, mode USB,
  dan driver's OEM.
- Server butuh `-X utf8` supaya output non-ASCII tidak rusak — kalau setting
  manual, tambahkan flag tersebut.