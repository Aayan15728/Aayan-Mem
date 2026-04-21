/**
 * status.js — Unified System Health Dashboard (v4)
 * @author Aayan  @license MIT
 */

const fs   = require('fs');
const path = require('path');
const {
  parseFacts, parseRejections, checkStaleness,
  checkDeps, checkWitness, getCurrentSession, STALE_THRESHOLD
} = require('./esm');
const {
  RESET, BOLD, DIM, GRAY, CYAN, GREEN, YELLOW, RED, WHITE,
  TAG_OK, TAG_WARN, TAG_ERR, TAG_INFO,
  header, banner, summaryBar, row, kv, sub, divider
} = require('./ui');

const ROOT            = path.resolve(__dirname, '..', '..');
const memoryDir       = path.join(ROOT, 'Memory-&-Context');
const agentDir        = path.join(ROOT, 'Agent');
const decisionLogsDir = path.join(agentDir, 'decision-logs');

let passed = 0, warnings = 0, errors = 0;
const ok   = () => passed++;
const warn = () => warnings++;
const err  = () => errors++;

// ── Banner ────────────────────────────────────────────────────────────────
console.log(banner('system status', 'Full health check across all A.MEM subsystems'));

// ═══════════════════════════════════════════════════════════════════
// 1. SESSION OVERVIEW
// ═══════════════════════════════════════════════════════════════════
console.log(header('1 · Session Overview'));
const currentSession = getCurrentSession();
try {
  const logs     = fs.readdirSync(decisionLogsDir).filter(f => f.endsWith('.md'));
  const realLogs = logs.filter(f => {
    try { return !fs.readFileSync(path.join(decisionLogsDir, f), 'utf-8').includes('THIS IS AN EXAMPLE SESSION LOG'); }
    catch { return false; }
  });

  console.log(kv('Current session',   `S${currentSession}`, CYAN));
  console.log(kv('Decision logs',     `${realLogs.length} real`, GREEN));
  if (logs.length - realLogs.length > 0)
    console.log(kv('  Example logs',  `${logs.length - realLogs.length} (ignored)`));

  if (logs.length > 0) {
    const last = [...logs].sort().pop();
    const c    = fs.readFileSync(path.join(decisionLogsDir, last), 'utf-8');
    const d    = c.match(/\*\*Date:\*\*\s*([^\n|]+)/);
    const s    = c.match(/\*\*Status:\*\*\s*(ACTIVE|REVOKED|SUPERSEDED)/i);
    console.log(kv('Last log',         last));
    if (d) console.log(kv('Last session date', d[1].trim()));
    if (s) {
      const isActive = s[1].toUpperCase() === 'ACTIVE';
      console.log(row(isActive ? 'ok' : 'warn', 'Last session status', s[1]));
      isActive ? ok() : warn();
    }
  }
} catch (e) {
  console.log(row('err', 'Session data', `Could not read: ${e.message}`));
  err();
}

// ═══════════════════════════════════════════════════════════════════
// 2. ESM BELIEF STATE
// ═══════════════════════════════════════════════════════════════════
console.log(header('2 · Epistemic Belief State'));
const facts = parseFacts();

if (facts.length > 0) {
  const counts = { CONFIRMED: 0, SUSPECTED: 0, STALE: 0, CONTRADICTED: 0 };
  facts.forEach(f => { counts[f.state] = (counts[f.state] || 0) + 1; });

  console.log(kv('Total facts', `${facts.length}`));
  console.log('');
  if (counts.CONFIRMED)    console.log(row('ok',   'CONFIRMED',    `${counts.CONFIRMED}`,    `verified facts`));
  if (counts.SUSPECTED)    console.log(row('warn', 'SUSPECTED',    `${counts.SUSPECTED}`,    `needs verification`));
  if (counts.STALE)        console.log(row('warn', 'STALE',        `${counts.STALE}`,        `past threshold`));
  if (counts.CONTRADICTED) console.log(row('err',  'CONTRADICTED', `${counts.CONTRADICTED}`, `must be resolved`));

  console.log('');

  // Witness check
  const orphans = checkWitness(facts);
  if (orphans.length > 0) {
    console.log(row('err', 'Witness Protocol', `${orphans.length} violation(s)`, 'facts missing Source:'));
    orphans.forEach(o => console.log(sub(`${o.id}  →  ${o.file}:${o.line}`, RED)));
    err();
  } else {
    console.log(row('ok', 'Witness Protocol', 'CLEAN', 'all facts have provenance'));
    ok();
  }

  // Staleness
  const stale = checkStaleness(facts, currentSession);
  if (stale.length > 0) {
    console.log(row('warn', 'Staleness', `${stale.length} fact(s)`, `threshold: ${STALE_THRESHOLD} sessions`));
    stale.forEach(s => console.log(sub(`${s.id}  last verified S${s.verifiedAt}  (${s.gap} sessions ago)`, YELLOW)));
    warn();
  }

  // Deps
  const broken = checkDeps(facts);
  if (broken.length > 0) {
    console.log(row('warn', 'Dependency Cascade', `${broken.length} broken chain(s)`));
    broken.forEach(b => console.log(sub(`${b.fact}  depends on  ${b.dependsOn}  [${b.depState}]`, YELLOW)));
    warn();
  }
} else {
  console.log(row('info', 'ESM Facts', 'none registered', `run a-mem init to populate`));
}

