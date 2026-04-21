/**
 * esm.js — Epistemic State Machine Parser
 *
 * The core engine of A.MEM v2. Parses structured fact lines from Memory
 * files and enforces the belief lifecycle:
 *
 *   [SUSPECTED] → [CONFIRMED] → [STALE] → [CONTRADICTED]
 *
 * Every fact line in Memory-&-Context follows this syntax:
 *   - [STATE] [FACT-NNN] <content> | Source: <file:line> | Verified: S<N> | Deps: [FACT-xxx, ...]
 *
 * This module:
 *   1. Extracts all fact lines from Memory files
 *   2. Checks for Witness Protocol violations (missing Source:)
 *   3. Detects staleness (session gap > threshold)
 *   4. Traces Deps to find cascade risks (depending on STALE/CONTRADICTED facts)
 *   5. Parses Rejection Ledger entries
 *
 * Exports parseFacts(), parseRejections(), checkStaleness(), checkDeps()
 * for use by validate.js, status.js, and coldstart.js.
 *
 * Usage: node esm.js [current-session-number]
 * Dependencies: None (pure Node.js)
 *
 * @author Aayan
 * @license MIT
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MEMORY_DIR = path.join(ROOT, 'Memory-&-Context');
const AGENT_DIR = path.join(ROOT, 'Agent');
const STALE_THRESHOLD = 8; // Sessions without re-validation before flagging STALE

// ── Regex patterns for single-line markdown syntax ───────────────────────
const FACT_REGEX = /^-\s*\[(SUSPECTED|CONFIRMED|STALE|CONTRADICTED)\]\s*\[FACT-(\d+)\]\s*(.+)/i;
const SOURCE_REGEX = /\|\s*Source:\s*([^\|]+)/i;
const VERIFIED_REGEX = /\|\s*Verified:\s*S(\d+)/i;
const DEPS_REGEX = /\|\s*Deps:\s*\[([^\]]*)\]/i;
const REJ_REGEX = /^-\s*\[REJ-(\d+)\]\s*(.+)/i;
const REJ_REASON_REGEX = /\|\s*Reason:\s*([^\|]+)/i;
const REJ_SESSION_REGEX = /\|\s*Session:\s*(\d+)/i;
const REJ_UNBLOCK_REGEX = /\|\s*Unblock:\s*(.+)/i;

/**
 * Get the current session number from session-counter.json.
 * @returns {number}
 */
function getCurrentSession() {
  try {
    const counter = JSON.parse(
      fs.readFileSync(path.join(AGENT_DIR, 'session-counter.json'), 'utf-8')
    );
    return counter.lastSession || 0;
  } catch { return 0; }
}

/**
 * Parse all fact lines from Memory-&-Context markdown files.
 * Strips HTML comments first so template examples don't pollute results.
 *
 * @returns {Array<Object>} Array of parsed fact objects
 */
function parseFacts() {
  const facts = [];
  let files;
  try {
    files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && f !== 'Rejection-Ledger.md');
  } catch { return facts; }

  for (const file of files) {
    try {
      let content = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf-8');
      content = content.replace(/<!--[\s\S]*?-->/g, '');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(FACT_REGEX);
        if (!match) continue;

        const state = match[1].toUpperCase();
        const id = `FACT-${match[2]}`;
        const rest = match[3];

        // Extract content (everything before first |)
        const contentPart = rest.split('|')[0].trim();

        // Extract source (Witness Protocol)
        const sourceMatch = rest.match(SOURCE_REGEX);
        const source = sourceMatch ? sourceMatch[1].trim() : null;

        // Extract verified session
        const verifiedMatch = rest.match(VERIFIED_REGEX);
        const verifiedAt = verifiedMatch ? parseInt(verifiedMatch[1], 10) : null;

        // Extract dependencies
        const depsMatch = rest.match(DEPS_REGEX);
        const deps = depsMatch
          ? depsMatch[1].split(',').map(d => d.trim()).filter(Boolean)
          : [];

        facts.push({
          id, state, content: contentPart, source,
          verifiedAt, deps, file, line: i + 1,
          raw: lines[i]
        });
      }
    } catch { /* skip unreadable */ }
  }
  return facts;
}

/**
 * Parse all rejection entries from Rejection-Ledger.md.
 *
 * @returns {Array<Object>} Array of parsed rejection objects
 */
function parseRejections() {
  const rejections = [];
  const ledgerPath = path.join(MEMORY_DIR, 'Rejection-Ledger.md');

  try {
    let content = fs.readFileSync(ledgerPath, 'utf-8');
    content = content.replace(/<!--[\s\S]*?-->/g, '');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(REJ_REGEX);
      if (!match) continue;

      const id = `REJ-${match[1]}`;
      const rest = match[2];
      const what = rest.split('|')[0].trim();

      const reasonMatch = rest.match(REJ_REASON_REGEX);
      const sessionMatch = rest.match(REJ_SESSION_REGEX);
      const unblockMatch = rest.match(REJ_UNBLOCK_REGEX);

      rejections.push({
        id, what,
        reason: reasonMatch ? reasonMatch[1].trim() : null,
        session: sessionMatch ? parseInt(sessionMatch[1], 10) : null,
        unblock: unblockMatch ? unblockMatch[1].trim() : null,
        line: i + 1,
        raw: lines[i]
      });
    }
  } catch { /* ledger may not exist yet */ }

  return rejections;
}

/**
 * Check for stale facts based on session gap.
 * A CONFIRMED fact becomes stale if (currentSession - verifiedAt) > STALE_THRESHOLD.
 *
 * @param {Array} facts - parsed facts from parseFacts()
 * @param {number} currentSession - current session number
 * @returns {Array<Object>} stale facts with gap info
 */
