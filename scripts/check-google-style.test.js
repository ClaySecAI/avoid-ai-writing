#!/usr/bin/env node
/* Tests for scripts/check-google-style.js — run by `npm test`. */
'use strict';
const assert = require('assert');
const { check } = require('./check-google-style.js');

let passed = 0;
const t = (name, fn) => { fn(); passed += 1; process.stdout.write(`  ✓ ${name}\n`); };

// A Google-compliant fixture: sentence-case headings, straight quotes, e.g. in parens.
const COMPLIANT = `# Configure retries

To enable retries, set the \`max_retries\` value when you create the client. The client
retries failed requests up to that limit (for example, 3).

## Handle rate limits

When you exceed the limit, the API returns a 429 response. Read the \`Retry-After\`
header and wait that many seconds before you retry.`;

// A non-compliant fixture: Title Case Heading, curly quotes, e.g. outside parens.
const NONCOMPLIANT = `# Configure Your Retries

Set the “max_retries” value, e.g. 3, when you create the client.`;

t('compliant Google doc has zero hard violations', () => {
  assert.strictEqual(check(COMPLIANT).hard.length, 0);
});

t('title-case heading is flagged', () => {
  assert.ok(check(NONCOMPLIANT).hard.some((v) => v.rule === 'title-case-heading'));
});

t('curly quotes are flagged', () => {
  assert.ok(check(NONCOMPLIANT).hard.some((v) => v.rule === 'curly-quotes'));
});

t('e.g. outside parentheses is flagged', () => {
  assert.ok(check(NONCOMPLIANT).hard.some((v) => v.rule === 'eg-ie-outside-parens'));
});

t('code and frontmatter do not false-positive', () => {
  const src = `---\ntitle: "My Doc"\n---\n# A clean heading\n\nRun \`git push --force\` and read "the docs".`;
  // Straight quotes in prose ("the docs") are fine; the curly-looking marks are none here.
  // Frontmatter quotes and inline code must not be flagged.
  const r = check(src);
  assert.strictEqual(r.hard.length, 0, JSON.stringify(r.hard));
});

t('dismissive words are advisory, not hard', () => {
  const r = check('# Setup\n\nJust run the installer; it easily configures everything.');
  assert.strictEqual(r.hard.length, 0);
  assert.ok(r.advisory.some((v) => v.rule === 'dismissive-word'));
});

console.log(`\ncheck-google-style: ${passed} passed.`);
