'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { TYPE_LABELS } = require('../detector/patterns');
const { flatten } = require('./flatten-skill');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'references/patterns.md'), 'utf8');
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'evals/rewrite/editorial-cards-206.json'), 'utf8'));

// This checks the readable pilot's IDs, mapping and contrasting examples;
// it does not judge semantic quality or execute an editing rule engine.
function check(text) {
  const cards = [...text.matchAll(/\*\*Editorial decision card: `(ec-[a-z-]+)`\*\*\n([\s\S]*?)(?=\n\*\*Editorial decision card:|\n### |\n## |$)/g)];
  assert(cards.length >= 12 && cards.length <= 15, 'pilot must stay bounded');
  const ids = cards.map(c => c[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate editorial rule ID');
  for (const [, id, body] of cards) {
    for (const label of ['Apply', 'Edit', 'Keep', 'Flag a gap']) {
      assert.match(body, new RegExp(`^- \\*\\*${label}:\\*\\* \\S`, 'm'), `${id}: missing ${label}`);
    }
    const mapping = body.match(/^\*\*Detector types:\*\* (.+)$/m);
    assert(mapping, `${id}: missing detector mapping`);
    if (!mapping[1].startsWith('none ')) {
      const types = [...mapping[1].matchAll(/`([a-z0-9-]+)`/g)].map(m => m[1]);
      assert(types.length, `${id}: explicit mapping required`);
      for (const type of types) assert(Object.hasOwn(TYPE_LABELS, type), `${id}: unknown detector type ${type}`);
    }
    const cases = fixtures.cases.filter(c => c.rule_id === id);
    assert(cases.some(c => c.decision === 'edit'), `${id}: missing edit task`);
    assert(cases.some(c => c.decision === 'keep'), `${id}: missing preserve task`);
  }
  return cards;
}
const cards = check(source);
for (const mutation of [
  source.replace('`ec-meaningful-actually`', '`ec-supported-contrast`'),
  source.replace('**Detector types:** `negative-parallelism`', '**Detector types:** `invented-detector`'),
  source.replace('- **Keep:**', '- **Dropped keep example:**'),
  source.replace('- **Flag a gap:**', '- **Dropped gap guard:**'),
]) assert.throws(() => check(mutation), 'mutation must fail the card contract');
for (const [, , body] of cards) assert(flatten(root).includes(body), 'portable artifact must retain the whole card');
const existing = JSON.parse(fs.readFileSync(path.join(root, 'evals/rewrite/cases.json'), 'utf8'));
for (const c of fixtures.cases.filter(c => c.existing_case_id)) {
  const original = existing.find(x => x.id === c.existing_case_id);
  assert(original && original.split === 'development', 'do not expose a held-out case as a development probe');
  assert.equal(c.source, original.source, 'reused input must remain exact');
}
console.log(`${cards.length} editorial cards: IDs, mappings, paired tasks, portability and four mutation controls passed; no model-quality claim.`);
