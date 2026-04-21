# Agent Operational Rules & Zero Token Leak Policy

---

## CLI Toolchain Reference (`a-mem`)

All tools are accessed via the unified CLI from the **project root**. PowerShell requires the `.\` prefix.

**Setup Commands:**
| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `.\a-mem init` | Interactive wizard — populates all 5 Memory files | **First time only** |

**Session Commands:**
| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `.\a-mem new "title"` | Creates `session-N.md`, increments counter, auto-syncs index | **Start of every task** |
| `.\a-mem close [N]` | Verifies checklist, closes session, auto-syncs index | **End of every task** |
| `.\a-mem sync` | Rebuilds `decision-index.md` from all real session logs | **After manual edits to logs** |

**Search Commands:**
| Command | What It Does |
|---------|-------------|
| `.\a-mem find "term"` | Search ALL `.Aayan-Mem` files |
| `.\a-mem find "term" --in memory` | Search only `Memory-&-Context/` files |
| `.\a-mem find "term" --in decisions` | Search only `decision-logs/` |
| `.\a-mem find "term" --in stack` | Search only `Stack.md` |
| `.\a-mem find "term" --in ui` | Search only `Design-Guidelines.md` |
| `.\a-mem find "term" --in rules` | Search only `rules.md` files |
| `.\a-mem find "term" --in agent` | Search only `Agent/` level files |

**Diagnostic Commands:**
| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `.\a-mem coldstart` | 5-line briefing + stale check + next steps | **Every new session (Rule 1)** |
| `.\a-mem validate` | Contradiction + duplicate key scan | **After any Memory update (Rule 2)** |
| `.\a-mem verify` | Check if Memory paths exist on disk | **Before importing from Memory (Rule 5)** |
| `.\a-mem status` | Full health dashboard (all checks) | When you need a complete overview |

**Navigation Commands:**
| Command | What It Does |
|---------|-------------|
| `.\a-mem list` | List all Memory, Agent, and Decision files with sizes |
| `.\a-mem log` | Show decision timeline (date, status, confidence, chosen path) |
| `.\a-mem` | Launch **interactive shell** — type commands directly |
| `.\a-mem help` | Show all commands with examples |

> **Aliases:** `search` = `find`, `ls` = `list`, `timeline` = `log`, `cold` = `coldstart`, `q` = `exit`
> **Multi-term search:** Use `|` inside quotes: `.\a-mem find "auth|supabase"` (use `node a-mem.js` if pipe causes issues in PowerShell)


> **Note:** You can also call tools directly via `node .Aayan-Mem/Agent/tools/<script>.js` if needed.

---

## Operational Rules

**1. THE COLD START:** On every new session, run `.\a-mem coldstart`. Use `.\a-mem coldstart "topic"` for topic-filtered briefing. This gives you belief state, active rejections, stale warnings, and next steps.

**2. CONTRADICTION CHECK:** Run `.\a-mem validate` after any update to Memory-&-Context files. Validates Witness Protocol, dependency cascades, and structural contradictions.

**3. TASK COMPLEXITY TIERS (Simulation Matrix):**
* **Tier 1 (Trivial):** Single-file edits, CSS, text. -> *ACTION: Skip simulation. Execute immediately.*
* **Tier 2 (Feature):** Multi-file edits within one domain. -> *ACTION: Log chosen path + 1 sentence reasoning.*
* **Tier 3 (Architecture):** Cross-system (DB/API/UI). -> *ACTION: Full 3-path simulation + Comparison Matrix required.*

**4. SESSION MANAGEMENT:** Run `.\a-mem new "title"` to create a session log automatically — it increments the counter, fills in the date, and auto-syncs the decision index. Run `.\a-mem close [N]` when done — it enforces the verification checklist and blocks closure if items are unchecked. The `decision-index.md` is **auto-generated** — never edit it by hand.

**5. HALLUCINATION GUARD:** Before importing or referencing ANY file path mentioned in Memory, run `.\a-mem verify` to confirm the file exists on disk. Memory documents *intentions* — not guaranteed reality.

**6. PROOF-OF-READ:** After running `.\a-mem coldstart`, you must echo back 3 key facts from the briefing in your first response. If you cannot recall them, re-read. This proves comprehension, not just execution.

**7. PRE-COMMIT CHECKLIST:** A session CANNOT be marked `## SESSION X OVER ##` until the `Post-Implementation Verification` section of the log is filled. You must record: what was tested, what passed, and what failed. No exceptions.

**8. ZERO TOKEN LEAKS:** 
   - **No Read-Leaks:** Use `.\a-mem find` for targeted lookups instead of reading full files.
   - **No Write-Leaks:** Always use surgical string-replacement tools instead of fully rewriting files for minor edits.
   - **No Thought-Leaks:** Do not run Tier 3 simulations for Tier 1 tasks.

---

## Epistemic State Machine (ESM) Rules

**9. FACT LIFECYCLE:** Every fact written in Memory files MUST follow the ESM format:
```
- [STATE] [FACT-NNN] <content> | Source: <file:line> | Verified: S<session> | Deps: [FACT-xxx, ...]
```
Valid states: `SUSPECTED` → `CONFIRMED` → `STALE` → `CONTRADICTED`.
* A new fact starts as `[SUSPECTED]`.
* A fact validated across 2+ sessions becomes `[CONFIRMED]`.
* A `[CONFIRMED]` fact not re-validated for 8+ sessions is auto-flagged `[STALE]` by `.\a-mem status`.
* A fact that conflicts with newer evidence becomes `[CONTRADICTED]` and is archived, never deleted.

**10. WITNESS PROTOCOL:** Every fact MUST include `| Source: <file:line>`. Orphan facts (no provenance) are rejected by `.\a-mem validate`. This catches hallucinations at **write-time**, before they enter memory.

**11. REJECTION LEDGER (ANTI-MEMORY):** When evaluating paths and discarding one, record it in `Rejection-Ledger.md`:
```
- [REJ-NNN] <what was considered> | Reason: <why rejected> | Session: <N> | Unblock: <condition to reconsider>
```
Before suggesting any architectural approach, check `.\a-mem find "keyword" --in rejections` to verify it wasn't already tried and rejected.

**12. DEPENDENCY TRACKING:** Use `| Deps: [FACT-xxx, FACT-yyy]` to link facts causally. If a dependency becomes `[STALE]` or `[CONTRADICTED]`, `.\a-mem validate` will flag all downstream facts for re-evaluation.

