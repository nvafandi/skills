# GLOBAL RULE: Continuous Learning

**Always apply the continuous-learning skill rules automatically at the end of EVERY task - no mention needed.**

1. When a task is marked as complete (attempt_completion), automatically evaluate the session for reusable patterns.
2. Use the continuous-learning skill to check if the session has at least 10 messages (min_session_length).
3. Detect patterns from the following types:
   - error_resolution
   - user_corrections
   - workarounds
   - debugging_techniques
   - project_specific
4. For each detected pattern, evaluate:
   - Reusability: Will this pattern be useful in future sessions?
   - Specificity: Is it specific enough to be actionable?
   - Generality: Does it apply beyond this one session?
5. Save useful patterns as learned skills to `~/.cline/skills/learned/`.
6. Skip patterns that match ignore_patterns: simple_typos, one_time_fixes, external_api_issues.
7. For each extracted pattern, create a SKILL.md following the learned skill template:
   - name: descriptive skill name
   - description: when to use this skill
   - body: the reusable pattern, steps, or knowledge

Full rules: continuous-learning/SKILL.md