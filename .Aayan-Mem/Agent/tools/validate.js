/**
 * validate.js — Memory Integrity Scanner (v4)
 * @author Aayan  @license MIT
 */

const fs   = require('fs');
const path = require('path');
const { parseFacts, parseRejections, checkWitness, checkDeps } = require('./esm');
const {
  RESET, BOLD, DIM, GRAY, CYAN, GREEN, YELLOW, RED, WHITE,
  header, banner, summaryBar, row, kv, sub
} = require('./ui');

const memoryDir = path.resolve(__dirname, '..', '..', 'Memory-&-Context');
let passed = 0, warnings = 0, errors = 0;
const ok   = () => passed++;
const warn = () => warnings++;
const err  = () => errors++;

function readSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8').replace(/<!--[\s\S]*?-->/g, '').toLowerCase(); }
  catch { return null; }
}

console.log(banner('validate', 'Memory integrity · Witness Protocol · Dependency Cascade · Contradictions'));

// ── 1. Witness Protocol ──────────────────────────────────────────────────
console.log(header('1 · Witness Protocol'));
const facts   = parseFacts();
const orphans = checkWitness(facts);

if (orphans.length > 0) {
  console.log(row('err', 'Orphan facts', `${orphans.length} violation(s)`, 'no Source: field'));
  orphans.forEach(o => console.log(sub(`${o.id}  →  ${o.file}:${o.line}`, RED)));
  err();
} else if (facts.length > 0) {
  console.log(row('ok', 'Witness Protocol', 'CLEAN', `${facts.length} fact(s) have provenance`));
  ok();
} else {
  console.log(row('info', 'Facts', 'none registered'));
}

// ── 2. Dependency Cascade ────────────────────────────────────────────────
console.log(header('2 · Dependency Cascade'));
const broken = checkDeps(facts);

if (broken.length > 0) {
  console.log(row('warn', 'Broken chains', `${broken.length} found`));
  broken.forEach(b => console.log(sub(`${b.fact}  depends on  ${b.dependsOn}  [${b.depState}]`, YELLOW)));
  warn();
} else if (facts.length > 0) {
  console.log(row('ok', 'Dependencies', 'CLEAN', 'no broken chains'));
  ok();
} else {
  console.log(row('info', 'Dependencies', 'none to check'));
}

// ── 3. Rejection Ledger ──────────────────────────────────────────────────
console.log(header('3 · Rejection Ledger'));
const rejections = parseRejections();
let rejIssues = 0;

rejections.forEach(r => {
  if (!r.reason) { console.log(row('err',  r.id, 'MALFORMED', 'missing Reason:')); err(); rejIssues++; }
  if (!r.unblock){ console.log(row('warn', r.id, 'INCOMPLETE','missing Unblock:')); warn(); rejIssues++; }
});

if (rejIssues === 0 && rejections.length > 0) {
  console.log(row('ok', 'Ledger', 'CLEAN', `${rejections.length} rejection(s) well-formed`));
  ok();
} else if (rejections.length === 0) {
  console.log(row('info', 'Rejections', 'none recorded'));
}

// ── 4. Structural Contradictions ─────────────────────────────────────────
console.log(header('4 · Structural Contradictions'));
const CONFLICT_RULES = [
  ['Context-index.md', 'do not use framer motion', 'Stack.md',            'framer motion', 'Framer Motion banned vs. listed in Stack'],
  ['Context-index.md', 'do not use light mode',    'Design-Guidelines.md','light mode',    'Light mode banned vs. referenced in Design'],
  ['rules.md',         'no single component file shall exceed', 'Stack.md','no file limit', 'File size rule contradicts Stack'],
];

let cc = 0;
CONFLICT_RULES.forEach(([fA, tA, fB, tB, desc]) => {
  const a = readSafe(path.join(memoryDir, fA));
  const b = readSafe(path.join(memoryDir, fB));
  if (a && b && a.includes(tA) && b.includes(tB)) {
    console.log(row('err', 'Conflict', desc));
    err(); cc++;
  }
});

// Duplicate key detection
let dupCount = 0;
try {
  const files  = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
  const defMap = {};
  files.forEach(file => {
    const content = readSafe(path.join(memoryDir, file));
    if (!content) return;
    content.split('\n').forEach(line => {
      const m = line.match(/^\s*-\s*\*\*([^:*]+)\*\*:/i);
      if (m) {
        const key = m[1].trim().toLowerCase();
        if (['suspected','confirmed','stale','contradicted'].some(s => key.startsWith(s))) return;
        if (defMap[key]) {
          console.log(row('warn', 'Duplicate key', `"${m[1].trim()}"`, `${defMap[key]} & ${file}`));
          warn(); dupCount++;
        } else { defMap[key] = file; }
      }
    });
  });
} catch { /* skip */ }

if (cc === 0 && dupCount === 0) {
  console.log(row('ok', 'Contradictions', 'CLEAN', 'no structural conflicts'));
  ok();
}

console.log(summaryBar(passed, warnings, errors));