function checkStaleness(facts, currentSession) {
  const stale = [];
  for (const fact of facts) {
    if (fact.state === 'CONFIRMED' && fact.verifiedAt !== null) {
      const gap = currentSession - fact.verifiedAt;
      if (gap > STALE_THRESHOLD) {
        stale.push({ ...fact, gap, threshold: STALE_THRESHOLD });
      }
    }
  }
  return stale;
}

/**
 * Check Deps cascade: find facts that depend on STALE or CONTRADICTED facts.
 *
 * @param {Array} facts - parsed facts from parseFacts()
 * @returns {Array<Object>} facts with broken dependencies
 */
function checkDeps(facts) {
  const stateMap = {};
  facts.forEach(f => { stateMap[f.id] = f.state; });

  const broken = [];
  for (const fact of facts) {
    for (const dep of fact.deps) {
      const depState = stateMap[dep];
      if (depState === 'STALE' || depState === 'CONTRADICTED') {
        broken.push({
          fact: fact.id,
          factState: fact.state,
          dependsOn: dep,
          depState,
          file: fact.file,
          line: fact.line
        });
      }
    }
  }
  return broken;
}

/**
 * Check Witness Protocol: find facts missing the Source: field.
 *
 * @param {Array} facts - parsed facts from parseFacts()
 * @returns {Array<Object>} orphan facts (no source)
 */
function checkWitness(facts) {
  return facts.filter(f => !f.source);
}

// ── Direct execution: print full ESM report ──────────────────────────────
if (require.main === module) {
  const {
    RESET, BOLD, DIM, CYAN, GREEN, YELLOW, RED,
    OK, WARN, ERR, INFO,
    header, banner, summaryBar, statusLine, row
  } = require('./ui');

  const currentSession = parseInt(process.argv[2], 10) || getCurrentSession();
  const facts       = parseFacts();
  const rejections  = parseRejections();
  let passed = 0, warnings = 0, errors = 0;
  const track = (ok) => { if (ok === true) passed++; else if (ok === 'warn') warnings++; else errors++; };

  console.log(banner('esm', `Epistemic State Machine · session S${currentSession}`));

  // ── Fact Inventory ────────────────────────────────────────────────────
  console.log(header('Fact Inventory'));
  const counts = { SUSPECTED: 0, CONFIRMED: 0, STALE: 0, CONTRADICTED: 0 };
  facts.forEach(f => { counts[f.state] = (counts[f.state] || 0) + 1; });
  console.log(row(INFO, 'Total facts',    `${facts.length}`));
  if (counts.CONFIRMED)    console.log(row(OK,   'Confirmed',    `${counts.CONFIRMED}`,    GREEN));
  if (counts.SUSPECTED)    console.log(row(WARN, 'Suspected',    `${counts.SUSPECTED}`,    YELLOW));
  if (counts.STALE)        console.log(row(WARN, 'Stale',        `${counts.STALE}`,        YELLOW));
  if (counts.CONTRADICTED) console.log(row(ERR,  'Contradicted', `${counts.CONTRADICTED}`, RED));
  if (facts.length === 0)  console.log(`  ${INFO}  ${DIM}No facts registered yet.${RESET}`);

  // ── Witness Protocol ──────────────────────────────────────────────────
  console.log(header('Witness Protocol'));
  const orphans = checkWitness(facts);
  if (orphans.length > 0) {
    orphans.forEach(o => { console.log(statusLine(`${o.id}`, false, `${o.file}:${o.line} — missing Source:`)); track(false); });
  } else if (facts.length > 0) {
    console.log(statusLine('Provenance', true, 'all facts have Source:'));
    track(true);
  } else {
    console.log(`  ${INFO}  ${DIM}No facts to check.${RESET}`);
  }

  // ── Staleness ─────────────────────────────────────────────────────────
  console.log(header(`Staleness Check  [threshold: ${STALE_THRESHOLD} sessions]`));
  console.log(row(INFO, 'Current session', `S${currentSession}`));
  const stale = checkStaleness(facts, currentSession);
  if (stale.length > 0) {
    stale.forEach(s => { console.log(statusLine(`${s.id}`, 'warn', `last verified S${s.verifiedAt}, ${s.gap} sessions ago`)); track('warn'); });
  } else if (facts.length > 0) {
    console.log(statusLine('Freshness', true, 'all CONFIRMED facts within window'));
    track(true);
  } else {
    console.log(`  ${INFO}  ${DIM}No facts to check.${RESET}`);
  }

  // ── Dependency Cascade ────────────────────────────────────────────────
  console.log(header('Dependency Cascade'));
  const broken = checkDeps(facts);
  if (broken.length > 0) {
    broken.forEach(b => { console.log(statusLine(`${b.fact}`, 'warn', `depends on ${b.dependsOn} (${b.depState})`)); track('warn'); });
  } else if (facts.length > 0) {
    console.log(statusLine('Chains', true, 'no broken dependencies'));
    track(true);
  } else {
    console.log(`  ${INFO}  ${DIM}No dependencies to check.${RESET}`);
  }

  // ── Rejections ────────────────────────────────────────────────────────
  console.log(header('Rejection Ledger'));
  if (rejections.length > 0) {
    rejections.forEach(r => {
      console.log(`  ${ERR}  ${RED}${r.id}${RESET}  ${r.what}`);
      if (r.reason) console.log(`      ${DIM}Reason: ${RESET}${r.reason}`);
    });
  } else {
    console.log(`  ${INFO}  ${DIM}No rejected paths recorded yet.${RESET}`);
  }

  console.log(summaryBar(passed, warnings, errors));
}

module.exports = {
  parseFacts, parseRejections, checkStaleness,
  checkDeps, checkWitness, getCurrentSession,
  STALE_THRESHOLD
};
