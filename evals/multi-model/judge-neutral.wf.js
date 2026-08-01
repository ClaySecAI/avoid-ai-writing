export const meta = {
  name: 'neutral-judge',
  description: 'terse/rules/both across models, judged by a GUIDE-NEUTRAL rubric (n=2/genre)',
  phases: [{ title: 'Rewrite', detail: 'Haiku rewrites (locals via inlined const)' }, { title: 'Judge', detail: 'blind neutral 3-judge panel' }],
}

const CASES = [
  { id: 'api-pagination', genre: 'technical', style: 'google', text: `# Working With Pagination\n\nWhen it comes to fetching large datasets, pagination is absolutely your best friend. Our API leverages a powerful cursor-based approach that makes it a breeze to page through results efficiently, no matter how much data you're dealing with.\n\n## How Pagination Works\n\nIt's important to note that every list endpoint returns a handy "next_cursor" field. Simply grab that cursor and pass it back in your next request, and boom—you'll get the next page of results. Rinse and repeat until the cursor comes back empty. By default we return 20 items per page, but you can easily bump that up to a maximum of 100.` },
  { id: 'webhooks-setup', genre: 'technical', style: 'google', text: `# Setting Up Webhooks\n\nWebhooks are a game-changer for real-time integrations, and getting started couldn't be easier! In just a few simple steps you'll be up and running in no time.\n\n## Registering An Endpoint\n\nFirst things first, you'll want to head over to your dashboard and register your endpoint URL. It's worth noting that your endpoint absolutely must respond with a 200 status code within 5 seconds, otherwise we'll consider the delivery failed and retry it for you automatically. Once that's done, simply select which events you'd like to subscribe to and hit save. That's really all there is to it!` },
  { id: 'essay-attention', genre: 'prose', style: 'cmos', text: `# The Cost of Constant Connection\n\nIn today's hyper-connected world, our attention has become one of the most sought-after commodities on the planet. It's important to understand that every notification, every ping, and every buzz represents a tiny withdrawal from the finite reservoir of our focus.\n\n## A Fragmented Mind\n\nLet's dive into what really happens when we constantly switch between tasks. Research consistently shows that multitasking isn't just inefficient—it fundamentally reshapes the way we think. Each time we pivot our attention, we pay what psychologists call a "switching cost," a small but very real tax on our cognitive resources. The result? A mind perpetually busy yet never quite present.` },
  { id: 'essay-silence', genre: 'prose', style: 'cmos', text: `# In Praise of Silence\n\nIn our modern age of constant noise, silence has become something of a lost art. We fill every spare moment with podcasts, playlists, and the endless scroll, terrified of being alone with our own thoughts.\n\n## The Space Between\n\nBut here's the thing: silence isn't empty. Far from it. It's in those quiet moments that the mind finally has room to breathe, to wander, to make the unexpected connections that fuel genuine creativity. Study after study has shown that our best ideas rarely arrive when we're grinding away at a problem—they surface in the shower, on a walk, in the spaces between our busy hours.` },
  { id: 'abstract-sleep', genre: 'academic', style: 'apa', text: `# The Impact of Sleep on Memory Consolidation\n\nSleep is absolutely crucial when it comes to how we form and retain memories. In this study, we dive deep into the fascinating relationship between sleep quality and memory consolidation across a diverse cohort of participants.\n\n## Findings\n\nOur groundbreaking results clearly demonstrate that participants who enjoyed high-quality sleep performed dramatically better on memory recall tasks. It's worth noting that even a single night of poor sleep had a significant negative impact on performance. These findings underscore the undeniable importance of prioritizing sleep and open up exciting new avenues for future research.` },
  { id: 'abstract-exercise', genre: 'academic', style: 'apa', text: `# Exercise and Executive Function in Older Adults\n\nIt's no secret that exercise is great for the body, but its impact on the aging brain is nothing short of remarkable. This study set out to explore the powerful connection between regular aerobic exercise and executive function in older adults.\n\n## Results\n\nThe results were truly striking. Participants who engaged in a 12-week aerobic program showed dramatic improvements on tasks measuring working memory and cognitive flexibility, absolutely blowing the sedentary control group out of the water. These findings make it crystal clear that exercise should be a cornerstone of any healthy-aging strategy.` },
]
const byId = Object.fromEntries(CASES.map((c) => [c.id, c]))

