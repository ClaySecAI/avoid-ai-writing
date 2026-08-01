// Local-model rewrites for the NEUTRAL-rubric re-run of terse-vs-detailed.
// n=2 docs per guide-genre, 3 conditions (rules / name / both). MODELS via env.
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = '/tmp/claude-1000/-home-clay-claude/e89f9843-84d3-46b4-a8dc-aeeb6022820c/scratchpad/mmn';
mkdirSync(OUT, { recursive: true });
const MODELS = (process.env.MODELS || 'gemma4:e4b').split(',');

const CASES = [
  { id: 'api-pagination', genre: 'technical', style: 'google', text: `# Working With Pagination

When it comes to fetching large datasets, pagination is absolutely your best friend. Our API leverages a powerful cursor-based approach that makes it a breeze to page through results efficiently, no matter how much data you're dealing with.

## How Pagination Works

It's important to note that every list endpoint returns a handy "next_cursor" field. Simply grab that cursor and pass it back in your next request, and boom—you'll get the next page of results. Rinse and repeat until the cursor comes back empty. By default we return 20 items per page, but you can easily bump that up to a maximum of 100.` },
  { id: 'webhooks-setup', genre: 'technical', style: 'google', text: `# Setting Up Webhooks

Webhooks are a game-changer for real-time integrations, and getting started couldn't be easier! In just a few simple steps you'll be up and running in no time.

## Registering An Endpoint

First things first, you'll want to head over to your dashboard and register your endpoint URL. It's worth noting that your endpoint absolutely must respond with a 200 status code within 5 seconds, otherwise we'll consider the delivery failed and retry it for you automatically. Once that's done, simply select which events you'd like to subscribe to and hit save. That's really all there is to it!` },

  { id: 'essay-attention', genre: 'prose', style: 'cmos', text: `# The Cost of Constant Connection

In today's hyper-connected world, our attention has become one of the most sought-after commodities on the planet. It's important to understand that every notification, every ping, and every buzz represents a tiny withdrawal from the finite reservoir of our focus.

## A Fragmented Mind

Let's dive into what really happens when we constantly switch between tasks. Research consistently shows that multitasking isn't just inefficient—it fundamentally reshapes the way we think. Each time we pivot our attention, we pay what psychologists call a "switching cost," a small but very real tax on our cognitive resources. The result? A mind perpetually busy yet never quite present.` },
  { id: 'essay-silence', genre: 'prose', style: 'cmos', text: `# In Praise of Silence

In our modern age of constant noise, silence has become something of a lost art. We fill every spare moment with podcasts, playlists, and the endless scroll, terrified of being alone with our own thoughts.

## The Space Between

But here's the thing: silence isn't empty. Far from it. It's in those quiet moments that the mind finally has room to breathe, to wander, to make the unexpected connections that fuel genuine creativity. Study after study has shown that our best ideas rarely arrive when we're grinding away at a problem—they surface in the shower, on a walk, in the spaces between our busy hours.` },

  { id: 'abstract-sleep', genre: 'academic', style: 'apa', text: `# The Impact of Sleep on Memory Consolidation

Sleep is absolutely crucial when it comes to how we form and retain memories. In this study, we dive deep into the fascinating relationship between sleep quality and memory consolidation across a diverse cohort of participants.

## Findings

Our groundbreaking results clearly demonstrate that participants who enjoyed high-quality sleep performed dramatically better on memory recall tasks. It's worth noting that even a single night of poor sleep had a significant negative impact on performance. These findings underscore the undeniable importance of prioritizing sleep and open up exciting new avenues for future research.` },
  { id: 'abstract-exercise', genre: 'academic', style: 'apa', text: `# Exercise and Executive Function in Older Adults

It's no secret that exercise is great for the body, but its impact on the aging brain is nothing short of remarkable. This study set out to explore the powerful connection between regular aerobic exercise and executive function in older adults.

## Results

The results were truly striking. Participants who engaged in a 12-week aerobic program showed dramatic improvements on tasks measuring working memory and cognitive flexibility, absolutely blowing the sedentary control group out of the water. These findings make it crystal clear that exercise should be a cornerstone of any healthy-aging strategy.` },
];

const DEAI = `You are applying the "avoid AI writing" skill. Remove AI-writing tells: cut cliches and filler ("game-changer", "dive into", "boom", "rinse and repeat", "in today's hyper-connected world", "it's worth noting", "here's the thing", "no secret", "nothing short of"), hype, and empty inflation. Preserve the meaning, the specific facts, and the content's genre. Prefer clear, direct wording.`;
const NAME = { google: 'the Google Developer Documentation Style Guide', cmos: 'The Chicago Manual of Style, 18th edition', apa: 'the Publication Manual of the APA, 7th edition' };
const RULES = {
  google: `Copyedit for developer reference documentation: second person, present tense, active voice, imperative for steps; sentence-case headings; straight quotation marks; serial (Oxford) comma; cut "please/simply/just/easily/obviously"; reserve e.g./i.e. for parentheses; numerals for quantities including 0-9; descriptive link text.`,
  cmos: `Copyedit as polished published prose: use the em dash "—" deliberately (closed up); en dash for ranges; title-case headings; typographic (curly) quotation marks and apostrophes; serial (Oxford) comma; spell out whole numbers zero through one hundred; write "45 percent"; contractions acceptable; consistent, flowing voice.`,
  apa: `Copyedit as formal scholarly writing: formal, objective, precise; measured, qualified claims; avoid hype and absolutes; avoid contractions; em dash sparingly; typographic (curly) quotation marks; serial (Oxford) comma; spell out zero through nine, numerals for 10 and above and for all measurements and statistics; "%" with a numeral; title-case headings; Latin abbreviations only in parentheses; "and" not "&".`,
};
const condBlock = (style, cond) => cond === 'name'
  ? `Now copyedit the result to conform to ${NAME[style]}. Apply that guide from your own knowledge of it.`
  : cond === 'rules' ? `Now ${RULES[style]}` : `Now copyedit the result to conform to ${NAME[style]}:\n${RULES[style]}`;
const buildPrompt = (doc, cond) => `${DEAI}\n\n${condBlock(doc.style, cond)}\n\nReturn ONLY the rewritten markdown, no preamble, no explanation.\n\n--- SOURCE (${doc.genre}) ---\n${doc.text}`;

async function gen(model, prompt) {
  const r = await fetch('http://localhost:11434/api/generate', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.3, num_predict: 900 } }),
  });
  if (!r.ok) throw new Error(`ollama ${r.status}`);
  return ((await r.json()).response || '').trim();
}

const CONDS = ['rules', 'name', 'both'];
for (const model of MODELS) {
  const mslug = model.replace(/[^a-z0-9]+/gi, '_');
  const t0 = Date.now();
  console.log(`\n=== ${model} ===`);
  for (const doc of CASES) {
    for (const cond of CONDS) {
      const st = Date.now();
      let text = '';
      try { text = (await gen(model, buildPrompt(doc, cond))).replace(/^```(?:markdown)?\n?/, '').replace(/\n?```\s*$/, '').trim(); }
      catch (e) { text = `__ERROR__ ${e.message}`; }
      writeFileSync(`${OUT}/${mslug}.${doc.style}.${doc.id}.${cond}.md`, text);
      console.log(`  ${cond.padEnd(5)} ${doc.id.padEnd(18)} ${((Date.now() - st) / 1000).toFixed(0)}s (${text.length}c)`);
    }
  }
  console.log(`  [${model} done ${((Date.now() - t0) / 1000).toFixed(0)}s]`);
}
console.log('\nDONE');
