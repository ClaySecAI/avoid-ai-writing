#!/usr/bin/env node
/*
 * aggregate.cjs — summarize a judge-eval.wf.js (genre x style matrix) run.
 *
 * Usage: node evals/aggregate.cjs <workflow-output.json> [outDir]
 *
 * Reads the workflow result (raw {results:[...]} or the task wrapper
 * {..., result:{results:[...]}}). For each genre it prints the mean judge score
 * per dimension per style, and writes each rewrite to
 * outDir/<genre>.<docId>.<style>.md so the deterministic linter can run on them.
 */
const fs = require('fs');
const path = require('path');

const inPath = process.argv[2];
const outDir = process.argv[3] || path.join(path.dirname(inPath || '.'), 'rewrites');
if (!inPath) { console.error('usage: aggregate.cjs <workflow-output.json> [outDir]'); process.exit(2); }

const parsed = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const data = parsed.result || parsed;
const results = data.results || [];

const DIMS = ['ai_tells_removed', 'register_fit', 'mechanics_fit', 'readability', 'genre_fit', 'overall'];
const META = new Set(['id', 'genre', 'doc']);
const styleKeys = (r) => Object.keys(r).filter((k) => !META.has(k));

fs.mkdirSync(outDir, { recursive: true });
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);

results.forEach((r) => styleKeys(r).forEach((s) => {
  fs.writeFileSync(path.join(outDir, `${r.genre}.${r.id}.${s}.md`), r[s].text || '');
}));

// group by genre
const byGenre = {};
results.forEach((r) => { (byGenre[r.genre] = byGenre[r.genre] || []).push(r); });

for (const [genre, rows] of Object.entries(byGenre)) {
  const styles = styleKeys(rows[0]);
  const acc = {}; styles.forEach((s) => { acc[s] = {}; DIMS.forEach((d) => (acc[s][d] = [])); });
  rows.forEach((r) => styles.forEach((s) => (r[s].judges || []).forEach((j) => DIMS.forEach((d) => acc[s][d].push(j[d])))));

  console.log(`\n=== GENRE: ${genre}  (home style should win) ===\n`);
  console.log('dimension'.padEnd(18) + styles.map((s) => s.padStart(9)).join(''));
  DIMS.forEach((d) => {
    console.log(d.padEnd(18) + styles.map((s) => avg(acc[s][d]).toFixed(2).padStart(9)).join(''));
  });
  // winner by overall
  const best = styles.map((s) => [s, avg(acc[s].overall)]).sort((a, b) => b[1] - a[1])[0];
  console.log(`winner (overall): ${best[0]} @ ${best[1].toFixed(2)}`);
}
console.log(`\nrewrites written to ${outDir}/`);
