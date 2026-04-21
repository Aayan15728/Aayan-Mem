#!/usr/bin/env node
/**
 * .Aayan-Mem CLI (a-mem) — v1.1.0
 * Zero external dependencies. Pure Node.js.
 * @author Aayan @license MIT
 */

const { execFileSync, spawnSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const toolsDir    = path.resolve(__dirname, '.Aayan-Mem', 'Agent', 'tools');
const agentDir    = path.resolve(__dirname, '.Aayan-Mem', 'Agent');
const memDir      = path.resolve(__dirname, '.Aayan-Mem', 'Memory-&-Context');
const projectRoot = __dirname; // a-mem.js lives at the project root

const VERSION = (() => {
  try { return fs.readFileSync(path.join(__dirname, 'VERSION'), 'utf-8').trim(); }
  catch { return '2.0.0'; }
})();

// Always-on ANSI (we are the parent process, directly on the user's TTY)
const BOLD='\x1b[1m', DIM='\x1b[2m', RESET='\x1b[0m';
const CYAN='\x1b[96m', GREEN='\x1b[92m', YELLOW='\x1b[93m';
const RED='\x1b[91m', MAGENTA='\x1b[95m', WHITE='\x1b[97m', GRAY='\x1b[90m';

function printBanner() {
  console.log('');
  console.log(`${CYAN}${BOLD}     █████╗    ███╗   ███╗███████╗███╗   ███╗${RESET}`);
  console.log(`${CYAN}${BOLD}    ██╔══██╗   ████╗ ████║██╔════╝████╗ ████║${RESET}`);
  console.log(`${CYAN}${BOLD}    ███████║   ██╔████╔██║█████╗  ██╔████╔██║${RESET}`);
  console.log(`${CYAN}${BOLD}    ██╔══██║   ██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║${RESET}`);
  console.log(`${CYAN}${BOLD}    ██║  ██║██╗██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║${RESET}`);
  console.log(`${CYAN}${BOLD}    ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝${RESET}`);
  console.log('');
  console.log(`${DIM}    .Aayan-Mem ${WHITE}v${VERSION}${RESET}`);
  console.log(`${DIM}    Zero Token Leak Memory Architecture${RESET}`);
  console.log(`${DIM}    ─────────────────────────────────────────${RESET}`);
  console.log('');
}

/**
 * spawnTool — for display-only commands (status, validate, coldstart, etc.)
 * Uses stdio:'inherit' so the child writes directly to the user's real TTY.
 * Colors render fully. Returns the exit code.
 */
function spawnTool(script, args = []) {
  const result = spawnSync(
    process.execPath,
    [path.join(toolsDir, script), ...args],
    {
      cwd: __dirname,
      stdio: 'inherit',           // direct TTY — ANSI colors work
      env: { ...process.env, FORCE_COLOR: '1' }
    }
  );
  if (result.error) {
    console.error(`\n  ${RED}${BOLD}✖  Could not launch ${script}${RESET}`);
    console.error(`  ${GRAY}${result.error.message}${RESET}\n`);
  }
  return result.status || 0;
}

/**
 * captureTool — for commands whose output we need to process (sync, etc.)
 * Returns stdout as string. Falls back to structured error message.
 */
function captureTool(script, args = []) {
  try {
    return execFileSync(process.execPath, [path.join(toolsDir, script), ...args], {
      cwd: __dirname, encoding: 'utf-8', stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
  } catch (e) {
    const stderr = (e.stderr || '').trim();
    const stdout = (e.stdout || '').trim();
    if (stdout) return stdout;
    return [
      `\n  ${RED}${BOLD}✖  Tool failed: ${script}${RESET}`,
      `  ${GRAY}Exit : ${e.status ?? 'unknown'}  |  ${e.code ?? e.message.split('\n')[0]}${RESET}`,
      stderr ? `  ${GRAY}Detail: ${stderr.split('\n')[0]}${RESET}` : '',
      `\n  ${GRAY}Tip: node ${path.join(toolsDir, script)} ${args.join(' ')}${RESET}\n`,
    ].filter(Boolean).join('\n');
  }
}

// ── Core commands ────────────────────────────────────────────────────────
function cmdFind(rawArgs) {
  let query = '', scope = 'all';
  const inIdx = rawArgs.indexOf('--in');
  if (inIdx !== -1) { scope = rawArgs[inIdx + 1] || 'all'; query = rawArgs.slice(0, inIdx).join(' '); }
  else { query = rawArgs.join(' '); }
  query = query.replace(/^["']|["']$/g, '');
  if (!query) { console.log(`\n  ${RED}✖  Missing query. Usage: a-mem find "term"${RESET}\n`); return; }
  spawnTool('search.js', [query, scope]);
}

function cmdColdstart(args) { spawnTool('coldstart.js', args || []); }
function cmdValidate()  { spawnTool('validate.js'); }
function cmdVerify()    { spawnTool('verify-paths.js'); }
function cmdStatus()    { spawnTool('status.js'); }
function cmdEsm()       { spawnTool('esm.js'); }

function cmdSync() {
  try {
    const { syncIndex } = require(path.join(toolsDir, 'sync-index.js'));
    const count = syncIndex();
    console.log(`\n  ${GREEN}✅ Decision index synced — ${count} session(s) indexed.${RESET}\n`);
  } catch (e) { console.log(`\n  ${RED}❌ Sync failed: ${e.message}${RESET}\n`); }
}

// ── New session ──────────────────────────────────────────────────────────
function cmdNew(rawArgs) {
  const title = rawArgs.join(' ').trim();
  if (!title) {
    console.log(`\n  ${RED}❌ Provide a title. Usage: .\\a-mem new "My task"${RESET}\n`);
    return;
  }
  const counterPath  = path.join(agentDir, 'session-counter.json');
  const templatePath = path.join(agentDir, 'session-template.md');
  const logsDir      = path.join(agentDir, 'decision-logs');
  try {
    const counter  = JSON.parse(fs.readFileSync(counterPath, 'utf-8'));
    const newNum   = (counter.lastSession || 0) + 1;
    const today    = new Date().toISOString().split('T')[0];
    const timeUTC  = new Date().toISOString().split('T')[1].split('.')[0];
    let template   = fs.readFileSync(templatePath, 'utf-8');
    template = template
      .replace(/Session \[X\]/g,    `Session ${newNum}`)
      .replace(/\[Title.*?\]/,       title)
      .replace('YYYY-MM-DD',         today)
      .replace('HH:MM:SS UTC',       `${timeUTC} UTC`);
    const logPath = path.join(logsDir, `session-${newNum}.md`);
    if (fs.existsSync(logPath)) {
      console.log(`\n  ${YELLOW}⚠️  session-${newNum}.md already exists.${RESET}\n`); return;
    }
    fs.writeFileSync(logPath, template);
    fs.writeFileSync(counterPath, JSON.stringify({ lastSession: newNum }, null, 2));
    const { syncIndex } = require(path.join(toolsDir, 'sync-index.js'));
    syncIndex();
    console.log(`\n  ${GREEN}✅ Session ${newNum} created: ${logPath}${RESET}`);
    console.log(`  ${DIM}→ Counter updated. Decision index auto-synced.${RESET}`);
    console.log(`\n  ${CYAN}Next: Fill Domain, Confidence, then run your simulation.${RESET}\n`);
  } catch (e) { console.log(`\n  ${RED}❌ Error: ${e.message}${RESET}\n`); }
}

// ── Close session ────────────────────────────────────────────────────────
function cmdClose(rawArgs) {
  const logsDir = path.join(agentDir, 'decision-logs');
  let num = rawArgs[0];
  if (!num) {
    try { num = JSON.parse(fs.readFileSync(path.join(agentDir, 'session-counter.json'), 'utf-8')).lastSession; }
    catch { console.log(`\n  ${RED}❌ Usage: .\\a-mem close [session-number]${RESET}\n`); return; }
  }
  const logPath = path.join(logsDir, `session-${num}.md`);
  if (!fs.existsSync(logPath)) {
    console.log(`\n  ${RED}❌ session-${num}.md not found.${RESET}\n`); return;
  }
  let content = fs.readFileSync(logPath, 'utf-8');
  const unchecked = (content.match(/- \[ \]/g) || []).length;
  if (unchecked > 0) {
    console.log(`\n  ${RED}❌ BLOCKED — ${unchecked} unchecked item(s) in Post-Implementation Verification.${RESET}`);
    console.log(`  ${DIM}Fill all [ ] boxes before closing the session.${RESET}\n`);
    return;
  }
  content = content.replace(`## SESSION [X] OVER ##`, `## SESSION ${num} OVER ##`);
  fs.writeFileSync(logPath, content);
  try {
    const { syncIndex } = require(path.join(toolsDir, 'sync-index.js'));
    syncIndex();
  } catch (e) { /* sync best-effort */ }
  console.log(`\n  ${GREEN}✅ Session ${num} closed and verified. Index auto-synced.${RESET}\n`);
}

// ── List files ───────────────────────────────────────────────────────────
function cmdList() {
  const logsDir = path.join(agentDir, 'decision-logs');
  console.log(`\n  ${CYAN}${BOLD}── Memory & Context Files ───────────────────${RESET}`);
  try {
    fs.readdirSync(memDir).filter(f => f.endsWith('.md')).forEach(f => {
      const size = `${fs.statSync(path.join(memDir, f)).size}B`.padStart(6);
      console.log(`  ${GREEN}  📄 ${f.padEnd(28)}${DIM}${size}${RESET}`);
    });
  } catch { console.log(`  ${RED}  Could not read Memory directory.${RESET}`); }

  console.log(`\n  ${CYAN}${BOLD}── Agent Files ──────────────────────────────${RESET}`);
  try {
    fs.readdirSync(agentDir).filter(f => !fs.statSync(path.join(agentDir,f)).isDirectory()).forEach(f => {
      const size = `${fs.statSync(path.join(agentDir, f)).size}B`.padStart(6);
      console.log(`  ${GREEN}  📋 ${f.padEnd(28)}${DIM}${size}${RESET}`);
    });
  } catch { /* skip */ }

  console.log(`\n  ${CYAN}${BOLD}── Decision Logs ────────────────────────────${RESET}`);
  try {
    fs.readdirSync(logsDir).filter(f => f.endsWith('.md')).forEach(f => {
      const content = fs.readFileSync(path.join(logsDir, f), 'utf-8');
      const status  = content.match(/\*\*Status:\*\*\s*(ACTIVE|REVOKED|SUPERSEDED)/i);
      const title   = content.match(/^#\s*(.+)/m);
      const icon    = status && status[1] === 'ACTIVE' ? '🟢' : '🔴';
      console.log(`  ${GREEN}  ${icon} ${f.padEnd(24)}${DIM}${title ? title[1] : ''}${RESET}`);
    });
  } catch { console.log(`  ${RED}  No decision logs found.${RESET}`); }
  console.log('');
}

// ── Decision timeline ────────────────────────────────────────────────────
function cmdLog() {
  const logsDir = path.join(agentDir, 'decision-logs');
  console.log(`\n  ${CYAN}${BOLD}── Decision Timeline ────────────────────────${RESET}\n`);
  try {
    fs.readdirSync(logsDir).filter(f => f.endsWith('.md')).sort().forEach(f => {
      const c       = fs.readFileSync(path.join(logsDir, f), 'utf-8');
      const title   = (c.match(/^#\s*(.+)/m)  || ['', f])[1];
      const date    = (c.match(/\*\*Date:\*\*\s*([^\n|]+)/) || ['','?'])[1].trim();
      const status  = (c.match(/\*\*Status:\*\*\s*(\w+)/i)  || ['','?'])[1];
      const conf    = (c.match(/\*\*Confidence:\*\*\s*(\w+)/i) || ['','?'])[1];
      const chosen  = (c.match(/\*\*Chosen Path:\*\*\s*(.+)/)  || ['','?'])[1].trim();
      const icon    = status === 'ACTIVE' ? `${GREEN}● ACTIVE${RESET}` :
                      status === 'REVOKED'? `${RED}● REVOKED${RESET}` : `${YELLOW}● ${status}${RESET}`;
      console.log(`  ${WHITE}${BOLD}${date}${RESET}  ${icon}  ${DIM}Confidence: ${conf}${RESET}`);
      console.log(`  ${CYAN}${title}${RESET}`);
      console.log(`  ${DIM}→ ${chosen}${RESET}\n`);
    });
  } catch { console.log(`  ${RED}No decision logs found.${RESET}\n`); }
}

// ── Init wizard ──────────────────────────────────────────────────────────

/** Auto-detect common project properties from disk before asking questions */
function autoDetect() {
  const hints = {};
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    hints.projectName = pkg.name || '';
    if (deps['next'])        hints.framework  = `Next.js ${deps['next'].replace(/[^0-9.]/g,'')}`;
    else if (deps['vite'])   hints.framework  = 'Vite';
    else if (deps['express'])hints.framework  = 'Express';
    else if (deps['remix'])  hints.framework  = 'Remix';
    if (deps['typescript'])  hints.language   = 'TypeScript';
    if (deps['tailwindcss']) hints.styling    = 'Tailwind CSS';
    if (deps['@supabase/supabase-js']) hints.database = 'Supabase';
    if (deps['prisma'] || deps['@prisma/client']) hints.database = (hints.database ? hints.database + ' + ' : '') + 'Prisma';
    if (deps['mongoose'])    hints.database   = 'MongoDB + Mongoose';
    if (pkg.scripts && pkg.scripts.build && pkg.scripts.build.includes('vercel')) hints.deployment = 'Vercel';
  } catch { /* no package.json */ }

  // Source dir detection
  if (fs.existsSync(path.join(projectRoot, 'src')))     hints.srcDir = '/src';
  else if (fs.existsSync(path.join(projectRoot, 'app'))) hints.srcDir = '/app';
  else if (fs.existsSync(path.join(projectRoot, 'lib'))) hints.srcDir = '/lib';

  // .env detection
  const envFiles = ['.env.local', '.env', '.env.development'];
  for (const e of envFiles) {
    if (fs.existsSync(path.join(projectRoot, e))) { hints.apiKeys = e; break; }
  }

  return hints;
}

function cmdInit() {
  printBanner();
  console.log(`  ${BOLD}${CYAN}Setup Wizard${RESET}`);
  console.log(`  ${DIM}Populate your Memory files. Press Enter to skip any field.${RESET}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a  = autoDetect();

  if (Object.keys(a).length > 0) {
    console.log(`  ${CYAN}${DIM}Auto-detected:${RESET}`);
    Object.entries(a).forEach(([k, v]) => console.log(`  ${DIM}  ${k}: ${GREEN}${v}${RESET}`));
    console.log(`  ${DIM}Press Enter to accept a detected value, or type to override.${RESET}\n`);
  }

  const questions = [
    // [key, prompt, section-header, hint-key]
    ['projectName',  'Project name',                              '── APP GOAL ──────────────────────────────', null],
    ['projectDesc',  'What are you building? (1-2 sentences)',    null, null],
    ['coreObj',      'Core objective (what MUST it do)',          null, null],
    ['nonGoal',      'What is explicitly OUT OF SCOPE',          null, null],
    ['framework',    'Framework (e.g., Next.js 14, Express)',     '── TECH STACK ────────────────────────────', 'framework'],
    ['language',     'Language (e.g., TypeScript)',               null, 'language'],
    ['styling',      'Styling (e.g., Tailwind CSS)',              null, 'styling'],
    ['database',     'Backend / DB (e.g., Supabase)',             null, 'database'],
    ['deployment',   'Deployment target (e.g., Vercel)',          null, 'deployment'],
    ['srcDir',       'Main source dir (e.g., /src)',              null, 'srcDir'],
    ['apiKeys',      'API keys file (e.g., .env.local)',          '── CONTEXT & RULES ───────────────────────', 'apiKeys'],
    ['neverUse',     'Libraries/tools to NEVER use (comma-sep)', null, null],
    ['colorMode',    'Color mode (dark / light / both)',          '── DESIGN ────────────────────────────────', null],
    ['primaryColor', 'Primary color (e.g., #818cf8)',             null, null],
    ['maxLines',     'Max lines per file (e.g., 200)',            '── CODE RULES ────────────────────────────', null],
    ['strictTypes',  'Strict typing rule (e.g., no `any`)',       null, null],
    ['testCmd',      'Test command (e.g., npm test)',             null, null],
  ];

  // Keep a ref to pre-detected values so we show them as suggestions
  const detected = { ...a };

  let i = 0;
  function next() {
    if (i >= questions.length) { rl.close(); writeMemory(); return; }
    const [key, prompt, hdr] = questions[i++];
    if (hdr) console.log(`\n  ${CYAN}${hdr}${RESET}`);
    const hint = detected[key] ? ` ${DIM}[${detected[key]}]${RESET}` : '';
    rl.question(`  ${CYAN}?${RESET} ${prompt}${hint}: `, ans => {
      const val = ans.trim();
      // If user presses Enter and we have a detected value, use it
      if (!val && detected[key]) { /* keep existing a[key] */ }
      else if (val) a[key] = val;
      // else leave blank
      next();
    });
  }
  next();

  function writeMemory() {
    const today  = new Date().toISOString().split('T')[0];
    const projName = a.projectName || 'My Project';
    const srcDir   = a.srcDir || '/src';
    const lang     = a.language || 'TypeScript';
    const fw       = a.framework || '';
    const db       = a.database || '';
    const style    = a.styling || '';
    const deploy   = a.deployment || '';

    // ── ESM facts for Stack.md (CONFIRMED at Session 0, auto-detected = trusted) ──
    let factN = 1;
    const stackFacts = [];
    const fmt = (content, source, deps = '') =>
      `- [CONFIRMED] [FACT-00${factN++}] ${content} | Source: ${source} | Verified: S0 | Deps: [${deps}]`;

    if (fw)     stackFacts.push(fmt(`Framework is ${fw}`,      'package.json#dependencies'));
    if (lang)   stackFacts.push(fmt(`Language is ${lang}`,     lang === 'TypeScript' ? 'tsconfig.json' : 'package.json'));
    if (style)  stackFacts.push(fmt(`Styling system is ${style}`, 'package.json#devDependencies', stackFacts.length > 0 ? `FACT-00${factN-2}` : ''));
    if (db)     stackFacts.push(fmt(`Backend/DB is ${db}`,     'package.json#dependencies'));
    if (deploy) stackFacts.push(fmt(`Deployment target is ${deploy}`, 'init-wizard'));
    stackFacts.push(fmt(`Main source directory is ${srcDir}`, 'init-wizard'));

    // ── ESM facts for rules.md ──
    const ruleFacts = [];
    if (a.maxLines)    ruleFacts.push(fmt(`Max lines per file: ${a.maxLines}`, 'init-wizard'));
    if (a.strictTypes) ruleFacts.push(fmt(a.strictTypes, 'init-wizard'));
    if (a.testCmd)     ruleFacts.push(fmt(`Test command: ${a.testCmd}`, 'package.json#scripts'));

    // ── ESM facts for context ──
    const ctxFacts = [];
    if (a.apiKeys)  ctxFacts.push(fmt(`API keys stored in ${a.apiKeys} — never commit`, 'init-wizard'));
    if (a.neverUse) a.neverUse.split(',').map(s => s.trim()).filter(Boolean).forEach(lib => {
      ctxFacts.push(fmt(`FORBIDDEN: ${lib} — do not use or suggest`, 'init-wizard'));
    });

    // ── Neveruse as rejections ──
    const rejLines = [];
    if (a.neverUse) a.neverUse.split(',').map(s => s.trim()).filter(Boolean).forEach((lib, idx) => {
      rejLines.push(`- [REJ-00${idx + 1}] ${lib} | Reason: Explicitly banned during init by developer | Session: 0 | Unblock: Developer explicitly re-enables it`);
    });

    // ─────────────────────────────────────────────────────────────────────
    // App-Goal.md
    const appGoal = [
      `# Application Goal: ${projName}`,
      `**Last-Modified-By:** init-wizard | **Last-Modified-Session:** 0`,
      '',
      `## What We Are Building`,
      a.projectDesc || `${projName} — fill in a 1-2 sentence description.`,
      '',
      `## Core Objective`,
      a.coreObj ? `> ${a.coreObj}` : '> [Define the single most important thing this system must do.]',
      '',
      a.nonGoal ? `## Explicitly Out Of Scope\n> ${a.nonGoal}` : '',
      '',
      '## Changelog',
      `- [Session 0] Initialized by a-mem init wizard on ${today}.`,
    ].filter(l => l !== undefined).join('\n');

    // Stack.md
    const stackLines = [
      `# Core Stack & Project Structure`,
      `**Last-Modified-By:** init-wizard | **Last-Modified-Session:** 0`,
      '',
      '## ESM Facts  *(machine-readable — do not edit format)*',
      ...stackFacts,
      '',
      '## Human Summary',
      fw     ? `- **Framework:**   ${fw}` : '',
      lang   ? `- **Language:**    ${lang}` : '',
      style  ? `- **Styling:**     ${style}` : '',
      db     ? `- **Backend/DB:**  ${db}` : '',
      deploy ? `- **Deployment:**  ${deploy}` : '',
      '',
      '**Directory Map:**',
      `- \`${srcDir}\`  Core source code`,
      a.apiKeys ? `- \`${a.apiKeys}\`  Environment variables — NEVER commit` : '',
      '',
      '## Changelog',
      `- [Session 0] Initialized by a-mem init wizard on ${today}.`,
    ].filter(l => l !== undefined && l !== '').join('\n');

    // Context-index.md
    const context = [
      `# Context Pointers & Active Constraints`,
      `**Last-Modified-By:** init-wizard | **Last-Modified-Session:** 0`,
      '',
      ctxFacts.length > 0 ? '## ESM Facts  *(machine-readable)*' : '',
      ...ctxFacts,
      '',
      '## Constraints',
      a.apiKeys  ? `- **Secrets:** \`${a.apiKeys}\` — contains API keys, never commit or log.` : '',
      a.neverUse ? `- **Banned:**  ${a.neverUse} — do not suggest or import.` : '',
      a.nonGoal  ? `- **Non-goal:** ${a.nonGoal}` : '',
      '',
      '## Changelog',
      `- [Session 0] Initialized by a-mem init wizard on ${today}.`,
    ].filter(l => l !== undefined).join('\n');

    // Design-Guidelines.md
    const design = [
      `# Design & UI Guidelines`,
      `**Last-Modified-By:** init-wizard | **Last-Modified-Session:** 0`,
      '',
      a.colorMode    ? `- **Color Mode:**    ${a.colorMode}` : '',
      a.primaryColor ? `- **Primary Color:** ${a.primaryColor}` : '',
      a.colorMode || a.primaryColor ? '' : '- [Fill in design system details — e.g., typography, spacing, color tokens]',
      '',
      '## Changelog',
      `- [Session 0] Initialized by a-mem init wizard on ${today}.`,
    ].filter(l => l !== undefined).join('\n');

    // rules.md
    const rulesLines = [
      `# Measurable Execution Rules`,
      `**Last-Modified-By:** init-wizard | **Last-Modified-Session:** 0`,
      '',
      ruleFacts.length > 0 ? '## ESM Facts  *(machine-readable)*' : '',
      ...ruleFacts,
      '',
      '## Rules',
      a.maxLines    ? `1. No single file shall exceed **${a.maxLines} lines**.` : '1. Keep files focused and under a reasonable line limit.',
      a.strictTypes ? `2. **${a.strictTypes}** — enforced in all files.` : '2. Use strict typing. Avoid `any` or equivalent.',
      `3. Every Tier 2/3 decision requires a session log entry before implementation.`,
      `4. Run \`a-mem validate\` after every Memory file update.`,
      `5. Run \`a-mem verify\` before referencing any file path in code.`,
      a.testCmd ? `6. Test command: \`${a.testCmd}\` — run before closing any session.` : '',
      '',
      '## Changelog',
      `- [Session 0] Initialized by a-mem init wizard on ${today}.`,
    ].filter(l => l !== undefined && l !== '').join('\n');

    // Rejection-Ledger.md  (bootstrap with any neverUse entries)
    const rejContent = [
      `# Rejection Ledger`,
      `**Last-Modified-By:** init-wizard | **Last-Modified-Session:** 0`,
      '',
      '<!-- FORMAT: - [REJ-NNN] <what> | Reason: <why> | Session: <N> | Unblock: <condition> -->',
      '',
      ...rejLines,
      rejLines.length === 0 ? '<!-- No rejections recorded yet. -->' : '',
      '',
      '## Changelog',
      `- [Session 0] Initialized by a-mem init wizard on ${today}.`,
    ].filter(l => l !== undefined).join('\n');

    const writes = [
      ['App-Goal.md',          appGoal],
      ['Stack.md',             stackLines],
      ['Context-index.md',     context],
      ['Design-Guidelines.md', design],
      ['rules.md',             rulesLines],
      ['Rejection-Ledger.md',  rejContent],
    ];

    console.log('');
    let nok = 0;
    writes.forEach(([file, content]) => {
      try {
        fs.writeFileSync(path.join(memDir, file), content, { encoding: 'utf8' });
        const factCount = (content.match(/\[FACT-\d+\]/g) || []).length;
        const extra = factCount > 0 ? `  ${DIM}(${factCount} ESM fact${factCount !== 1 ? 's' : ''})${RESET}` : '';
        console.log(`  ${GREEN}${BOLD}  ${file}${RESET}${extra}`);
        nok++;
      } catch (e) {
        console.log(`  ${RED}  Failed: ${file} — ${e.message}${RESET}`);
      }
    });

    const totalFacts = stackFacts.length + ruleFacts.length + ctxFacts.length;
    console.log(`\n  ${BOLD}${GREEN}Setup complete!${RESET}  ${nok}/6 files written  ·  ${totalFacts} ESM facts seeded`);
    console.log(`  ${DIM}Run  a-mem coldstart  to see your first full briefing.${RESET}`);
    console.log(`  ${DIM}Run  a-mem integrity  to verify file health.${RESET}\n`);
  }
}

// ── Help ─────────────────────────────────────────────────────────────────
function printHelp() {
  printBanner();
  console.log(`  ${BOLD}USAGE${RESET}`);
  console.log(`    ${GREEN}.\\a-mem${RESET}                         ${DIM}Interactive mode${RESET}`);
  console.log(`    ${GREEN}.\\a-mem ${CYAN}<command>${RESET} ${DIM}[args]${RESET}           ${DIM}Direct execution${RESET}`);
  console.log('');
  console.log(`  ${BOLD}SETUP${RESET}`);
  console.log(`    ${GREEN}init${RESET}                            ${DIM}Wizard — populate all Memory files${RESET}`);
  console.log('');
  console.log(`  ${BOLD}SESSIONS${RESET}`);
  console.log(`    ${GREEN}new ${CYAN}"title"${RESET}                   ${DIM}Create session log + auto-sync index${RESET}`);
  console.log(`    ${GREEN}close ${CYAN}[N]${RESET}                    ${DIM}Close session N (blocks if checklist incomplete)${RESET}`);
  console.log(`    ${GREEN}sync${RESET}                            ${DIM}Rebuild decision-index.md from all logs${RESET}`);
  console.log('');
  console.log(`  ${BOLD}SEARCH${RESET}`);
  console.log(`    ${GREEN}find ${CYAN}"term"${RESET}                    ${DIM}Search all .Aayan-Mem files${RESET}`);
  console.log(`    ${GREEN}find ${CYAN}"term" --in memory${RESET}        ${DIM}Search only Memory-&-Context${RESET}`);
  console.log(`    ${GREEN}find ${CYAN}"term" --in decisions${RESET}     ${DIM}Search only decision logs${RESET}`);
  console.log(`    ${GREEN}find ${CYAN}"term" --in rejections${RESET}    ${DIM}Search only Rejection-Ledger.md${RESET}`);
  console.log(`    ${GREEN}find ${CYAN}"term" --in stack${RESET}         ${DIM}Search only Stack.md${RESET}`);
  console.log(`    ${GREEN}find ${CYAN}"term" --in ui${RESET}            ${DIM}Search only Design-Guidelines.md${RESET}`);
  console.log(`    ${GREEN}find ${CYAN}"term" --in goals${RESET}         ${DIM}Search only App-Goal.md${RESET}`);
  console.log('');
  console.log(`  ${BOLD}DIAGNOSTICS${RESET}`);
  console.log(`    ${GREEN}coldstart${RESET}                       ${DIM}Full session briefing + belief state + rejections${RESET}`);
  console.log(`    ${GREEN}coldstart ${CYAN}"topic"${RESET}              ${DIM}Topic-filtered briefing (only matching facts)${RESET}`);
  console.log(`    ${GREEN}esm${RESET}                             ${DIM}Epistemic State Machine report${RESET}`);
  console.log(`    ${GREEN}validate${RESET}                        ${DIM}Witness + Deps + contradictions scan${RESET}`);
  console.log(`    ${GREEN}verify${RESET}                          ${DIM}Check if referenced paths exist on disk${RESET}`);
  console.log(`    ${GREEN}verify --scan-logs${RESET}              ${DIM}Also scan decision logs for path refs${RESET}`);
  console.log(`    ${GREEN}integrity${RESET}                       ${DIM}UTF-8 · line endings · ESM syntax · version check${RESET}`);
  console.log(`    ${GREEN}status${RESET}                          ${DIM}Full system health dashboard${RESET}`);
  console.log('');
  console.log(`  ${BOLD}NAVIGATION${RESET}`);
  console.log(`    ${GREEN}list${RESET}                            ${DIM}List all Memory + Agent files${RESET}`);
  console.log(`    ${GREEN}log${RESET}                             ${DIM}Decision timeline${RESET}`);
  console.log(`    ${GREEN}help${RESET}                            ${DIM}Show this help${RESET}`);
  console.log('');
  console.log(`  ${BOLD}EXAMPLES${RESET}`);
  console.log(`    ${DIM}.\\a-mem init${RESET}`);
  console.log(`    ${DIM}.\\a-mem new "Set up authentication"${RESET}`);
  console.log(`    ${DIM}.\\a-mem coldstart auth${RESET}`);
  console.log(`    ${DIM}.\\a-mem find "supabase|auth"${RESET}`);
  console.log(`    ${DIM}.\\a-mem find "prisma" --in rejections${RESET}`);
  console.log(`    ${DIM}.\\a-mem esm${RESET}`);
  console.log(`    ${DIM}.\\a-mem close 3${RESET}`);
  console.log('');
}

// ── Interactive Shell ────────────────────────────────────────────────────
function startShell() {
  printBanner();
  console.log(`  ${BOLD}Quick Start${RESET}`);
  console.log('');
  console.log(`    ${GREEN}init${RESET}                     ${DIM}Set up Memory files (first time)${RESET}`);
  console.log(`    ${GREEN}coldstart${RESET}                ${DIM}Initialize session${RESET}`);
  console.log(`    ${GREEN}new ${CYAN}"title"${RESET}            ${DIM}Create session log${RESET}`);
  console.log(`    ${GREEN}close ${CYAN}[N]${RESET}             ${DIM}Close & verify session${RESET}`);
  console.log(`    ${GREEN}sync${RESET}                     ${DIM}Rebuild decision index${RESET}`);
  console.log(`    ${GREEN}find ${CYAN}"term"${RESET}            ${DIM}Search memory files${RESET}`);
  console.log(`    ${GREEN}status${RESET}                   ${DIM}System health${RESET}`);
  console.log(`    ${GREEN}log${RESET}                      ${DIM}Decision timeline${RESET}`);
  console.log(`    ${GREEN}help${RESET}                     ${DIM}All commands${RESET}`);
  console.log(`    ${GREEN}exit${RESET}                     ${DIM}Quit${RESET}`);
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `  ${MAGENTA}${BOLD}a-mem ${RESET}${DIM}›${RESET} `,
  });
  rl.prompt();

  rl.on('line', line => {
    const parts = line.trim().split(/\s+/);
    const cmd   = parts[0] ? parts[0].toLowerCase() : '';
    const args  = parts.slice(1);
    if (!cmd) { rl.prompt(); return; }

    switch (cmd) {
      case 'find': case 'search':   cmdFind(args);      break;
      case 'coldstart': case 'cold':cmdColdstart(args); break;
      case 'esm':                   cmdEsm();           break;
      case 'validate':              cmdValidate();      break;
      case 'verify':                spawnTool('verify-paths.js', args); break;
      case 'integrity':             spawnTool('integrity.js', args);    break;
      case 'status':                cmdStatus();        break;
      case 'list': case 'ls':       cmdList();          break;
      case 'log': case 'timeline':  cmdLog();           break;
      case 'sync':                  cmdSync();          break;
      case 'new':                   cmdNew(args);       break;
      case 'close':                 cmdClose(args);     break;
      case 'init':                  cmdInit();          return; // init manages its own rl
      case 'help': case '?':        printHelp();        break;
      case 'clear': case 'cls':     console.clear(); printBanner(); break;
      case 'exit': case 'quit': case 'q':
        console.log(`\n  ${DIM}👋 Goodbye.${RESET}\n`);
        rl.close(); process.exit(0); return;
      default:
        console.log(`\n  ${RED}❌ Unknown command: "${cmd}". Type ${GREEN}help${RED} for options.${RESET}\n`);
    }
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

// ── Main ─────────────────────────────────────────────────────────────────
const command = process.argv[2];
if      (!command)                              startShell();
else if (command === 'help' || command === '--help') printHelp();
else if (command === 'find' || command === 'search') cmdFind(process.argv.slice(3));
else if (command === 'coldstart' || command === 'cold') cmdColdstart(process.argv.slice(3));
else if (command === 'validate')                cmdValidate();
else if (command === 'verify')                  spawnTool('verify-paths.js', process.argv.slice(3));
else if (command === 'integrity')               spawnTool('integrity.js', process.argv.slice(3));
else if (command === 'status')                  cmdStatus();
else if (command === 'esm')                     cmdEsm();
else if (command === 'list' || command === 'ls') cmdList();
else if (command === 'log'  || command === 'timeline') cmdLog();
else if (command === 'sync')                    cmdSync();
else if (command === 'new')                     cmdNew(process.argv.slice(3));
else if (command === 'close')                   cmdClose(process.argv.slice(3));
else if (command === 'init')                    cmdInit();
else {
  console.log(`\n  ${RED}❌ Unknown command: "${command}"${RESET}\n`);
  printHelp();
  process.exit(1);
}
