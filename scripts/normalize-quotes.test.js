#!/usr/bin/env node
/* Tests for scripts/normalize-quotes.js — run by `npm test`. */
'use strict';
const assert = require('assert');
const { normalize } = require('./normalize-quotes.js');

let passed = 0;
const t = (name, fn) => { fn(); passed += 1; process.stdout.write(`  ✓ ${name}\n`); };

// --- curly: educate straight marks ---
t('curly educates contraction apostrophe', () => {
  assert.strictEqual(normalize("you've got it", 'curly'), 'you’ve got it');
});
t('curly educates possessive apostrophe', () => {
  assert.strictEqual(normalize("the users' data", 'curly'), 'the users’ data');
});
t('curly educates double quotes (open/close)', () => {
  assert.strictEqual(normalize('she said "hi" back', 'curly'), 'she said “hi” back');
});
t('curly educates nested quotes in the right direction', () => {
  assert.strictEqual(normalize('She said, "\'Stop,\' he began."', 'curly'), 'She said, “‘Stop,’ he began.”');
});
t('curly closes a dash-adjacent end-of-clause quote (interrupted dialogue)', () => {
  assert.strictEqual(normalize('"I was going--" she stopped.', 'curly'), '“I was going--” she stopped.');
});

// --- inline-code adjacency: quotes/apostrophes next to `code` get the right direction ---
t('opening quote before inline code stays opening', () => {
  assert.strictEqual(normalize('she said "`git push`" then left', 'curly'), 'she said “`git push`” then left');
});
t('possessive after inline code is an apostrophe, not an opening quote', () => {
  assert.strictEqual(normalize("the `--flag`'s default", 'curly'), 'the `--flag`’s default');
});
t('inline code content is preserved verbatim', () => {
  assert.strictEqual(normalize("run `it's --raw` now", 'curly'), 'run `it\'s --raw` now');
});

// --- hyphens are never rewritten ---
t('"--" is left alone everywhere (flags, tables, URLs, ranges)', () => {
  assert.strictEqual(normalize('Pass --write, use --quotes curly.', 'curly'), 'Pass --write, use --quotes curly.');
  assert.strictEqual(normalize('|--|--|', 'curly'), '|--|--|');
  assert.strictEqual(normalize('see https://xn--nxasmq6b.example', 'curly'), 'see https://xn--nxasmq6b.example');
  assert.strictEqual(normalize('pages 110--12', 'curly'), 'pages 110--12');
});

// --- straight: straighten curly marks ---
t('straight straightens curly apostrophe', () => {
  assert.strictEqual(normalize('you’ve got it', 'straight'), "you've got it");
});
t('straight straightens curly double quotes', () => {
  assert.strictEqual(normalize('“hi”', 'straight'), '"hi"');
});

// --- structure/code protection ---
t('fenced code block is preserved verbatim', () => {
  const src = ["before it's", '```', "const x = 'a'", '```', "after it's"].join('\n');
  const out = normalize(src, 'curly');
  assert.ok(out.includes("const x = 'a'"), 'fenced code unchanged');
  assert.ok(out.includes('before it’s') && out.includes('after it’s'), 'prose educated around the fence');
});
t('nested longer fence: inner ``` does not close an outer ````', () => {
  const src = ['````', '```', "it's inside the outer fence", '```', '````', "outside it's"].join('\n');
  const out = normalize(src, 'curly');
  assert.ok(out.includes("it's inside the outer fence"), 'inner fence content untouched');
  assert.ok(out.includes('outside it’s'), 'prose after the closing fence educated');
});
t('leading YAML frontmatter is preserved verbatim', () => {
  assert.strictEqual(normalize('---\ntitle: "My Doc"\n---\nBody it\'s fine.', 'curly'),
    '---\ntitle: "My Doc"\n---\nBody it’s fine.');
});
t('CRLF frontmatter is still recognized and preserved', () => {
  assert.strictEqual(normalize('---\r\ntitle: "My Doc"\r\n---\r\nBody it\'s fine.', 'curly'),
    '---\r\ntitle: "My Doc"\r\n---\r\nBody it’s fine.');
});
t('a lone leading "---" (thematic break, no close) does not swallow the doc', () => {
  assert.strictEqual(normalize('---\nit\'s a break', 'curly'), '---\nit’s a break');
});
t('indented (4-space) code block is preserved', () => {
  const src = "it's prose\n\n    x = 'raw'\n\nmore prose";
  const out = normalize(src, 'curly');
  assert.ok(out.includes("    x = 'raw'"), 'indented code unchanged');
  assert.ok(out.includes('it’s prose') && out.includes('more prose'), 'prose educated around it');
});

// --- idempotence ---
t('curly normalization is idempotent', () => {
  const once = normalize('she said "you\'ve won" again', 'curly');
  assert.strictEqual(normalize(once, 'curly'), once);
});

// --- known limitation: assert CURRENT (imperfect) output so a regression is visible ---
t('KNOWN LIMITATION: leading-apostrophe elision educates as an opening quote', () => {
  assert.strictEqual(normalize("rock 'n' roll", 'curly'), 'rock ‘n’ roll');
});

console.log(`\nnormalize-quotes: ${passed} passed.`);
