/**
 * integrity.js — Content Integrity Checker
 *
 * Scans all Memory-&-Context and Agent markdown files for:
 *   1. Broken/garbled UTF-8 characters (replacement char, null bytes, BOMs)
 *   2. Inconsistent line endings (CRLF mixed with LF)
 *   3. Broken ESM fact syntax (malformed FACT lines)
 *   4. Version string drift (a-mem.js vs VERSION file)
 *   5. Empty critical memory files
 *
 * Usage: node integrity.js
 *        node integrity.js --strict   → exit code 1 if any errors
 *
 * @author Aayan  @license MIT
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const {
  RESET, BOLD, DIM, GRAY, CYAN, GREEN, YELLOW, RED, WHITE,
  header, banner, summaryBar, row, kv, sub
} = require('./ui');

const ROOT            = path.resolve(__dirname, '..', '..');
const memoryDir       = path.join(ROOT, 'Memory-&-Context');
const agentDir        = path.join(ROOT, 'Agent');
const projectRoot     = path.resolve(ROOT, '..');
const strict          = process.argv.includes('--strict');

let passed = 0, warnings = 0, errors = 0;
const ok   = () => passed++;
const warn = () => warnings++;
const err  = () => errors++;

// ── Helpers ──────────────────────────────────────────────────────────────
function collectMd(dir) {
  const files = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      try {
        if (fs.statSync(full).isDirectory()) return; // don't recurse
        if (f.endsWith('.md')) files.push(full);
      } catch { /* skip */ }
    });
  } catch { /* skip */ }
  return files;
}

function relPath(p) {
  return path.relative(projectRoot, p);
}

// ── Banner ────────────────────────────────────────────────────────────────
console.log(banner('integrity', 'UTF-8 · line endings · ESM syntax · version · file health'));

// ═══════════════════════════════════════════════════════════════════
// 1. VERSION CONSISTENCY
// ═══════════════════════════════════════════════════════════════════
console.log(header('1 · Version String Consistency'));

let versionFileVal = null;
let aMemJsVal      = null;

try {
  versionFileVal = fs.readFileSync(path.join(projectRoot, 'VERSION'), 'utf-8').trim();
  console.log(kv('VERSION file', versionFileVal, CYAN));
} catch {
  console.log(row('warn', 'VERSION file', 'NOT FOUND', 'create a VERSION file in project root'));
  warn();
}

