// Generate local-model rewrites for the terse-vs-detailed-vs-both eval.
// Loops model-outer so each ~20GB model loads into the APU once.
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/tmp/claude-1000/-home-clay-claude/e89f9843-84d3-46b4-a8dc-aeeb6022820c/scratchpad/mm';
mkdirSync(OUT, { recursive: true });

const MODELS = (process.env.MODELS || 'maxwell1500/ornith-35b:Q4_K_M,mistral-small:24b,gemma4:e4b').split(','); // override with MODELS env

const CASES = [
  { id: 'api-pagination', genre: 'technical', style: 'google', text: `# Working With Pagination

When it comes to fetching large datasets, pagination is absolutely your best friend. Our API leverages a powerful cursor-based approach that makes it a breeze to page through results efficiently, no matter how much data you're dealing with.

## How Pagination Works

It's important to note that every list endpoint returns a handy "next_cursor" field. Simply grab that cursor and pass it back in your next request, and boom—you'll get the next page of results. Rinse and repeat until the cursor comes back empty, and you'll know you've reached the end.

By default, we return 20 items per page, but you can easily bump that up to a maximum of 100 by setting the limit parameter. Just keep in mind that larger pages obviously take a bit longer to load.` },
  { id: 'essay-attention', genre: 'prose', style: 'cmos', text: `# The Cost of Constant Connection

In today's hyper-connected world, our attention has become one of the most sought-after commodities on the planet. It's important to understand that every notification, every ping, and every buzz represents a tiny withdrawal from the finite reservoir of our focus.

## A Fragmented Mind

Let's dive into what really happens when we constantly switch between tasks. Research consistently shows that multitasking isn't just inefficient—it fundamentally reshapes the way we think. Each time we pivot our attention, we pay what psychologists call a "switching cost," a small but very real tax on our cognitive resources.

The result? A mind that feels perpetually busy yet somehow never quite present—a paradox that defines modern life.` },
  { id: 'abstract-sleep', genre: 'academic', style: 'apa', text: `# The Impact of Sleep on Memory Consolidation

Sleep is absolutely crucial when it comes to how we form and retain memories. In this study, we dive deep into the fascinating relationship between sleep quality and memory consolidation across a diverse cohort of participants.

## Findings

Our groundbreaking results clearly demonstrate that participants who enjoyed high-quality sleep performed dramatically better on memory recall tasks. It's worth noting that even a single night of poor sleep had a significant negative impact on performance. These findings underscore the undeniable importance of prioritizing sleep, and they open up exciting new avenues for future research in the ever-evolving field of cognitive science.` },
];

const DEAI = `You are applying the "avoid AI writing" skill. Remove AI-writing tells: cut cliches and filler ("game-changer", "dive into", "unlock", "seamlessly", "in today's fast-paced/hyper-connected world", "it's worth noting", "at their core", "buckle up", "rinse and repeat", "boom", "voila"), hype, and empty inflation. Preserve the meaning, the specific facts, and the content's genre. Prefer clear, direct wording.`;

const NAME = {
  google: 'the Google Developer Documentation Style Guide',
  cmos: 'The Chicago Manual of Style, 18th edition',
  apa: 'the Publication Manual of the APA, 7th edition',
};
const RULES = {
  google: `Copyedit for developer reference documentation: second person, present tense, active voice, imperative for steps; sentence-case headings; straight quotation marks; serial (Oxford) comma; cut "please/simply/just/easily/obviously"; reserve e.g./i.e. for parentheses; numerals for quantities including 0-9; descriptive link text.`,
  cmos: `Copyedit as polished published prose: use the em dash "—" deliberately (closed up, no spaces); en dash "–" for ranges; convert "--" to "—"; title-case (headline) headings; typographic (curly) quotation marks and apostrophes; serial (Oxford) comma; spell out whole numbers zero through one hundred; write "45 percent"; contractions acceptable; consistent, flowing voice.`,
  apa: `Copyedit as formal scholarly writing: formal, objective, precise; measured, qualified claims; avoid hype and absolutes; avoid contractions; em dash sparingly; en dash for ranges; typographic (curly) quotation marks; serial (Oxford) comma; spell out zero through nine, numerals for 10 and above and for all measurements, percentages, and statistics; "%" with a numeral; title-case headings; Latin abbreviations (e.g., i.e.) only in parentheses; "and" not "&".`,
};

const conditionBlock = (style, cond) => {
  if (cond === 'name') return `Now copyedit the result to conform to ${NAME[style]}. Apply that guide from your own knowledge of it.`;
  if (cond === 'rules') return `Now ${RULES[style]}`;
  return `Now copyedit the result to conform to ${NAME[style]}:\n${RULES[style]}`; // name+rules
};

const buildPrompt = (doc, cond) => `${DEAI}

${conditionBlock(doc.style, cond)}

Return ONLY the rewritten markdown, no preamble, no explanation, no code fences around the whole thing.

--- SOURCE (${doc.genre}) ---
${doc.text}`;

const CONDS = ['rules', 'name', 'both'];

async function gen(model, prompt) {
  const r = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.3, num_predict: 700 } }),
  });
  if (!r.ok) throw new Error(`ollama ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.response || '').trim();
}

const manifest = [];
for (const model of MODELS) {
  const mslug = model.replace(/[^a-z0-9]+/gi, '_');
  const t0 = Date.now();
  console.log(`\n=== ${model} ===`);
  for (const doc of CASES) {
    for (const cond of CONDS) {
      const started = Date.now();
      let text = '';
      try {
        text = await gen(model, buildPrompt(doc, cond));
        text = text.replace(/^```(?:markdown)?\n?/, '').replace(/\n?```\s*$/, '').trim();
      } catch (e) {
        text = `__ERROR__ ${e.message}`;
      }
      const fname = `${mslug}.${doc.style}.${doc.id}.${cond}.md`;
      writeFileSync(`${OUT}/${fname}`, text);
      manifest.push({ model, mslug, id: doc.id, genre: doc.genre, style: doc.style, cond, file: fname, text });
      console.log(`  ${cond.padEnd(6)} ${doc.style.padEnd(7)} ${(Date.now() - started) / 1000}s  (${text.length} chars)`);
    }
  }
  console.log(`  [${model} done in ${((Date.now() - t0) / 1000).toFixed(0)}s]`);
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`\nWROTE ${manifest.length} local rewrites -> ${OUT}/manifest.json`);
