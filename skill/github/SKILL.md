---
name: github
description: >
  GLOBAL RULE — This skill is ALWAYS active and MUST be applied automatically for ANY git or GitHub operation without needing to be mentioned or explicitly requested. Use this skill whenever the user runs, asks for, or mentions any git command (git add, git commit, git push, git pull, git branch, git checkout, git status, git log, etc.) or any GitHub operation (repositories, issues, pull requests, branches, workflows/Actions, releases, and other GitHub features). The commit message format and branch naming conventions defined in this skill are MANDATORY for every git operation — always check and apply them, even if the user doesn't mention "GitHub" or "commit rules".
license: PT. Prudential Life Indonesia
metadata:
  author: Nurvan Afandi - https://github.com/Nurvan-Afandi1-Consultant_pru/skills
---

# GitHub Commands & Operations

Skill ini menyediakan panduan dan perintah (commands) untuk melakukan operasi GitHub, termasuk repository management, issues, pull requests, branches, GitHub Actions, releases, dan lain sebagainya.

> **Penting:** Skill ini adalah **GLOBAL RULE** — otomatis berlaku untuk **semua operasi git/GitHub** tanpa perlu di-mention atau diminta secara eksplisit oleh user.

> **Penting:** Setiap commit WAJIB mengikuti aturan format commit message yang dijelaskan pada [Critical Rules](#critical-rules) di bawah ini.

## Critical Rules

### 1. Format Commit Message

Setiap **commit message** WAJIB mengikuti format berikut:

```
[PLAIPRO-XXXXX] {type}: {commit message}
```

Di mana:
- `XXXXX` adalah **number** (angka) dari Jira ticket.
- `{type}` adalah **commit type** yang menjelaskan jenis perubahan.

#### Commit Type

| Type | Description |
|---|---|
| `feat` | A new feature is introduced with the changes |
| `fix` | A bug fix has occurred |
| `chore` | Changes that do not relate to a fix or feature and don't modify src or test files (for example updating dependencies) |
| `refactor` | Refactored code that neither fixes a bug nor adds a feature |
| `docs` | Updates to documentation such as a the README or other markdown files |
| `style` | Changes that do not affect the meaning of the code, likely related to code formatting such as white-space, missing semi colons, and so on |
| `test` | Including new or correcting previous tests |
| `perf` | Performance improvements |
| `ci` | Continuous integration related |
| `build` | Changes that affect the build system or external dependencies |
| `revert` | Reverts a previous commit |

Contoh:
- Branch: `PLAI-PRO1234` → Commit: `[PLAIPRO-1234] feat: add new api for validation agent`
- Branch: `feature/PLAIPRO-5678` → Commit: `[PLAIPRO-5678] fix: Fix bug preventing users from submitting the subscribe form`
- Branch: `PLAI-PRO9999` → Commit: `[PLAIPRO-9999] chore: update npm dependency to latest version`

#### Validasi Branch Name

Sebelum melakukan commit, pastikan branch name saat ini **diawali dengan prefix `PLAI-PRO` atau `feature/PLAIPRO-`**:

- ✅ **Valid**: `PLAI-PRO1234`, `PLAI-PRO5678`, `PLAI-PRO9999-feature-login`, `feature/PLAIPRO-1234`, `feature/PLAIPRO-5678`
- ❌ **Invalid**: `main`, `develop`, `feature/login`, `bugfix/payment`, `release/1.0.0`, dll.

#### Alur Kerja (Workflow) Commit

1. Cek branch name saat ini:
   ```bash
   git branch --show-current
   ```
2. **Validasi**: Apakah branch name diawali dengan `PLAI-PRO` atau `feature/PLAIPRO-`?
   - **Ya** → Lanjut ke langkah 3.
   - **Tidak** → **TANYAKAN ke user**:
     > "Branch `{branch-name}` tidak diawali dengan `PLAI-PRO` atau `feature/PLAIPRO-`."
   - Jika user tidak yakin / tidak mengonfirmasi → **JANGAN lanjutkan commit**.
3. Buat commit dengan format:
   ```bash
   git commit -m "[{ticket-id}] {type}: {commit message}"
   ```
   Contoh:
   ```bash
   git commit -m "[PLAIPRO-35563] docs: update github skill as global rule"
   ```

## Scope: Global Rule

**Skill ini bersifat GLOBAL dan always-on.** Artinya:

- Setiap kali user menjalankan **git command** (apa pun) atau meminta **GitHub operation**, ikuti aturan kritis di atas secara otomatis.
- Anda **TIDAK perlu** diminta untuk "menggunakan skill github" atau "mengikuti aturan commit" — aturan ini sudah wajib secara otomatis.
- Biasakan **selalu cek** `git branch --show-current` + validasi format commit **sebelum** `git commit`.
- Jika user berada di branch yang tidak valid dan meminta commit:
  - Tanyakan apakah user ingin membuat branch baru yang valid atau melanjutkan di branch ini.
  - Jika user tidak mengonfirmasi, JANGAN commit.

## Available Commands

### Git Commands (Commit & Branch)

| Command | Description |
|---|---|
| `git branch --show-current` | Menampilkan branch name saat ini (wajib dicek sebelum commit) |
| `git branch` | Menampilkan daftar branch lokal |
| `git branch -a` | Menampilkan daftar semua branch (lokal + remote) |
| `git checkout -b PLAI-PROXXXX-description` | Membuat branch baru dari Jira ticket |
| `git checkout -b feature/PLAIPRO-XXXXX-description` | Membuat branch fitur baru dari Jira ticket (XXXXX = number) |
| `git switch PLAI-PROXXXX-description` | Pindah ke branch tertentu |
| `git switch feature/PLAIPRO-XXXXX-description` | Pindah ke branch fitur tertentu (XXXXX = number) |
| `git commit -m "[PLAIPRO-XXXXX] {type}: {commit message}"` | Commit dengan format wajib: [PLAIPRO-XXXXX] + commit type + commit message |
| `git status` | Menampilkan status working tree |
| `git add <files>` | Stage file sebelum commit |
| `git push` | Push commit ke remote |
| `git push -u origin {branch-name}` | Push branch baru ke remote dan set upstream |
| `git pull` | Pull perubahan dari remote |
| `git log --oneline` | Menampilkan riwayat commit ringkas |

### GitHub CLI Commands (gh)

| Command | Description |
|---|---|
| `gh repo view` | Melihat detail repository |
| `gh repo create` | Membuat repository baru |
| `gh pr create` | Membuat pull request baru |
| `gh pr list` | Menampilkan daftar pull request |
| `gh pr checkout {pr-number}` | Checkout pull request secara lokal |
| `gh issue create` | Membuat issue baru |
| `gh issue list` | Menampilkan daftar issue |
| `gh workflow run {workflow-name}` | Menjalankan GitHub Actions workflow |
| `gh release create {tag}` | Membuat release baru |
| `gh auth status` | Mengecek status autentikasi GitHub CLI |

## Reference Files

| Reference | Use during |
|---|---|
| <!-- Tambahkan referensi di sini --> |  |

## Available Scripts

| Script | Purpose | Usage |
|---|---|---|
| <!-- Tambahkan script di sini --> |  |  |

## Review Checklist

- [ ] Branch name saat ini dicek dengan `git branch --show-current`
- [ ] Branch name diawali dengan prefix `PLAI-PRO` atau `feature/PLAIPRO-`
- [ ] Jika branch name tidak diawali `PLAI-PRO` atau `feature/PLAIPRO-`, user sudah dikonfirmasi terlebih dahulu
- [ ] Commit message mengikuti format `[PLAIPRO-XXXXX] {type}: {commit message}`
- [ ] Commit type menggunakan salah satu dari: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`, `ci`, `build`, `revert`
- [ ] Commit message ditulis dalam bahasa yang jelas dan deskriptif

## Severity Levels

| Severity | Meaning | Action |
|---|---|---|
| **HIGH** | Commit message tidak mengikuti format commit, commit type tidak valid, atau commit dilakukan pada branch yang tidak valid tanpa konfirmasi | Blocking — tolak commit |
| **MED** | Branch name tidak valid dan user belum dikonfirmasi | Non-blocking — tanyakan konfirmasi user terlebih dahulu |
| **LOW** | Commit message kurang deskriptif atau tidak jelas | Advisory — sarankan perbaikan |
| **INFO** | Saran untuk meningkatkan kualitas commit message (misalnya menggunakan imperative mood) | Informational |
</｜DSML｜>
<task_progress>
- [x] Analyze github skill and global rule requirements
- [ ] Update github/SKILL.md with global rule scope
- [ ] Create .clinerules/global-rules file
- [ ] Commit and push changes
</task_progress>
</write_to_file>