try {
  const aMemSrc = fs.readFileSync(path.join(projectRoot, 'a-mem.js'), 'utf-8');
  const m = aMemSrc.match(/return\s+['"](\d+\.\d+\.\d+)['"]/);
  if (m) {
    aMemJsVal = m[1];
    console.log(kv('a-mem.js fallback', aMemJsVal, CYAN));
  }
} catch { /* skip */ }

if (versionFileVal && aMemJsVal && versionFileVal !== aMemJsVal) {
  console.log(row('warn', 'Version mismatch', `VERSION=${versionFileVal}  a-mem.js=${aMemJsVal}`, 'update fallback in a-mem.js'));
  warn();
} else if (versionFileVal || aMemJsVal) {
  console.log(row('ok', 'Version strings', 'CONSISTENT'));
  ok();
}

// ═══════════════════════════════════════════════════════════════════
// 2. UTF-8 INTEGRITY
// ═══════════════════════════════════════════════════════════════════
console.log(header('2 · UTF-8 Integrity'));

const allFiles = [
  ...collectMd(memoryDir),
  ...collectMd(agentDir),
];

let utfIssues = 0;
allFiles.forEach(filePath => {
  try {
    const raw = fs.readFileSync(filePath);

    // BOM check (EF BB BF)
    if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
      console.log(row('warn', relPath(filePath), 'BOM DETECTED', 'UTF-8 BOM will cause parse issues'));
      warn(); utfIssues++;
    }

    // Null byte check
    if (raw.includes(0x00)) {
      console.log(row('err', relPath(filePath), 'NULL BYTES', 'file may be binary or corrupted'));
      err(); utfIssues++;
      return;
    }

    // UTF-8 replacement character (U+FFFD = EF BF BD)
    const text = raw.toString('utf-8');
    const repCount = (text.match(/\uFFFD/g) || []).length;
    if (repCount > 0) {
      console.log(row('err', relPath(filePath), `${repCount} REPLACEMENT CHAR(S)`, 'garbled UTF-8 detected'));
      err(); utfIssues++;
    }
  } catch (e) {
    console.log(row('err', relPath(filePath), 'READ ERROR', e.message));
    err(); utfIssues++;
  }
});

if (utfIssues === 0) {
  console.log(row('ok', 'UTF-8 encoding', 'CLEAN', `${allFiles.length} file(s) checked`));
  ok();
}

// ═══════════════════════════════════════════════════════════════════
// 3. LINE ENDING CONSISTENCY
// ═══════════════════════════════════════════════════════════════════
console.log(header('3 · Line Ending Consistency'));

let leIssues = 0;
allFiles.forEach(filePath => {
  try {
    const raw  = fs.readFileSync(filePath);
    const text = raw.toString('binary');
    const crlfCount = (text.match(/\r\n/g) || []).length;
    const lfCount   = (text.match(/(?<!\r)\n/g) || []).length;

    if (crlfCount > 0 && lfCount > 0) {
      console.log(row('warn', relPath(filePath), 'MIXED ENDINGS', `${crlfCount} CRLF + ${lfCount} LF`));
      warn(); leIssues++;
    }
  } catch { /* skip, already reported in UTF-8 check */ }
});

if (leIssues === 0) {
  console.log(row('ok', 'Line endings', 'CONSISTENT', `${allFiles.length} file(s) checked`));
  ok();
}

// ═══════════════════════════════════════════════════════════════════
// 4. ESM FACT SYNTAX VALIDATION
// ═══════════════════════════════════════════════════════════════════
console.log(header('4 · ESM Fact Syntax'));

// A well-formed fact: - [STATE] [FACT-NNN] content | Source: x | Verified: SN
const FACT_FULL  = /^-\s*\[(SUSPECTED|CONFIRMED|STALE|CONTRADICTED)\]\s*\[FACT-\d+\]\s*.+\|\s*Source:/i;
const FACT_BARE  = /^-\s*\[(SUSPECTED|CONFIRMED|STALE|CONTRADICTED)\]\s*\[FACT-\d+\]/i;

const memFiles = collectMd(memoryDir).filter(f => !f.endsWith('Rejection-Ledger.md'));
let malformedFacts = 0;

memFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
    content.split('\n').forEach((line, idx) => {
      if (FACT_BARE.test(line) && !FACT_FULL.test(line)) {
        console.log(row('warn', relPath(filePath), `line ${idx + 1}`, 'FACT missing Source: field'));
        warn(); malformedFacts++;
      }
    });
  } catch { /* skip */ }
});

if (malformedFacts === 0) {
  console.log(row('ok', 'ESM fact syntax', 'VALID', 'all facts have required fields'));
  ok();
}

// ═══════════════════════════════════════════════════════════════════
// 5. CRITICAL FILE EMPTINESS CHECK
// ═══════════════════════════════════════════════════════════════════
console.log(header('5 · Critical File Health'));

const CRITICAL = [
  path.join(memoryDir, 'App-Goal.md'),
  path.join(memoryDir, 'Stack.md'),
  path.join(memoryDir, 'rules.md'),
  path.join(memoryDir, 'Context-index.md'),
];

const PLACEHOLDER_PATTERNS = [
  /<!--\s*(Fill this|Add your|Describe what|Write your)/i,
  /<[A-Z_]+>/,   // <PLACEHOLDER>
  /\[Your /i,
];

let emptyCount = 0;
CRITICAL.forEach(filePath => {
  const name = path.basename(filePath);
  try {
    const raw     = fs.readFileSync(filePath, 'utf-8');
    const content = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/^#.+$/mg, '').replace(/\*\*Last-Modified.*$/mg, '').trim();

    if (content.length < 20) {
      console.log(row('warn', name, 'NEAR EMPTY', 'run a-mem init to populate'));
      warn(); emptyCount++;
    } else {
      // Check for unfilled placeholder patterns in original text
      const hasPlaceholder = PLACEHOLDER_PATTERNS.some(re => re.test(raw));
      if (hasPlaceholder) {
        console.log(row('warn', name, 'HAS PLACEHOLDERS', 'some fields not filled in'));
        warn(); emptyCount++;
      } else {
        console.log(row('ok', name, 'POPULATED'));
        ok();
      }
    }
  } catch {
    console.log(row('err', name, 'MISSING', 'run a-mem init to create'));
    err(); emptyCount++;
  }
});

// ── Summary ──────────────────────────────────────────────────────────────
console.log(summaryBar(passed, warnings, errors));

if (strict && errors > 0) {
  process.exit(1);
}
