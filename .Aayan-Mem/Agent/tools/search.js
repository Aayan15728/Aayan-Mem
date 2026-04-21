/**
 * search.js — Filtered Snippet Search Engine (v3)
 *
 * Searches .Aayan-Mem markdown files with 4-line context buffer.
 * Scopes: all | memory | agent | decisions | stack | ui | rules | rejections | goals | context
 *
 * Usage: node search.js "term" [scope]
 *
 * @author Aayan  @license MIT
 */

const fs   = require('fs');
const path = require('path');
const {
  RESET, BOLD, DIM, CYAN, GREEN, YELLOW, RED, WHITE,
  INFO, ERR,
  header, banner, LINE
} = require('./ui');

const CONTEXT_BUFFER = 2;
const ROOT       = path.resolve(__dirname, '..', '..');
const MEMORY_DIR = path.join(ROOT, 'Memory-&-Context');
const AGENT_DIR  = path.join(ROOT, 'Agent');
const LOGS_DIR   = path.join(AGENT_DIR, 'decision-logs');

function getFilesForScope(scope) {
  const files = [];
  function collectMd(dir) {
    try {
      fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        try {
          if (fs.statSync(full).isDirectory()) collectMd(full);
          else if (full.endsWith('.md')) files.push(full);
        } catch { /* skip */ }
      });
    } catch { /* skip */ }
  }
  switch (scope) {
    case 'memory':     collectMd(MEMORY_DIR); break;
    case 'agent':
      try {
        fs.readdirSync(AGENT_DIR).forEach(f => {
          const full = path.join(AGENT_DIR, f);
          if (!fs.statSync(full).isDirectory() && full.endsWith('.md')) files.push(full);
        });
      } catch { /* skip */ }
      break;
    case 'decisions':  collectMd(LOGS_DIR); break;
    case 'stack':      files.push(path.join(MEMORY_DIR, 'Stack.md')); break;
    case 'ui':         files.push(path.join(MEMORY_DIR, 'Design-Guidelines.md')); break;
    case 'rules':      files.push(path.join(MEMORY_DIR, 'rules.md'), path.join(AGENT_DIR, 'rules.md')); break;
    case 'rejections': files.push(path.join(MEMORY_DIR, 'Rejection-Ledger.md')); break;
    case 'goals':      files.push(path.join(MEMORY_DIR, 'App-Goal.md')); break;
    case 'context':    files.push(path.join(MEMORY_DIR, 'Context-index.md')); break;
    default:           collectMd(ROOT); break;
  }
  return files.filter(f => { try { return fs.existsSync(f); } catch { return false; } });
}

function searchFiles(files, queryTerms) {
  const results = [];
  for (const fullPath of files) {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines   = content.split('\n');
      const matchIdx = new Set();

      lines.forEach((line, index) => {
        if (queryTerms.some(t => line.toLowerCase().includes(t.toLowerCase()))) {
          const start = Math.max(0, index - CONTEXT_BUFFER);
          const end   = Math.min(lines.length - 1, index + CONTEXT_BUFFER);
          for (let i = start; i <= end; i++) matchIdx.add(i);
        }
      });

      if (matchIdx.size > 0) {
        const sorted = Array.from(matchIdx).sort((a, b) => a - b);
        const output = [];
        let lastIdx = -2;
        sorted.forEach(idx => {
          if (lastIdx !== -2 && idx > lastIdx + 1) output.push(`  ${DIM}  ···${RESET}`);
          const isMatch = queryTerms.some(t => lines[idx].toLowerCase().includes(t.toLowerCase()));
          const ln      = String(idx + 1).padStart(4);
          if (isMatch) {
            // Highlight matched term inline
            let hl = lines[idx];
            queryTerms.forEach(t => {
              const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              hl = hl.replace(re, m => `${YELLOW}${BOLD}${m}${RESET}`);
            });
            output.push(`  ${CYAN}${ln}${RESET} ${GREEN}›${RESET} ${hl}`);
          } else {
            output.push(`  ${DIM}${ln}  ${lines[idx]}${RESET}`);
          }
          lastIdx = idx;
        });
        const relPath = path.relative(path.resolve(ROOT, '..'), fullPath);
        results.push({
          header: `\n  ${CYAN}${BOLD}${relPath}${RESET}`,
          body:   output.join('\n')
        });
      }
    } catch { /* skip unreadable */ }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────
const query = process.argv[2];
const scope = (process.argv[3] || 'all').toLowerCase();

if (!query) {
  console.log(banner('find', 'Surgical snippet search · 4-line context buffer'));
  console.log(`\n  ${ERR}  Missing query.\n`);
  console.log(`  ${DIM}Usage:${RESET}  node search.js ${CYAN}"term"${RESET} ${DIM}[scope]${RESET}`);
  console.log(`  ${DIM}Scopes:${RESET} all · memory · agent · decisions · stack · ui · rules · rejections · goals · context\n`);
  process.exit(1);
}

console.log(banner('find', `Searching [${scope}] for: "${query}"`));

const terms = query.split('|').map(t => t.trim()).filter(Boolean);
const files = getFilesForScope(scope);

if (files.length === 0) {
  console.log(`\n  ${INFO}  ${DIM}No files found for scope: "${scope}"${RESET}\n`);
  process.exit(0);
}

console.log(`\n  ${DIM}${files.length} file(s) in scope · terms: ${terms.map(t => `"${t}"`).join(', ')}${RESET}\n  ${DIM}${'─'.repeat(48)}${RESET}`);

const found = searchFiles(files, terms);
if (found.length > 0) {
  found.forEach(r => {
    console.log(r.header);
    console.log(r.body);
  });
  console.log(`\n  ${GREEN}${found.length} file(s) matched.${RESET}\n`);
} else {
  console.log(`\n  ${DIM}No results found for "${query}".${RESET}\n`);
}
