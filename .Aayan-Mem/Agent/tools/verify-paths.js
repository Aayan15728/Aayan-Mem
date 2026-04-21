/**
 * verify-paths.js — File Path Existence Checker (v3)
 *
 * Extracts every backtick-wrapped file path from Memory-&-Context files
 * and optionally decision logs (--scan-logs flag) then verifies each
 * one exists on disk.
 *
 * Supports both Unix (/src/hooks) and Windows (.\src\hooks, src\hooks) paths.
 *
 * Usage:
 *   node verify-paths.js              → check Memory files only
 *   node verify-paths.js --scan-logs  → also scan decision-logs
 *
 * @author Aayan  @license MIT
 */

const fs   = require('fs');
const path = require('path');
const {
  RESET, DIM, CYAN, GREEN, YELLOW, RED,
  OK, WARN, ERR, INFO,
  header, banner, summaryBar, statusLine, row
} = require('./ui');

const memoryDir   = path.resolve(__dirname, '..', '..', 'Memory-&-Context');
const logsDir     = path.resolve(__dirname, '..', 'decision-logs');
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const scanLogs    = process.argv.includes('--scan-logs');

/**
 * Path detection strategy:
 * Capture all backtick spans, then filter by shape.
 *
 * Covers all forms:
 *   /src/hooks/useUser.ts          Unix absolute
 *   ./src/hooks/useUser.ts         Unix relative
 *   ../lib/utils.ts                Unix parent-relative
 *   src/hooks/useUser.ts           bare Unix (no leading .)
 *   src\hooks\useUser.ts           bare Windows
 *   .\src\hooks\useUser.ts         Windows relative
 *   .env.local                     dotfiles at root
 */
const BACKTICK_RE = /`([^`\n]{2,120})`/g;

function classifyPath(raw) {
  const s = raw.trim();
  const hasSep    = /[/\\]/.test(s);
  const isDotFile = /^\.[a-zA-Z]/.test(s) && !s.includes(' ');
  if (!hasSep && !isDotFile) return null;
  // Reject: URLs, Windows absolute drive paths (C:\...), strings with spaces, too long
  if (/^https?:\/\//i.test(s))        return null;
  if (/^[a-zA-Z]:[/\\]/i.test(s))     return null;  // skip full OS-absolute refs
  if (/\s/.test(s))                   return null;
  if (s.length > 200)                 return null;
  if (!/[a-zA-Z0-9_-]/.test(s))      return null;
  return s;
}

let found = 0, missing = 0, skipped = 0;
let passed = 0, warnings = 0, errors = 0;
const track = (ok) => { if (ok === true) passed++; else if (ok === 'warn') warnings++; else errors++; };

function checkFile(filePath, tag = '') {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/<!--[\s\S]*?-->/g, '');
    let m;
    BACKTICK_RE.lastIndex = 0;
    while ((m = BACKTICK_RE.exec(content)) !== null) {
      const candidate = classifyPath(m[1]);
      if (!candidate) continue;
      const normalised = candidate.replace(/[/\\]/g, path.sep);
      const fullPath   = path.resolve(projectRoot, normalised);
      const exists     = fs.existsSync(fullPath);
      const label      = tag ? `${candidate}  ${DIM}[${tag}]${RESET}` : candidate;
      if (exists) {
        console.log(statusLine(label, true, ''));
        found++; track(true);
      } else {
        console.log(statusLine(label, false, 'not found on disk'));
        missing++; track(false);
      }
    }
  } catch (e) {
    console.log(`  ${ERR}  ${RED}Cannot read ${path.basename(filePath)}: ${e.message}${RESET}`);
    skipped++; track(false);
  }
}


console.log(banner('verify-paths', `Hallucination Guard · project root: ${projectRoot}`));

// ── Memory files ─────────────────────────────────────────────────────────
console.log(header('Memory-&-Context'));
try {
  const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    console.log(`  ${INFO}  ${DIM}No memory files found.${RESET}`);
  } else {
    files.forEach(f => checkFile(path.join(memoryDir, f), f));
  }
} catch (e) {
  console.log(`  ${ERR}  ${RED}Cannot read Memory directory: ${e.message}${RESET}`);
  track(false);
}

// ── Decision logs (optional) ─────────────────────────────────────────────
if (scanLogs) {
  console.log(header('Decision Logs  [--scan-logs]'));
  try {
    const logs = fs.readdirSync(logsDir).filter(f => f.endsWith('.md'));
    if (logs.length === 0) {
      console.log(`  ${INFO}  ${DIM}No decision logs found.${RESET}`);
    } else {
      logs.forEach(f => {
        try {
          const c = fs.readFileSync(path.join(logsDir, f), 'utf-8');
          if (c.includes('THIS IS AN EXAMPLE SESSION LOG')) { skipped++; return; }
        } catch { /* fall through */ }
        checkFile(path.join(logsDir, f), f);
      });
    }
  } catch (e) {
    console.log(`  ${ERR}  ${RED}Cannot read decision-logs: ${e.message}${RESET}`);
    track(false);
  }
}

// ── Summary ──────────────────────────────────────────────────────────────
if (found === 0 && missing === 0) {
  console.log(`\n  ${INFO}  ${DIM}No file path references found in scanned files.${RESET}`);
}
console.log(summaryBar(passed, warnings, errors));
if (missing > 0) {
  console.log(`  ${DIM}Tip: ${missing} path(s) missing on disk. Memory may be aspirational, not factual.\n  Run ${RESET}a-mem validate${DIM} to check for related contradictions.${RESET}\n`);
}
