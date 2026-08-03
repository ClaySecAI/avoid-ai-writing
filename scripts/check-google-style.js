#!/usr/bin/env node
/*
 * check-google-style.js — deterministic conformance check for the mechanically
 * verifiable subset of the Google Developer Documentation Style Guide. It is NOT an
 * LLM judgment of register; it checks marks, heading case, and Latin-abbreviation
 * placement, so `--style google` output can be verified rather than asserted.
 *
 * Usage: node scripts/check-google-style.js <file.md> [--json]
 * Exit code is non-zero when a hard violation is found. Advisory rules (word-sense
 * "just"/"simply", em-dash rate) are reported but don't affect the exit code.
 *
 * Frontmatter, fenced code, and inline `code` are skipped so identifiers and examples
 * don't false-positive.
 */
'use strict';

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'vs', 'nor', 'so', 'yet']);
const isTitleCase = (h) => {
  const words = h.replace(/[*_`]/g, '').trim().split(/\s+/);
  if (words.length < 2) return false;
  let cap = 0;
  words.slice(1).forEach((w) => {
    const bare = w.replace(/[^A-Za-z]/g, '');
    if (!bare || bare === bare.toUpperCase()) return;   // acronym / all-caps
    if (SMALL.has(bare.toLowerCase())) return;
    if (/^[A-Z]/.test(bare)) cap += 1;
  });
  return cap >= 2;
};

/** Returns { hard: [...], advisory: [...] } for Google-style mechanical conformance. */
function check(text) {
  const lines = text.split('\n');
  let inFence = false, inFrontmatter = lines[0].replace(/\r$/, '') === '---';
  const prose = lines.map((l, i) => {
    const b = l.replace(/\r$/, '');
    if (inFrontmatter) { if (i > 0 && b === '---') inFrontmatter = false; return ''; }
    if (/^\s*(```|~~~)/.test(b)) { inFence = !inFence; return ''; }
    if (inFence) return '';
    return b.replace(/`+[^`]*`+/g, '');
  });
  const words = (prose.join('\n').match(/\b\w+\b/g) || []).length;
  const hard = [];
  const advisory = [];

  prose.forEach((l, i) => {
    if (/[“”‘’]/.test(l)) hard.push({ line: i + 1, rule: 'curly-quotes' });
    const h = l.match(/^#{1,6}\s+(.*)$/);
    if (h && isTitleCase(h[1])) hard.push({ line: i + 1, rule: 'title-case-heading' });
    const re = /\b(e\.g\.|i\.e\.)/gi;
    let m;
    while ((m = re.exec(l)) !== null) {
      const before = l.slice(0, m.index);
      if ((before.match(/\(/g) || []).length <= (before.match(/\)/g) || []).length) {
        hard.push({ line: i + 1, rule: 'eg-ie-outside-parens' });
      }
    }
    if (/\b(simply|easily|just|obviously)\b/i.test(l)) advisory.push({ line: i + 1, rule: 'dismissive-word' });
  });
  const em = (prose.join('\n').match(/—/g) || []).length;
  if (em > Math.floor(words / 1000)) advisory.push({ rule: 'em-dash-rate', detail: `${em} in ${words} words` });

  return { hard, advisory };
}

module.exports = { check };

if (require.main === module) {
  const fs = require('fs');
  const file = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
  if (!file) { console.error('usage: check-google-style.js <file> [--json]'); process.exit(2); }
  const r = check(fs.readFileSync(file, 'utf8'));
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`google conformance: ${r.hard.length} hard, ${r.advisory.length} advisory`);
    r.hard.forEach((x) => console.log(`  L${x.line || '-'}  ${x.rule}`));
  }
  process.exit(r.hard.length > 0 ? 1 : 0);
}