// ═══════════════════════════════════════════════════════════════════
// 3. REJECTION LEDGER
// ═══════════════════════════════════════════════════════════════════
console.log(header('3 · Rejection Ledger'));
const rejections = parseRejections();

if (rejections.length > 0) {
  console.log(kv('Active rejections', `${rejections.length}`));
  console.log('');
  const malformed = rejections.filter(r => !r.reason || !r.unblock);
  if (malformed.length > 0) {
    malformed.forEach(r => {
      console.log(row('warn', r.id, 'malformed', `missing ${!r.reason ? 'Reason:' : 'Unblock:'}`));
      warn();
    });
  } else {
    console.log(row('ok', 'Ledger integrity', 'CLEAN', `${rejections.length} entr${rejections.length !== 1 ? 'ies' : 'y'} well-formed`));
    ok();
  }
} else {
  console.log(row('info', 'Rejections', 'none recorded'));
}

// ═══════════════════════════════════════════════════════════════════
// 4. STALE DECISION CHECK
// ═══════════════════════════════════════════════════════════════════
console.log(header('4 · Stale Decision Check'));
try {
  const today = new Date();
  const logs  = fs.readdirSync(decisionLogsDir).filter(f => f.endsWith('.md'));
  let staleCount = 0;
  logs.forEach(file => {
    try {
      const c = fs.readFileSync(path.join(decisionLogsDir, file), 'utf-8');
      if (c.includes('THIS IS AN EXAMPLE SESSION LOG')) return;
      const r = c.match(/\*\*Review-By:\*\*\s*(\d{4}-\d{2}-\d{2})/);
      const s = c.match(/\*\*Status:\*\*\s*(ACTIVE|REVOKED|SUPERSEDED)/i);
      if (r && s && s[1].toUpperCase() === 'ACTIVE' && today > new Date(r[1])) {
        console.log(row('warn', file, 'STALE', `Review-By ${r[1]} passed`));
        staleCount++; warn();
      }
    } catch { /* skip */ }
  });
  if (staleCount === 0) {
    console.log(row('ok', 'Review window', 'CURRENT', 'all active decisions within date'));
    ok();
  }
} catch (e) {
  console.log(row('err', 'Decision logs', `Read error: ${e.message}`));
  err();
}

// ═══════════════════════════════════════════════════════════════════
// 5. CONTRADICTION SCAN
// ═══════════════════════════════════════════════════════════════════
console.log(header('5 · Contradiction Scan'));
try {
  const RULES = [
    ['Context-index.md', 'do not use framer motion', 'Stack.md',            'framer motion', 'Framer Motion: banned vs. listed in Stack'],
    ['Context-index.md', 'do not use light mode',    'Design-Guidelines.md','light mode',    'Light mode: banned vs. referenced in Design'],
  ];
  const readSafe = (f) => {
    try { return fs.readFileSync(path.join(memoryDir, f), 'utf-8').replace(/<!--[\s\S]*?-->/g, '').toLowerCase(); }
    catch { return null; }
  };
  let cc = 0;
  RULES.forEach(([fA, tA, fB, tB, desc]) => {
    const a = readSafe(fA), b = readSafe(fB);
    if (a && b && a.includes(tA) && b.includes(tB)) {
      console.log(row('err', 'Conflict', desc));
      cc++; err();
    }
  });
  if (cc === 0) {
    console.log(row('ok', 'Contradictions', 'CLEAN', 'no conflicts detected'));
    ok();
  }
} catch (e) {
  console.log(row('err', 'Scan', `Failed: ${e.message}`));
  err();
}

// ═══════════════════════════════════════════════════════════════════
// 6. PATH VERIFICATION
// ═══════════════════════════════════════════════════════════════════
console.log(header('6 · Path Verification'));
try {
  const projectRoot = path.resolve(ROOT, '..');
  const PREG  = /`((?:\.?[/\\])[a-zA-Z0-9_\-/\\. ]+(?:\.[a-zA-Z]+)?)`/g;
  const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
  let miss = 0, ver = 0;
  files.forEach(file => {
    try {
      let c = fs.readFileSync(path.join(memoryDir, file), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
      let m;
      PREG.lastIndex = 0;
      while ((m = PREG.exec(c)) !== null) {
        const norm = m[1].replace(/[/\\]/g, path.sep);
        if (fs.existsSync(path.join(projectRoot, norm))) ver++;
        else { console.log(row('warn', m[1], 'MISSING', `ref in ${file}`)); miss++; warn(); }
      }
    } catch { /* skip */ }
  });
  if (miss === 0) {
    if (ver > 0) { console.log(row('ok', 'File paths', `${ver} verified`, 'all referenced paths exist on disk')); ok(); }
    else { console.log(row('info', 'File paths', 'none found', 'no path references in Memory files')); }
  }
} catch (e) {
  console.log(row('err', 'Path verification', `Failed: ${e.message}`));
  err();
}

// ── Final summary ─────────────────────────────────────────────────────────
console.log(summaryBar(passed, warnings, errors));
