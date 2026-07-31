#!/usr/bin/env node
/*
 * aggregate.cjs — summarize a judge-eval.wf.js run.
 *
 * Usage: node evals/aggregate.cjs <workflow-output.json> [outDir]
 *
 * Reads the workflow result (either the raw {results:[...]} return value or the
 * task wrapper {..., result:{results:[...]}}), prints the mean judge score per
 * dimension per style variant, and writes each generated rewrite to
 * outDir/<docId>.<variant>.md so the deterministic linter can be run on them.
 */
const fs = require('fs');
const path = require('path');

const inPath = process.argv[2];
const outDir = process.argv[3] || path.join(path.dirname(inPath || '.'), 'rewrites');
if (!inPath) { console.error('usage: aggregate.cjs <workflow-output.json> [outDir]'); process.exit(2); }

const parsed = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const data = parsed.result || parsed;
const results = data.results || [];

const DIMS = ['register', 'imperative_actions', 'concision', 'no_ai_personality', 'technical_fit', 'overall'];
const VARIANTS = Object.keys(results[0] || {}).filter((k) => k !== 'id' && k !== 'doc');

fs.mkdirSync(outDir, { recursive: true });
const acc = {}; VARIANTS.forEach((v) => { acc[v] = {}; DIMS.forEach((d) => (acc[v][d] = [])); });

results.forEach((r) => VARIANTS.forEach((v) => {
  if (!r[v]) return;
  fs.writeFileSync(path.join(outDir, `${r.id}.${v}.md`), r[v].text || '');
  (r[v].judges || []).forEach((j) => DIMS.forEach((d) => acc[v][d].push(j[d])));
}));

const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const n = results.length;
console.log(`\n=== LLM-judge means (${n} docs x 3 judges) ===\n`);
console.log('dimension'.padEnd(20) + VARIANTS.map((v) => v.padStart(9)).join(''));
DIMS.forEach((d) => {
  console.log(d.padEnd(20) + VARIANTS.map((v) => avg(acc[v][d]).toFixed(2).padStart(9)).join(''));
});
console.log(`\nrewrites written to ${outDir}/ (run style-lint.cjs on them)`);
