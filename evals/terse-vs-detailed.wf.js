export const meta = {
  name: 'terse-vs-detailed',
  description: 'Do the detailed --style rule blocks beat just naming the guide ("apply Chicago 18th")?',
  phases: [
    { title: 'Rewrite', detail: 'terse (name only) vs detailed (full rules) per style' },
    { title: 'Judge', detail: 'blind 3-judge panel, genre-matched rubric' },
  ],
}

// One doc per style, on that style's home genre.
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

const DEAI = `You are applying the "avoid AI writing" skill. Remove AI-writing tells: cut cliches and filler
("game-changer", "dive into", "unlock", "seamlessly", "in today's fast-paced/hyper-connected world",
"it's worth noting", "at their core", "buckle up", "rinse and repeat", "boom", "voila"), hype, and empty
inflation. Preserve the meaning, the specific facts, and the content's genre. Prefer clear, direct wording.`

// TERSE: name the guide, rely on the model's own knowledge. No rules.
const GUIDE_NAME = {
  google: 'the Google Developer Documentation Style Guide',
  cmos: 'The Chicago Manual of Style, 18th edition',
  apa: 'the Publication Manual of the APA, 7th edition',
}

// DETAILED: the hand-written rule blocks from the fork's SKILL.md.
const DETAILED = {
  google: `Apply the Google Developer Documentation Style Guide. Documentation register: second person, present
tense, active voice, one idea per sentence, imperative for steps. Structure (parallel lists, numbered steps,
tables) is correct, not a tell. Headings SENTENCE case. Straight quotes. Serial comma. Cut
"please/simply/just/easily/obviously". Reserve e.g./i.e. for parentheses. Numerals for quantities including
0-9. Descriptive link text; never "click here".`,
  cmos: `Apply The Chicago Manual of Style, 18th ed., for polished published prose. Use the em dash "—" (closed
up, no spaces) deliberately; en dash "–" for ranges; convert "--" to "—". Headings TITLE (headline) case,
consistent. Typographic (curly) quotation marks "" '' and apostrophe ' in prose. Serial comma. Spell out
whole numbers zero through one hundred in prose (numerals above); "45 percent". Contractions acceptable.
Consistent, flowing authorial voice.`,
  apa: `Apply the Publication Manual of the APA, 7th ed., for formal scholarly writing. Formal, objective,
precise register; measured, qualified claims; avoid hype and absolutes; avoid contractions. Em dash sparingly;
en dash for ranges. Typographic (curly) quotation marks. Serial comma. Spell out zero through nine; numerals
for 10+ and for all measurements, percentages, and statistics; "%" with a numeral. Headings TITLE case
(capitalize words of four+ letters). Latin abbreviations (e.g., i.e.) only in parentheses; "and" not "&".`,
}

const tersePrompt = (doc) => `${DEAI}

Now copyedit the result to conform to ${GUIDE_NAME[doc.style]}. Apply that guide from your own knowledge of it.

Return ONLY the rewritten markdown, no preamble.

--- SOURCE (${doc.genre}) ---
${doc.text}`

const detailedPrompt = (doc) => `${DEAI}

${DETAILED[doc.style]}

Return ONLY the rewritten markdown, no preamble.

--- SOURCE (${doc.genre}) ---
${doc.text}`

const GENRE_GUIDE = {
  technical: `GENRE: developer reference documentation. Register: neutral, second person, present tense, imperative
steps, scannable. Mechanics: sentence-case headings, straight quotes, numerals. REWARD concision and structure;
PENALIZE marketing/chatty tone and hype.`,
  prose: `GENRE: published long-form prose (essay). Register: polished, consistent, flowing narrative voice, varied
rhythm. Mechanics: curly quotation marks, deliberate em dash, spelled-out numbers (Chicago). REWARD flow and a
consistent authorial voice; PENALIZE choppy documentation structure, robotic terseness, and casual chattiness.`,
  academic: `GENRE: formal scholarly writing. Register: formal, objective, precise, third person, qualified claims,
no hype. Mechanics: curly quotes, numerals for 10+ and measurements, "%" with numerals. REWARD precision and
objectivity; PENALIZE casual voice, hype, absolute claims, exclamations, and second person.`,
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

const judgePrompt = (doc, rewrite) => `You are a strict editor scoring a rewrite for a specific document genre, against the rubric for THAT genre.

${GENRE_GUIDE[doc.genre]}

USE THE FULL 1-5 SCALE. Judge ONLY this version on its own merits; you are not told which process produced it.

--- ORIGINAL (${doc.genre}) ---
${doc.text}

--- CANDIDATE REWRITE ---
${rewrite}`

const results = await pipeline(
  CASES,
  async (doc) => {
    const [terse, detailed] = await parallel([
      () => agent(tersePrompt(doc), { label: `rewrite:terse:${doc.style}`, phase: 'Rewrite' }),
      () => agent(detailedPrompt(doc), { label: `rewrite:detailed:${doc.style}`, phase: 'Rewrite' }),
    ])
    return { doc, terse, detailed }
  },
  async (r) => {
    const panel = (text, cond) => parallel([0, 1, 2].map((k) => () =>
      agent(judgePrompt(r.doc, text), { label: `judge:${cond}:${r.doc.style}:${k}`, phase: 'Judge', schema: JUDGE_SCHEMA })
    ))
    const [terseJ, detailedJ] = await Promise.all([panel(r.terse, 'terse'), panel(r.detailed, 'detailed')])
    return {
      id: r.doc.id, genre: r.doc.genre, style: r.doc.style,
      terse: { text: r.terse, judges: terseJ.filter(Boolean) },
      detailed: { text: r.detailed, judges: detailedJ.filter(Boolean) },
    }
  }
)

return { results }
