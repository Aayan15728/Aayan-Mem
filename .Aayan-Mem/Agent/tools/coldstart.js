/**
 * coldstart.js — Session Initialization Briefing (v4)
 * @author Aayan  @license MIT
 */

const fs   = require('fs');
const path = require('path');
const { parseFacts, parseRejections, checkStaleness, getCurrentSession } = require('./esm');
const {
  RESET, BOLD, DIM, GRAY, CYAN, GREEN, YELLOW, RED, WHITE,
  TAG_DENY, SEP,
  header, banner, row, kv, sub, divider, summaryBar
} = require('./ui');

const memoryDir       = path.resolve(__dirname, '..', '..', 'Memory-&-Context');
const decisionLogsDir = path.resolve(__dirname, '..', 'decision-logs');
const topic           = (process.argv[2] || '').toLowerCase();

function extractMeaningfulLines(content, count = 6) {
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, count);
}

console.log(banner(
  topic ? `coldstart  ·  topic: "${topic}"` : 'coldstart',
  'Session briefing · Recall Engine · Rejection Ledger · Next Steps'
));

// ── Phase 1: Memory Briefing ─────────────────────────────────────────────
if (!topic) {
  console.log(header('1 · Memory Briefing'));
  const files = ['App-Goal.md', 'Stack.md', 'Context-index.md', 'rules.md'];
  files.forEach((file, idx) => {
    try {
      const content = fs.readFileSync(path.join(memoryDir, file), 'utf-8');
      const lines   = extractMeaningfulLines(content, 6);
      if (idx > 0) console.log('');
      console.log(`  ${BOLD}${CYAN}${file}${RESET}`);
      if (lines.length > 0) {
        lines.forEach(l => console.log(`  ${GRAY}│${RESET}  ${DIM}${l}${RESET}`));
      } else {
        console.log(row('warn', file, 'EMPTY', 'run a-mem init to populate'));
      }
    } catch {
      console.log(row('err', file, 'MISSING', 'file not found'));
    }
  });
}

// ── Phase 2: ESM Fact Summary ────────────────────────────────────────────
const currentSession = getCurrentSession();
let facts      = parseFacts();
let rejections = parseRejections();

if (topic) {
  facts      = facts.filter(f => f.raw.toLowerCase().includes(topic));
  rejections = rejections.filter(r => r.raw.toLowerCase().includes(topic));
}

console.log(header('2 · Belief State'));

if (facts.length > 0) {
  const counts = { CONFIRMED: 0, SUSPECTED: 0, STALE: 0, CONTRADICTED: 0 };
  facts.forEach(f => { counts[f.state] = (counts[f.state] || 0) + 1; });

  console.log(kv('Total facts', `${facts.length}`));
  console.log('');
  if (counts.CONFIRMED)    console.log(row('ok',   'CONFIRMED',    `${counts.CONFIRMED}`,    'trusted by agent'));
  if (counts.SUSPECTED)    console.log(row('warn', 'SUSPECTED',    `${counts.SUSPECTED}`,    'needs verification'));
  if (counts.STALE)        console.log(row('warn', 'STALE',        `${counts.STALE}`,        'needs re-validation'));
  if (counts.CONTRADICTED) console.log(row('err',  'CONTRADICTED', `${counts.CONTRADICTED}`, 'must be resolved'));

  const confirmed = facts.filter(f => f.state === 'CONFIRMED');
  if (confirmed.length > 0) {
    console.log('');
    console.log(`  ${BOLD}${GREEN}Trusted facts${RESET}`);
    confirmed.forEach(f => console.log(`  ${GRAY}│${RESET}  ${GREEN}${f.id}${RESET}  ${f.content}`));
  }

  const stale = checkStaleness(facts, currentSession);
  if (stale.length > 0) {
    console.log('');
    console.log(`  ${BOLD}${YELLOW}Needs re-validation${RESET}`);
    stale.forEach(s => console.log(`  ${GRAY}│${RESET}  ${YELLOW}${s.id}${RESET}  ${DIM}last verified S${s.verifiedAt}  (${s.gap} sessions ago)${RESET}`));
  }
} else {
  console.log(row('info', 'ESM Facts', 'none' + (topic ? ` matching "${topic}"` : ''), 'run a-mem init to populate'));
}

// ── Phase 3: Rejection Ledger ────────────────────────────────────────────
console.log(header('3 · Rejection Ledger  [DO NOT SUGGEST]'));

if (rejections.length > 0) {
  rejections.forEach((r, idx) => {
    if (idx > 0) console.log('');
    console.log(`  ${TAG_DENY}  ${BOLD}${RED}${r.id}${RESET}  ${WHITE}${r.what}${RESET}`);
    if (r.reason)  console.log(`         ${GRAY}Reason       ${RESET}${r.reason}`);
    if (r.unblock) console.log(`         ${GRAY}Reconsider   ${RESET}${DIM}${r.unblock}${RESET}`);
  });
} else {
  console.log(row('info', 'Rejections', 'none' + (topic ? ` matching "${topic}"` : '')));
}

// ── Phase 4: Stale Decision Check ────────────────────────────────────────
if (!topic) {
  console.log(header('4 · Stale Decision Check'));
  const today = new Date();
  let staleCount = 0;
  try {
    const logs = fs.readdirSync(decisionLogsDir).filter(f => f.endsWith('.md'));
    logs.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(decisionLogsDir, file), 'utf-8');
        if (content.includes('THIS IS AN EXAMPLE SESSION LOG')) return;
        const reviewMatch = content.match(/\*\*Review-By:\*\*\s*(\d{4}-\d{2}-\d{2})/);
        const statusMatch = content.match(/\*\*Status:\*\*\s*(ACTIVE|REVOKED|SUPERSEDED)/i);
        if (reviewMatch && statusMatch) {
          const s = statusMatch[1].toUpperCase();
          if (s === 'ACTIVE' && today > new Date(reviewMatch[1])) {
            console.log(row('warn', file, 'STALE', `Review-By ${reviewMatch[1]} has passed`));
            staleCount++;
          } else if (s === 'REVOKED') {
            console.log(row('err', file, 'REVOKED', 'do not follow this decision'));
          }
        }
      } catch { /* skip */ }
    });
    if (staleCount === 0) console.log(row('ok', 'Review window', 'CURRENT', 'all active decisions on schedule'));
  } catch {
    console.log(row('info', 'Decision logs', 'directory not found'));
  }
}

// ── Phase 5: Next Steps ──────────────────────────────────────────────────
console.log(header('5 · Next Steps'));
const steps = [
  [`Echo back 3 key facts`, `Rule 6: Proof-of-Read`],
  [`Run  a-mem verify`, `before referencing any Memory file paths`],
  [`Run  a-mem log`, `for past decisions before any Tier 2/3 task`],
  [`Run  a-mem new "Your task title"`, `to open a session log`],
];
steps.forEach(([action, note], i) => {
  console.log(`  ${GRAY}${i + 1}.${RESET}  ${BOLD}${WHITE}${action}${RESET}  ${GRAY}${note}${RESET}`);
});
console.log('');
