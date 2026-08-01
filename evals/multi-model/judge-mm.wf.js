export const meta = {
  name: 'mm-judge',
  description: 'Judge terse/rules/both rewrites across local models + Haiku (blind, genre-matched rubric)',
  phases: [
    { title: 'Rewrite', detail: 'Haiku 4.5 rewrites (locals passed in via args)' },
    { title: 'Judge', detail: 'blind 3-judge panel per rewrite' },
  ],
}

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
]
const byId = Object.fromEntries(CASES.map((c) => [c.id, c]))

const DEAI = `You are applying the "avoid AI writing" skill. Remove AI-writing tells: cut cliches and filler ("game-changer", "dive into", "unlock", "seamlessly", "in today's fast-paced/hyper-connected world", "it's worth noting", "at their core", "buckle up", "rinse and repeat", "boom", "voila"), hype, and empty inflation. Preserve the meaning, the specific facts, and the content's genre. Prefer clear, direct wording.`
const NAME = { google: 'the Google Developer Documentation Style Guide', cmos: 'The Chicago Manual of Style, 18th edition', apa: 'the Publication Manual of the APA, 7th edition' }
const RULES = {
  google: `Copyedit for developer reference documentation: second person, present tense, active voice, imperative for steps; sentence-case headings; straight quotation marks; serial (Oxford) comma; cut "please/simply/just/easily/obviously"; reserve e.g./i.e. for parentheses; numerals for quantities including 0-9; descriptive link text.`,
  cmos: `Copyedit as polished published prose: use the em dash "—" deliberately (closed up, no spaces); en dash "–" for ranges; convert "--" to "—"; title-case (headline) headings; typographic (curly) quotation marks and apostrophes; serial (Oxford) comma; spell out whole numbers zero through one hundred; write "45 percent"; contractions acceptable; consistent, flowing voice.`,
  apa: `Copyedit as formal scholarly writing: formal, objective, precise; measured, qualified claims; avoid hype and absolutes; avoid contractions; em dash sparingly; en dash for ranges; typographic (curly) quotation marks; serial (Oxford) comma; spell out zero through nine, numerals for 10 and above and for all measurements, percentages, and statistics; "%" with a numeral; title-case headings; Latin abbreviations (e.g., i.e.) only in parentheses; "and" not "&".`,
}
const condBlock = (style, cond) => cond === 'name'
  ? `Now copyedit the result to conform to ${NAME[style]}. Apply that guide from your own knowledge of it.`
  : cond === 'rules' ? `Now ${RULES[style]}`
  : `Now copyedit the result to conform to ${NAME[style]}:\n${RULES[style]}`
const buildPrompt = (doc, cond) => `${DEAI}\n\n${condBlock(doc.style, cond)}\n\nReturn ONLY the rewritten markdown, no preamble, no explanation.\n\n--- SOURCE (${doc.genre}) ---\n${doc.text}`

const GENRE_GUIDE = {
  technical: `GENRE: developer reference documentation. Register: neutral, second person, present tense, imperative steps, scannable. Mechanics: sentence-case headings, straight quotes, numerals. REWARD concision and structure; PENALIZE marketing/chatty tone and hype.`,
  prose: `GENRE: published long-form prose (essay). Register: polished, consistent, flowing narrative voice, varied rhythm. Mechanics: curly quotation marks, deliberate em dash, spelled-out numbers (Chicago). REWARD flow and a consistent authorial voice; PENALIZE choppy documentation structure, robotic terseness, and casual chattiness.`,
  academic: `GENRE: formal scholarly writing. Register: formal, objective, precise, third person, qualified claims, no hype. Mechanics: curly quotes, numerals for 10+ and measurements, "%" with numerals. REWARD precision and objectivity; PENALIZE casual voice, hype, absolute claims, exclamations, and second person.`,
}
const JUDGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['ai_tells_removed', 'register_fit', 'mechanics_fit', 'readability', 'genre_fit', 'overall', 'rationale'],
  properties: {
    ai_tells_removed: { type: 'integer', minimum: 1, maximum: 5, description: 'Free of AI tells/cliches' },
    register_fit: { type: 'integer', minimum: 1, maximum: 5, description: 'Register matches the genre' },
    mechanics_fit: { type: 'integer', minimum: 1, maximum: 5, description: 'Typographic/structural mechanics right for the genre' },
    readability: { type: 'integer', minimum: 1, maximum: 5, description: 'Clear and readable' },
    genre_fit: { type: 'integer', minimum: 1, maximum: 5, description: 'Overall suitability for the genre' },
    overall: { type: 'integer', minimum: 1, maximum: 5, description: 'Holistic quality for the genre' },
    rationale: { type: 'string', description: 'One or two sentences' },
  },
}
const judgePrompt = (r) => `You are a strict editor scoring a rewrite for a specific document genre, against the rubric for THAT genre.

${GENRE_GUIDE[r.genre]}

USE THE FULL 1-5 SCALE. Judge ONLY this version on its own merits; you are not told which model or process produced it.

--- ORIGINAL (${r.genre}) ---
${byId[r.id].text}

--- CANDIDATE REWRITE ---
${r.text}`

// Locals arrive via args (manifest from gen-local.mjs); drop any that errored.
const locals = (args || []).filter((r) => r.text && !r.text.startsWith('__ERROR__'))

phase('Rewrite')
const CONDS = ['rules', 'name', 'both']
const haiku = (await parallel(
  CASES.flatMap((doc) => CONDS.map((cond) => () =>
    agent(buildPrompt(doc, cond), { label: `haiku:${doc.style}:${cond}`, phase: 'Rewrite', model: 'haiku' })
      .then((text) => ({ model: 'haiku-4.5', mslug: 'haiku', id: doc.id, genre: doc.genre, style: doc.style, cond, text }))
  ))
)).filter(Boolean)

const all = [...locals, ...haiku]

phase('Judge')
const judged = await parallel(all.map((r) => () =>
  parallel([0, 1, 2].map((k) => () =>
    agent(judgePrompt(r), { label: `judge:${r.mslug}:${r.style}:${r.cond}:${k}`, phase: 'Judge', model: 'sonnet', schema: JUDGE_SCHEMA })
  )).then((js) => ({ model: r.model, mslug: r.mslug, id: r.id, genre: r.genre, style: r.style, cond: r.cond, text: r.text, judges: js.filter(Boolean) }))
))

return { judged }
