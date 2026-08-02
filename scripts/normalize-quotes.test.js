#!/usr/bin/env node
/* Tests for scripts/normalize-quotes.js — run by `npm test`. */
'use strict';
const assert = require('assert');
const { normalize } = require('./normalize-quotes.js');

let passed = 0;
const t = (name, fn) => { fn(); passed += 1; process.stdout.write(`  ✓ ${name}\n`); };

// --- cmos/apa: educate straight marks to curly ---
t('cmos educates contraction apostrophe', () => {
  assert.strictEqual(normalize("you've got it", 'cmos'), 'you’ve got it');
});
t('cmos educates possessive apostrophe', () => {
  assert.strictEqual(normalize("the users' data", 'cmos'), 'the users’ data');
});
t('cmos educates double quotes (open/close)', () => {
  assert.strictEqual(normalize('she said "hi" back', 'cmos'), 'she said “hi” back');
});
t('apa educates the same way', () => {
  assert.strictEqual(normalize("it's fine", 'apa'), 'it’s fine');
});
t('cmos educates nested quotes in the right direction', () => {
  assert.strictEqual(normalize('She said, "\'Stop,\' he began."', 'cmos'), 'She said, “‘Stop,’ he began.”');
});
t('cmos closes a dash-adjacent end-of-clause quote (interrupted dialogue)', () => {
  assert.strictEqual(normalize('"I was going--" she stopped.', 'cmos'), '“I was going--” she stopped.');
});

// --- inline-code adjacency: quotes/apostrophes next to `code` get the right direction ---
t('cmos: opening quote before inline code stays opening', () => {
  assert.strictEqual(normalize('she said "`git push`" then left', 'cmos'), 'she said “`git push`” then left');
});
t('cmos: possessive after inline code is an apostrophe, not an opening quote', () => {
  assert.strictEqual(normalize("the `--flag`'s default", 'cmos'), 'the `--flag`’s default');
});
t('inline code content is preserved verbatim (cmos)', () => {
  assert.strictEqual(normalize("run `it's --raw` now", 'cmos'), 'run `it\'s --raw` now');
});

// --- "--" is never rewritten (flags, tables, URLs, ranges all safe) ---
t('cmos leaves "--" alone everywhere', () => {
  assert.strictEqual(normalize('state--of--art', 'cmos'), 'state--of--art');
  assert.strictEqual(normalize('Pass --write, use --style cmos.', 'cmos'), 'Pass --write, use --style cmos.');
  assert.strictEqual(normalize('|--|--|', 'cmos'), '|--|--|');
  assert.strictEqual(normalize('see https://xn--nxasmq6b.example', 'cmos'), 'see https://xn--nxasmq6b.example');
  assert.strictEqual(normalize('pages 110--12', 'cmos'), 'pages 110--12');
});

// --- google: straighten curly marks ---
t('google straightens curly apostrophe', () => {
  assert.strictEqual(normalize('you’ve got it', 'google'), "you've got it");
});
t('google straightens curly double quotes', () => {
  assert.strictEqual(normalize('“hi”', 'google'), '"hi"');
});

// --- structure/code protection ---
t('fenced code block is preserved verbatim (cmos)', () => {
  const src = ["before it's", '```', "const x = 'a'", '```', "after it's"].join('\n');
  const out = normalize(src, 'cmos');
  assert.ok(out.includes("const x = 'a'"), 'fenced code unchanged');
  assert.ok(out.includes('before it’s') && out.includes('after it’s'), 'prose educated around the fence');
});
t('nested longer fence: inner ``` does not close an outer ```` (cmos)', () => {
  const src = ['````', '```', "it's inside the outer fence", '```', '````', "outside it's"].join('\n');
  const out = normalize(src, 'cmos');
  assert.ok(out.includes("it's inside the outer fence"), 'inner fence content untouched');
  assert.ok(out.includes('outside it’s'), 'prose after the closing fence educated');
});
t('leading YAML frontmatter is preserved verbatim (cmos)', () => {
  assert.strictEqual(normalize('---\ntitle: "My Doc"\n---\nBody it\'s fine.', 'cmos'),
    '---\ntitle: "My Doc"\n---\nBody it’s fine.');
});
t('CRLF frontmatter is still recognized and preserved (cmos)', () => {
  assert.strictEqual(normalize('---\r\ntitle: "My Doc"\r\n---\r\nBody it\'s fine.', 'cmos'),
    '---\r\ntitle: "My Doc"\r\n---\r\nBody it’s fine.');
});
t('a lone leading "---" (thematic break, no close) does not swallow the doc (cmos)', () => {
  assert.strictEqual(normalize('---\nit\'s a break', 'cmos'), '---\nit’s a break');
});
t('indented (4-space) code block is preserved (cmos)', () => {
  const src = "it's prose\n\n    x = 'raw'\n\nmore prose";
  const out = normalize(src, 'cmos');
  assert.ok(out.includes("    x = 'raw'"), 'indented code unchanged');
  assert.ok(out.includes('it’s prose') && out.includes('more prose'), 'prose educated around it');
});

// --- idempotence ---
t('cmos normalization is idempotent', () => {
  const once = normalize('she said "you\'ve won" -- again', 'cmos');
  assert.strictEqual(normalize(once, 'cmos'), once);
});

// --- known limitation: assert CURRENT (imperfect) output so a regression is visible ---
t('KNOWN LIMITATION: leading-apostrophe elision educates as an opening quote', () => {
  assert.strictEqual(normalize("rock 'n' roll", 'cmos'), 'rock ‘n’ roll');
});

console.log(`\nnormalize-quotes: ${passed} passed.`);
