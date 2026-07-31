#!/usr/bin/env node
/*
 * style-lint.cjs — deterministic checker for the mechanically-verifiable subset
 * of each `--style` house guide, plus the repo's own AIDetector score.
 *
 * Usage: node evals/style-lint.cjs <file.md> [--style google|cmos|apa] [--json]
 *
 * It does NOT judge register/voice (that needs an LLM — see judge-eval.wf.js).
 * Each style is checked against ITS OWN guide: Google wants straight quotes,
 * sentence-case headings, and numerals for small numbers; CMOS wants the
 * opposite (curly quotes, title case, spelled-out numbers, deliberate em dash).
 * Running the wrong mode on the wrong output produces false violations — that is
 * the point of the mode switch.
 *
 * Advisory rules (marked [advisory]) are heuristic and expected to be noisy;
 * they are reported but a human should confirm. Exit code is non-zero only when
 * a NON-advisory violation is found.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const styleIdx = args.indexOf('--style');
const style = styleIdx >= 0 ? args[styleIdx + 1] : 'google';
const file = args.find((a) => !a.startsWith('--') && a !== style);
if (!file || !['google', 'cmos', 'apa'].includes(style)) {
  console.error('usage: style-lint.cjs <file> [--style google|cmos|apa] [--json]');
  process.exit(2);
}

const DETECTOR = process.env.DETECTOR_PATH || path.join(__dirname, '..', 'detector', 'patterns.js');
const AIDetector = fs.existsSync(DETECTOR) ? require(DETECTOR) : null;

const text = fs.readFileSync(file, 'utf8');
const lines = text.split('\n');

// Strip fenced code blocks and inline code so mechanics don't false-positive on code.
let inFence = false;
const proseLines = lines.map((l) => {
  if (/^\s*```/.test(l)) { inFence = !inFence; return ''; }
  if (inFence) return '';
  return l.replace(/`[^`]*`/g, '');
});
const prose = proseLines.join('\n');
const wordCount = (prose.match(/\b\w+\b/g) || []).length;

const findings = [];
const add = (rule, line, detail, advisory = false) => findings.push({ rule, line, detail, advisory });

const SMALL_WORDS = new Set(['a','an','and','as','at','but','by','for','in','of','on','or','the','to','with','vs','nor','so','yet']);
const isTitleCaseHeading = (h) => {
  const words = h.replace(/[*_`]/g, '').trim().split(/\s+/);
  if (words.length < 2) return false;
  let capNonFirst = 0;
  words.slice(1).forEach((w) => {
    const bare = w.replace(/[^A-Za-z]/g, '');
    if (!bare || bare === bare.toUpperCase()) return;   // acronym / all-caps
    if (SMALL_WORDS.has(bare.toLowerCase())) return;
    if (/^[A-Z]/.test(bare)) capNonFirst += 1;
  });
  return capNonFirst >= 2;
};

// ---------- shared checks ----------
proseLines.forEach((l, i) => {
  if (/\bclick here\b/i.test(l) || /\[here\]\(/i.test(l)) add('here-link-text', i + 1, l.trim().slice(0, 70));
});

// ---------- Google mode ----------
if (style === 'google') {
  proseLines.forEach((l, i) => { if (/[“”‘’]/.test(l)) add('curly-quotes', i + 1, l.trim().slice(0, 70)); });
  const em = (prose.match(/—/g) || []).length;
  if (em > Math.max(1, Math.floor(wordCount / 400))) add('em-dash-overuse', 0, `${em} em dashes in ${wordCount} words`);
  proseLines.forEach((l, i) => {
    const m = l.match(/\b(simply|just|easily|obviously)\b|\bof course\b/gi);
    if (m) add('dismissive-word', i + 1, m.join(', '));
    if (/^\s*([-*]|\d+\.)\s/.test(l) && /\bplease\b/i.test(l)) add('please-in-step', i + 1, l.trim().slice(0, 70));
    if (/\s&\s/.test(l) && !/&\w+;/.test(l)) add('prose-ampersand', i + 1, l.trim().slice(0, 70));
    const re = /\b(e\.g\.|i\.e\.)/gi; let mm;
    while ((mm = re.exec(l)) !== null) {
      const before = l.slice(0, mm.index);
      if ((before.match(/\(/g) || []).length <= (before.match(/\)/g) || []).length) add('eg-ie-outside-parens', i + 1, mm[0]);
    }
    const h = l.match(/^#{1,6}\s+(.*)$/);
    if (h && isTitleCaseHeading(h[1])) add('title-case-heading', i + 1, h[1].trim().slice(0, 70));
    const sm = l.match(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/gi);
    if (sm) add('spelled-small-number', i + 1, sm.join(', '), true);
  });
}

// ---------- CMOS mode (inverse of Google on several axes) ----------
if (style === 'cmos') {
  // Curly required -> flag STRAIGHT quote/apostrophe used in prose (not code).
  proseLines.forEach((l, i) => {
    if (/["]/.test(l)) add('straight-double-quote', i + 1, l.trim().slice(0, 70));
    if (/[A-Za-z]'[A-Za-z]|[A-Za-z]'\b|(^|\s)'/.test(l)) add('straight-apostrophe', i + 1, l.trim().slice(0, 70));
  });
  // Em dash used deliberately, closed up. Flag "--" and spaced em dash and pileups.
  proseLines.forEach((l, i) => {
    if (/--/.test(l)) add('double-hyphen-not-em', i + 1, l.trim().slice(0, 70));
    if (/\s—\s|\s—|—\s/.test(l)) add('spaced-em-dash', i + 1, l.trim().slice(0, 70));
  });
  proseLines.forEach((l, i) => {
    const c = (l.match(/—/g) || []).length;
    if (c >= 3) add('em-dash-pileup', i + 1, `${c} em dashes in one line`);
  });
  // Numbers: spell out zero..one hundred -> numerals 0..100 in prose are suspect.
  proseLines.forEach((l, i) => {
    if (/^\s*([-*]|\d+\.)\s/.test(l)) return;                 // skip list markers
    const nums = (l.match(/(?<![\w.$])\d{1,3}(?![\w.%])/g) || []).filter((n) => +n >= 0 && +n <= 100);
    if (nums.length) add('numeral-should-spell', i + 1, nums.join(', '), true);
  });
  // CMOS does NOT flag title case or e.g./i.e. — intentionally omitted.
}

// ---------- APA mode ----------
if (style === 'apa') {
  proseLines.forEach((l, i) => {
    if (/["]/.test(l)) add('straight-double-quote', i + 1, l.trim().slice(0, 70));
    const re = /\b(e\.g\.|i\.e\.)/gi; let mm;
    while ((mm = re.exec(l)) !== null) {
      const before = l.slice(0, mm.index);
      if ((before.match(/\(/g) || []).length <= (before.match(/\)/g) || []).length) add('eg-ie-outside-parens', i + 1, mm[0]);
    }
  });
  const em = (prose.match(/—/g) || []).length;
  if (em > Math.max(1, Math.floor(wordCount / 400))) add('em-dash-overuse', 0, `${em} em dashes in ${wordCount} words`);
  // APA spells out below 10 -> a bare numeral 0..9 in prose is suspect.
  proseLines.forEach((l, i) => {
    if (/^\s*([-*]|\d+\.)\s/.test(l)) return;
    const nums = (l.match(/(?<![\w.$])\d(?![\w.%])/g) || []);
    if (nums.length) add('numeral-under-ten', i + 1, nums.join(', '), true);
  });
}

// ---------- AIDetector (de-AI half) ----------
let ai = null;
if (AIDetector) {
  const r = AIDetector.analyzeText(text);
  ai = { label: r.label, score: r.score, issues: (r.issues || []).length };
}

const hard = findings.filter((f) => !f.advisory);
const advisory = findings.filter((f) => f.advisory);
const byRule = {};
findings.forEach((f) => { byRule[f.rule] = (byRule[f.rule] || 0) + 1; });

if (asJson) {
  console.log(JSON.stringify({ file, style, ai, hard: hard.length, advisory: advisory.length, byRule, findings }, null, 2));
} else {
  console.log(`\n=== ${path.basename(file)}  [--style ${style}] ===`);
  if (ai) console.log(`AIDetector: ${ai.label}  (score ${ai.score}, ${ai.issues} issues)`);
  console.log(`Mechanics: ${hard.length} violations, ${advisory.length} advisory`);
  Object.entries(byRule).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    const adv = advisory.some((f) => f.rule === k) ? ' [advisory]' : '';
    console.log(`  ${String(v).padStart(3)}  ${k}${adv}`);
  });
}
process.exit(hard.length > 0 ? 1 : 0);
