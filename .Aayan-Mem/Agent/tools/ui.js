/**
 * ui.js — A.MEM CLI Design System v2
 *
 * High-contrast, modern terminal layout.
 * TTY-aware: ANSI auto-disabled in pipes / CI.
 *
 * @author Aayan  @license MIT
 */

const isTTY = process.stdout.isTTY || process.env.FORCE_COLOR === '1';
const c = (code) => isTTY ? `\x1b[${code}m` : '';

// ── Raw codes ────────────────────────────────────────────────────────────
const RESET   = c(0);
const BOLD    = c(1);
const DIM     = c(2);
const ITALIC  = c(3);

// Foreground colours (bright variants for better visibility)
const BLACK   = c(30);
const RED     = c(91);   // bright red
const GREEN   = c(92);   // bright green
const YELLOW  = c(93);   // bright yellow
const BLUE    = c(34);
const MAGENTA = c(95);   // bright magenta
const CYAN    = c(96);   // bright cyan
const WHITE   = c(97);   // bright white
const GRAY    = c(90);   // dark gray (dim text)

// Background
const BG_GREEN  = c('42;30');
const BG_RED    = c('41;97');
const BG_YELLOW = c('43;30');
const BG_CYAN   = c('46;30');
const BG_GRAY   = c('100;97');

// ── Semantic tokens ──────────────────────────────────────────────────────
// Status badges — visible, boxed, high contrast
const TAG_OK   = isTTY ? `\x1b[42;30m OK  \x1b[0m` : ' OK ';
const TAG_WARN = isTTY ? `\x1b[43;30m WARN\x1b[0m` : 'WARN';
const TAG_ERR  = isTTY ? `\x1b[41;97m ERR \x1b[0m` : ' ERR';
const TAG_INFO = isTTY ? `\x1b[100;97m INFO\x1b[0m` : 'INFO';
const TAG_SKIP = isTTY ? `\x1b[2m    –   \x1b[0m` : '  –  ';
const TAG_DENY = isTTY ? `\x1b[41;97m REJ \x1b[0m` : ' REJ';

// Compact inline icons for row context (after the tag)
const OK   = GREEN  + '✔' + RESET;
const WARN = YELLOW + '!' + RESET;
const ERR  = RED    + '✖' + RESET;
const INFO = CYAN   + 'i' + RESET;
const DENY = RED    + '✖' + RESET;

// ── Layout ───────────────────────────────────────────────────────────────
const WIDTH = 58;

// Thin separator
const SEP   = GRAY + '─'.repeat(WIDTH) + RESET;
// Thick separator  
const DSEP  = GRAY + '━'.repeat(WIDTH) + RESET;

// ── Core helpers ─────────────────────────────────────────────────────────

/** Strip ANSI codes for plain-text length calculations */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Left-pad a string to `len` visible characters */
function rpad(str, len) {
  const vis = stripAnsi(str);
  return str + ' '.repeat(Math.max(0, len - vis.length));
}

// ── Builders ─────────────────────────────────────────────────────────────

/**
 * Top-level command banner.
 * 
 *   A.MEM  system status
 *   Full health check across all A.MEM subsystems
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
function banner(command, subtitle) {
  const lines = [
    '',
    BOLD + CYAN + '  A.MEM' + RESET + '  ' + BOLD + WHITE + command + RESET,
  ];
  if (subtitle) lines.push(GRAY + '  ' + subtitle + RESET);
  lines.push('  ' + DSEP);
  return lines.join('\n');
}

/**
 * Numbered section header.
 *
 *   ── 1 · Session Overview ──────────────────────────────────
 */
function header(title) {
  const label = '  ' + BOLD + CYAN + title + RESET + '  ';
  const visLen = stripAnsi(label);
  const fill = Math.max(0, WIDTH - visLen.length + 2);
  return '\n' + GRAY + '─' + RESET + label + GRAY + '─'.repeat(fill) + RESET;
}

/**
 * A status row with a boxed badge on the left.
 *
 *   [OK  ]  label text          value text
 *   [WARN]  label text          detail
 *   [ERR ]  label text          error detail
 *
 * @param {'ok'|'warn'|'err'|'info'|'skip'} state
 * @param {string} label
 * @param {string} [value]   — right side, coloured by state
 * @param {string} [detail]  — optional dim sub-text on same line
 */
function row(state, label, value = '', detail = '') {
  const badge = { ok: TAG_OK, warn: TAG_WARN, err: TAG_ERR, info: TAG_INFO, skip: TAG_SKIP }[state] || TAG_INFO;
  const valueColor = { ok: GREEN + BOLD, warn: YELLOW + BOLD, err: RED + BOLD, info: WHITE }[state] || WHITE;
  const lbl  = rpad(GRAY + label + RESET, 32 + (isTTY ? 10 : 0));
  const val  = value  ? valueColor + value + RESET : '';
  const det  = detail ? '  ' + GRAY + detail + RESET : '';
  return `  ${badge}  ${lbl}${val}${det}`;
}

/**
 * A key → value info row (no badge, no status — pure data).
 *
 *   label          value
 */
function kv(label, value, valueColor) {
  const vc  = valueColor || WHITE;
  const lbl = rpad(GRAY + label + RESET, 32 + (isTTY ? 10 : 0));
  return `         ${lbl}${vc}${BOLD}${value}${RESET}`;
}

/**
 * Indented sub-item under a row.
 *
 *         → detail text
 */
function sub(text, color) {
  const col = color || GRAY;
  return `            ${col}→  ${text}${RESET}`;
}

/**
 * Final summary bar.
 *
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *     5 passed   1 warning   0 errors
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
function summaryBar(passed, warnings, errors) {
  const parts = [];
  if (passed   > 0) parts.push(BG_GREEN  + ` ${passed} passed `   + RESET);
  if (warnings > 0) parts.push(BG_YELLOW + ` ${warnings} warning${warnings !== 1 ? 's' : ''} ` + RESET);
  if (errors   > 0) parts.push(BG_RED    + ` ${errors} error${errors !== 1 ? 's' : ''} `   + RESET);

  const overall = errors > 0 ? RED + BOLD + '  FAILED' + RESET
                : warnings > 0 ? YELLOW + BOLD + '  PASSED WITH WARNINGS' + RESET
                : GREEN + BOLD + '  ALL CHECKS PASSED' + RESET;

  return [
    '\n  ' + DSEP,
    '  ' + parts.join('  '),
    '  ' + overall,
    '  ' + DSEP + '\n',
  ].join('\n');
}

/**
 * Section divider (thin, within a section).
 */
function divider() {
  return '  ' + SEP;
}

module.exports = {
  // Raw codes
  RESET, BOLD, DIM, ITALIC, GRAY,
  RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE,
  BG_GREEN, BG_RED, BG_YELLOW, BG_CYAN, BG_GRAY,
  // Semantic
  TAG_OK, TAG_WARN, TAG_ERR, TAG_INFO, TAG_SKIP, TAG_DENY,
  OK, WARN, ERR, INFO, DENY,
  // Layout
  WIDTH, SEP, DSEP,
  // Builders
  stripAnsi, rpad, banner, header, kv, row, sub, summaryBar, divider,
  // Compat aliases used by other tools
  LINE: SEP, DLINE: DSEP,
  statusLine: (label, ok, msg) => row(ok === true ? 'ok' : ok === false ? 'err' : ok === 'warn' ? 'warn' : 'info', label, msg || ''),
};
