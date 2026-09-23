---
name: continuous-learning
description: >
  Extract reusable patterns from completed AI agent sessions and save them as learned skills. Use when the user asks to evaluate a session, enable continuous learning, extract patterns, or create learned skills from session history. Also use when a user shares a password, API key, or other credential in chat — trigger the Security Monitor to warn and block storage of the secret. Agent-agnostic (opencode, Cline, Claude Code, Codex, Gemini CLI).
license: PT. Prudential Life Indonesia
metadata:
  author: Adapted from WorldFlowAI/everything-claude-code - https://github.com/WorldFlowAI/everything-claude-code
---

# Continuous Learning Skill

Automatically evaluates AI agent sessions at the end to extract reusable patterns that can be saved as learned skills.

## How It Works

This skill runs as a **Stop hook** (or equivalent session-end trigger) at the end of each session:

1. **Session Evaluation**: Checks if session has enough messages (default: 10+)
2. **Pattern Detection**: Identifies extractable patterns from the session
3. **Skill Extraction**: Saves useful patterns to the learned skills directory

## Security Monitor (AUTO-ACTIVATE)

**This skill AUTO-ACTIVATES when a user shares credentials in chat.** Agents MUST trigger this immediately — do NOT wait for session end.

### Detection Patterns (Scan Every User Message)

| Pattern | Regex Example | Action |
|---------|---------------|--------|
| Sudo password | `sudo password = *`, `password=*`, `pass=*` | WARN + BLOCK |
| API keys | `api_key=*`, `API_KEY=*`, `token=*` | WARN + BLOCK |
| Database credentials | `db_pass=*`, `mysql -u* -p*` | WARN + BLOCK |
| SSH keys/content | `-----BEGIN RSA PRIVATE KEY-----` | WARN + BLOCK |
| Generic secrets | Any `password`, `secret`, `credential` in plaintext | WARN + BLOCK |

### Auto-Activate Protocol

When a password/credential is detected in a user message:

```
1. STOP processing immediately
2. WARN user:
   "⚠️ SECURITY: You just shared a password/credential in chat.
    This is a security risk. I will NOT store this in any logs or skills.
    Please change this password after the session."
3. DO NOT include the actual password in any output, logs, or learned skills
4. If using sudo -S, pipe via stdin only: echo "password" | sudo -S command
5. RECOMMEND: passwd (change password after session)
6. LOG the violation type (not the password) for session evaluation
```

### What Gets Logged (WITHOUT the password)

```json
{
  "type": "security_violation",
  "subtype": "password_shared_in_chat",
  "timestamp": "ISO-8601",
  "action_taken": "warned_and_blocked",
  "password_stored": false
}
```

## Agent-Agnostic Design

This skill is designed to work with **any AI coding agent**, not just Claude Code:

| Agent | Session-End Mechanism | Learned Skills Path |
|-------|----------------------|---------------------|
| **Cline** | Task completion / `attempt_completion` | `~/.cline/skills/learned/` |
| **Claude Code** | Stop hook | `~/.claude/skills/learned/` |
| **Codex** | Session end callback | `~/.codex/skills/learned/` |
| **Gemini CLI** | Session end hook | `~/.gemini/skills/learned/` |
| **Generic** | Manual invocation | Configurable via `config.json` |

The skill reads its configuration from `config.json` and adapts the output paths automatically.

## Configuration

Edit `config.json` to customize:

```json
{
  "min_session_length": 10,
  "extraction_threshold": "medium",
  "auto_approve": false,
  "learned_skills_path": "~/.cline/skills/learned/",
  "patterns_to_detect": [
    "error_resolution",
    "user_corrections",
    "workarounds",
    "debugging_techniques",
    "project_specific"
  ],
  "ignore_patterns": [
    "simple_typos",
    "one_time_fixes",
    "external_api_issues"
  ]
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `min_session_length` | `10` | Minimum number of messages before a session is evaluated |
| `extraction_threshold` | `medium` | `low`, `medium`, or `high` — how aggressively to extract patterns |
| `auto_approve` | `false` | If `true`, saves learned skills without asking the user |
| `learned_skills_path` | `~/.cline/skills/learned/` | Where learned skills are saved |
| `patterns_to_detect` | See above | Pattern types to look for in sessions |
| `ignore_patterns` | See above | Pattern types to skip |

## Pattern Types

| Pattern | Description | Auto-Activate? |
|---------|-------------|----------------|
| `error_resolution` | How specific errors were resolved | No |
| `user_corrections` | Patterns from user corrections | No |
| `workarounds` | Solutions to framework/library quirks | No |
| `debugging_techniques` | Effective debugging approaches | No |
| `project_specific` | Project-specific conventions | No |
| `security_violations` | Security issues like password sharing/storage | **YES — IMMEDIATE** |

## Security Rules (CRITICAL)

**NEVER store, log, or save sudo passwords or any credentials in:**

- Learned skills
- Session transcripts
- Configuration files
- Log files
- Any persistent storage

**When a user shares a password in chat:**
1. Warn the user immediately about the security risk
2. Do NOT include the password in any saved patterns
3. Recommend the user change the password after the session
4. If using `sudo -S`, pipe the password via stdin and do not persist it

**Password handling pattern:**
```bash
# CORRECT: Pipe password via stdin (ephemeral)
echo "password" | sudo -S command

