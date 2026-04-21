# .Aayan-Mem

> **A Two-Brain Architecture for Zero-Hallucination AI Coding**

`.Aayan-Mem` is an open-source memory and reasoning framework that forces AI coding agents to **prove their logic before writing code**. It eliminates hallucinations, prevents token waste, and creates a permanent, auditable timeline of every architectural decision.

**Zero dependencies. Pure Node.js. $0 cost.**

---

## 🧠 The Problem

AI coding agents hallucinate. They reference files that don't exist, follow stale logic, make decisions without comparing alternatives, and burn thousands of tokens reading entire files when they only need two lines.

`.Aayan-Mem` solves this by splitting the agent's mind into two hemispheres with strict operational rules.

---

## 🏗️ Architecture

```
.Aayan-Mem/
├── Agent/                          ← THE ACCOUNTABILITY ENGINE
│   ├── rules.md                    ← 8 operational rules + CLI reference
│   ├── session-template.md         ← Canonical decision log template
│   ├── session-counter.json        ← Auto-incrementing session tracker
│   ├── decision-index.md           ← 1-line summary pointers (no token bombs)
│   ├── decision-logs/
│   │   └── session-1.md            ← Full decision log with comparison matrix
│   └── tools/
│       ├── search.js               ← Snippet search (4-line context buffer)
│       ├── coldstart.js            ← 5-line briefing + stale decision scanner
│       ├── validate.js             ← Contradiction detection across Memory
│       ├── verify-paths.js         ← File path existence checker
│       └── status.js               ← Unified system health dashboard
└── Memory-&-Context/               ← THE RECALL ENGINE
    ├── App-Goal.md                 ← What are we building and why
    ├── Stack.md                    ← Framework, language, DB, deployment
    ├── Context-index.md            ← Pointers, preferences, API key locations
    ├── Design-Guidelines.md        ← UI/UX rules (glassmorphism, animations)
    └── rules.md                    ← Measurable code quality thresholds
```

### How the Two Brains Work

| Brain | Purpose | Contains |
|-------|---------|----------|
| **Agent** (Accountability Engine) | Forces the AI to simulate, compare, and document reasoning before coding | Decision logs, comparison matrices, session history, operational rules |
| **Memory-&-Context** (Recall Engine) | Provides the single source of truth about the project's state | Tech stack, design guidelines, file locations, code quality rules |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v14+)

### Usage

From the project root:

```bash
# Interactive mode — presents a menu
.\a-mem

# Direct commands
.\a-mem coldstart              # Session initialization briefing
.\a-mem find "auth|supabase"   # Snippet search across all files
.\a-mem validate               # Scan for contradictions
.\a-mem verify                 # Check if referenced paths exist
.\a-mem status                 # Full system health check
.\a-mem help                   # Show all commands
```

> **Note:** On PowerShell, use `.\a-mem`. On bash/zsh, use `./a-mem.js` or `node a-mem.js`.

---

## 📋 CLI Command Reference

| Command | What It Does |
|---------|-------------|
| `.\a-mem` | Launch interactive mode with numbered menu |
| `.\a-mem coldstart` | Read first 5 lines of each Memory file + check for stale decisions |
| `.\a-mem find "term"` | Search all `.Aayan-Mem` files with 4-line context buffer |
| `.\a-mem validate` | Detect contradictions and duplicate definitions across Memory |
| `.\a-mem verify` | Check if file paths referenced in Memory exist on disk |
| `.\a-mem status` | Run all health checks in one unified report |
| `.\a-mem help` | Show all available commands |

---

## 🎯 The 8 Operational Rules

| # | Rule | Purpose |
|---|------|---------|
| 1 | **Cold Start** | Run `.\a-mem coldstart` at the start of every session |
| 2 | **Contradiction Check** | Run `.\a-mem validate` after any Memory update |
| 3 | **Task Complexity Tiers** | Tier 1 (trivial) = skip simulation. Tier 2 (feature) = 1-line log. Tier 3 (architecture) = full 3-path comparison matrix |
| 4 | **Session Management** | Use `session-counter.json` and `session-template.md` for consistent logs |
| 5 | **Hallucination Guard** | Verify file existence before referencing Memory paths |
| 6 | **Proof-of-Read** | Echo 3 key facts from coldstart to prove comprehension |
| 7 | **Pre-Commit Checklist** | Sessions can't close without Post-Implementation Verification |
| 8 | **Zero Token Leaks** | No Read-Leaks, No Write-Leaks, No Thought-Leaks |

---

## 🔬 Decision Simulation Flow

```
Task arrives
     │
     ▼
┌─────────────┐
│ Classify     │
│ Tier 1/2/3   │
└──────┬──────┘
       │
  ┌────┴────────────────────────┐
  │            │                │
  ▼            ▼                ▼
Tier 1       Tier 2           Tier 3
Execute      Log path +       Full 3-path
immediately  1 sentence       simulation
             reasoning        + comparison
                              matrix
                                │
                                ▼
                         ┌──────────────┐
                         │ Path A vs B  │
                         │   vs C       │
                         │ Score each   │
                         │ on criteria  │
                         └──────┬───────┘
                                │
                                ▼
                         Log winner +
                         rejected paths +
                         exact reasoning
```

---

## 🛡️ Anti-Hallucination Features

- **Snippet Search:** Never reads full files — returns only matching lines ± 2 lines of context
- **Contradiction Scanner:** Detects conflicting facts across Memory files
- **Path Verifier:** Proves referenced files exist on disk before the agent uses them
- **Stale Decision Scanner:** Flags decisions past their Review-By date
- **Anti-Drift Headers:** Every Memory file tracks `Last-Modified-By` and `Last-Modified-Session`
- **Changelog Enforcement:** Every Memory file has a `## Changelog` section for version history
- **Proof-of-Read:** Agent must echo back facts from coldstart to prove it didn't just run and ignore

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/new-tool`)
3. Follow the existing code commenting style (JSDoc headers on all `.js` files)
4. Test with `.\a-mem status` before submitting
5. Open a Pull Request

---

**Built by [Aayan](https://github.com/Aayan)** — because AI should reason, not guess.