const DEAI = `You are applying the "avoid AI writing" skill. Remove AI-writing tells: cut cliches and filler ("game-changer", "dive into", "boom", "rinse and repeat", "in today's hyper-connected world", "it's worth noting", "here's the thing", "no secret", "nothing short of"), hype, and empty inflation. Preserve the meaning, the specific facts, and the content's genre. Prefer clear, direct wording.`
const NAME = { google: 'the Google Developer Documentation Style Guide', cmos: 'The Chicago Manual of Style, 18th edition', apa: 'the Publication Manual of the APA, 7th edition' }
const RULES = {
  google: `Copyedit for developer reference documentation: second person, present tense, active voice, imperative for steps; sentence-case headings; straight quotation marks; serial (Oxford) comma; cut "please/simply/just/easily/obviously"; reserve e.g./i.e. for parentheses; numerals for quantities including 0-9; descriptive link text.`,
  cmos: `Copyedit as polished published prose: use the em dash "—" deliberately (closed up); en dash for ranges; title-case headings; typographic (curly) quotation marks and apostrophes; serial (Oxford) comma; spell out whole numbers zero through one hundred; write "45 percent"; contractions acceptable; consistent, flowing voice.`,
  apa: `Copyedit as formal scholarly writing: formal, objective, precise; measured, qualified claims; avoid hype and absolutes; avoid contractions; em dash sparingly; typographic (curly) quotation marks; serial (Oxford) comma; spell out zero through nine, numerals for 10 and above and for all measurements and statistics; "%" with a numeral; title-case headings; Latin abbreviations only in parentheses; "and" not "&".`,
}
const condBlock = (style, cond) => cond === 'name'
  ? `Now copyedit the result to conform to ${NAME[style]}. Apply that guide from your own knowledge of it.`
  : cond === 'rules' ? `Now ${RULES[style]}` : `Now copyedit the result to conform to ${NAME[style]}:\n${RULES[style]}`
const buildPrompt = (doc, cond) => `${DEAI}\n\n${condBlock(doc.style, cond)}\n\nReturn ONLY the rewritten markdown, no preamble, no explanation.\n\n--- SOURCE (${doc.genre}) ---\n${doc.text}`

// GUIDE-NEUTRAL rubric: describes genre quality only; names no guide and prescribes no mechanics.
const GENRE_GUIDE = {
  technical: `GENRE: developer reference documentation. Good output is clear, concise, scannable, direct and action-oriented, with a consistent professional register and no marketing language or hype. Do NOT reward or penalize any specific mechanical convention (heading capitalization, straight vs. curly quotes, number style); judge only whether it reads as competent reference documentation.`,
  prose: `GENRE: published long-form prose (essay). Good output has coherent flow, a consistent authorial voice, varied and readable sentences, and no AI cliches or filler. Do NOT reward or penalize any specific mechanical convention; judge only whether it reads as polished, publishable prose.`,
  academic: `GENRE: formal scholarly writing. Good output is formal, precise, and objective, with measured, qualified claims and no hype or salesmanship. Do NOT reward or penalize any specific mechanical convention; judge only whether it reads as competent academic writing.`,
}
const JUDGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['ai_tells_removed', 'register_fit', 'readability', 'genre_fit', 'overall', 'rationale'],
  properties: {
    ai_tells_removed: { type: 'integer', minimum: 1, maximum: 5, description: 'Free of AI tells/cliches' },
    register_fit: { type: 'integer', minimum: 1, maximum: 5, description: 'Register suits the genre' },
    readability: { type: 'integer', minimum: 1, maximum: 5, description: 'Clear and readable' },
    genre_fit: { type: 'integer', minimum: 1, maximum: 5, description: 'Reads as competent work in this genre' },
    overall: { type: 'integer', minimum: 1, maximum: 5, description: 'Holistic quality for the genre' },
    rationale: { type: 'string', description: 'One or two sentences' },
  },
}
const judgePrompt = (r) => `You are a strict editor scoring a rewrite for a specific document genre, against the rubric for THAT genre. Judge quality only. Do NOT reward or penalize any particular mechanical or typographic convention (quote style, heading case, number style) — those are out of scope.

${GENRE_GUIDE[r.genre]}

USE THE FULL 1-5 SCALE. Judge ONLY this version on its own merits; you are not told which model or process produced it.

--- ORIGINAL (${r.genre}) ---
${byId[r.id].text}

--- CANDIDATE REWRITE ---
${r.text}`

const locals = (args || []).filter((r) => r.text && !r.text.startsWith('__ERROR__') && r.text.length >= 20)

phase('Rewrite')
const CONDS = ['rules', 'name', 'both']
const haiku = (await parallel(
  CASES.flatMap((doc) => CONDS.map((cond) => () =>
    agent(buildPrompt(doc, cond), { label: `haiku:${doc.style}:${doc.id}:${cond}`, phase: 'Rewrite', model: 'haiku' })
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