# NEVER: Save password to file or variable
echo "password" > /tmp/pass.txt  # NEVER DO THIS
export SUDO_PASS="password"       # NEVER DO THIS
```

## Setup for Cline

### Option 1: Manual Invocation (Recommended)

The skill is available as a regular Cline skill. When the user asks to evaluate a session or extract patterns, follow the instructions in this skill.

### Option 2: Automatic Evaluation

To run automatically at the end of each session, add a hook to your Cline settings. Cline supports custom instructions and rules. Add the following to your Cline settings or `.clinerules/`:

```json
{
  "hooks": {
    "Stop": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.cline/skills/continuous-learning/scripts/evaluate-session.sh"
      }]
    }]
  }
}
```

> **Note:** Hook support varies by agent. If your agent does not support hooks, use manual invocation instead.

## Setup for Other Agents

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/skills/continuous-learning/scripts/evaluate-session.sh"
      }]
    }]
  }
}
```

### Codex

Add to `~/.codex/config.toml` or equivalent:

```toml
[session_end]
command = "~/.codex/skills/continuous-learning/scripts/evaluate-session.sh"
```

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "hooks": {
    "session_end": {
      "command": "~/.gemini/skills/continuous-learning/scripts/evaluate-session.sh"
    }
  }
}
```

## Why Session-End Hook?

- **Lightweight**: Runs once at session end
- **Non-blocking**: Doesn't add latency to every message
- **Complete context**: Has access to full session transcript

## Evaluation Process

When this skill is triggered (manually or via hook), follow these steps:

### Step 1: Session Evaluation

1. Check if the session has at least `min_session_length` messages (default: 10)
2. If not, skip evaluation and report: `Session too short for pattern extraction`
3. If yes, proceed to pattern detection

### Step 2: Pattern Detection

Review the session transcript for each pattern type in `patterns_to_detect`:

| Pattern | What to look for |
|---------|-----------------|
| `error_resolution` | Errors encountered and how they were fixed |
| `user_corrections` | Times the user corrected the agent's approach |
| `workarounds` | Solutions to framework/library quirks or bugs |
| `debugging_techniques` | Effective debugging strategies used |
| `project_specific` | Conventions, structure, or rules specific to the project |
| `security_violations` | Password sharing, credential storage, insecure practices |

For each detected pattern, evaluate:
- **Reusability**: Will this pattern be useful in future sessions?
- **Specificity**: Is it specific enough to be actionable?
- **Generality**: Does it apply beyond this one session?

### Step 3: Skill Extraction

For each pattern that passes the threshold:

1. Create a new skill directory in `learned_skills_path`
2. Name it descriptively (e.g., `fix-maven-dependency-conflicts`)
3. Write a `SKILL.md` with:
   - `name`: The skill name
   - `description`: When to use this skill
   - `body`: The reusable pattern, steps, or knowledge

### Step 4: Ignore Patterns

Skip patterns that match `ignore_patterns`:
- `simple_typos` — One-off typo fixes
- `one_time_fixes` — Fixes that won't recur
- `external_api_issues` — Issues caused by external services

## Learned Skill Template

Each learned skill should follow this template:

```markdown
---
name: {skill-name}
description: {when to use this skill}
---

# {Skill Title}

## Problem

{What problem does this solve?}

## Solution

{How was it solved?}

## Steps

1. {Step 1}
2. {Step 2}
3. {Step 3}

## Example

{Concrete example from the session}

## Source

- Session: {date or session ID}
- Project: {project name}
```

## Review Checklist

- [ ] Session has at least `min_session_length` messages
- [ ] All patterns in `patterns_to_detect` were checked
- [ ] Patterns in `ignore_patterns` were skipped
- [ ] **Security violations are NEVER ignored or saved**
- [ ] Each extracted pattern is reusable, specific, and general
- [ ] Learned skills follow the template structure
- [ ] Learned skills are saved to `learned_skills_path`
- [ ] User was asked for approval if `auto_approve` is `false`
- [ ] No passwords or credentials are stored in any output

## Severity Levels

| Severity | Meaning | Action |
|----------|---------|--------|
| **HIGH** | Session contains critical reusable patterns that were missed | Blocking — re-evaluate the session |
| **MED** | Pattern extraction threshold not met for some patterns | Non-blocking — note and continue |
| **LOW** | Session too short or no patterns detected | Advisory — skip extraction |
| **INFO** | Suggestions for improving pattern detection | Informational |

## Related

- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - Section on continuous learning
- `/learn` command - Manual pattern extraction mid-session