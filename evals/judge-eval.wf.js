export const meta = {
  name: 'style-genre-eval',
  description: 'Genre x style matrix: is each --style the right tool for its target document genre?',
  phases: [
    { title: 'Rewrite', detail: 'apply none/google/cmos/apa to each genre doc' },
    { title: 'Judge', detail: 'blind 3-judge panel, rubric matched to the doc genre' },
  ],
}

// ---- Corpus: one AI-sounding source doc per GENRE ----
const CORPUS = [
  { id: 'api-pagination', genre: 'technical', text: `# Working With Pagination

When it comes to fetching large datasets, pagination is absolutely your best friend. Our API leverages a powerful cursor-based approach that makes it a breeze to page through results efficiently, no matter how much data you're dealing with.

## How Pagination Works

It's important to note that every list endpoint returns a handy "next_cursor" field. Simply grab that cursor and pass it back in your next request, and boom—you'll get the next page of results. Rinse and repeat until the cursor comes back empty, and you'll know you've reached the end.

By default, we return 20 items per page, but you can easily bump that up to a maximum of 100 by setting the limit parameter. Just keep in mind that larger pages obviously take a bit longer to load.` },

  { id: 'newsletter-intro', genre: 'casual', text: `# What's New This Month

Hey there! We're absolutely thrilled to share some seriously exciting updates with you this month. Buckle up, because we've been hard at work and we can't wait for you to see what we've cooked up!

## Dark Mode Has Arrived

That's right—the moment you've all been waiting for is finally here. In today's fast-paced digital world, we know your eyes deserve a break, so we're beyond excited to unveil our brand new dark mode. It's sleek, it's gorgeous, and honestly? It's a total game-changer.

Just head to your settings, flip the switch, and voila—instant eye comfort. Trust us, once you go dark, you'll never go back!` },

  { id: 'essay-attention', genre: 'prose', text: `# The Cost of Constant Connection

In today's hyper-connected world, our attention has become one of the most sought-after commodities on the planet. It's important to understand that every notification, every ping, and every buzz represents a tiny withdrawal from the finite reservoir of our focus.

## A Fragmented Mind

Let's dive into what really happens when we constantly switch between tasks. Research consistently shows that multitasking isn't just inefficient—it fundamentally reshapes the way we think. Each time we pivot our attention, we pay what psychologists call a "switching cost," a small but very real tax on our cognitive resources.

The result? A mind that feels perpetually busy yet somehow never quite present—a paradox that defines modern life.` },

  { id: 'abstract-sleep', genre: 'academic', text: `# The Impact of Sleep on Memory Consolidation

Sleep is absolutely crucial when it comes to how we form and retain memories. In this study, we dive deep into the fascinating relationship between sleep quality and memory consolidation across a diverse cohort of participants.

## Findings

Our groundbreaking results clearly demonstrate that participants who enjoyed high-quality sleep performed dramatically better on memory recall tasks. It's worth noting that even a single night of poor sleep had a significant negative impact on performance. These findings underscore the undeniable importance of prioritizing sleep, and they open up exciting new avenues for future research in the ever-evolving field of cognitive science.` },
]

// ---- Style rule blocks (faithful to the fork's SKILL.md) ----
const DEAI = `You are applying the "avoid AI writing" skill. Remove AI-writing tells: cut cliches and filler
("game-changer", "dive into", "unlock", "seamlessly", "in today's fast-paced/hyper-connected world",
"it's worth noting", "at their core", "buckle up", "rinse and repeat", "boom", "voila"), hype, and empty
inflation. Preserve the meaning, the specific facts, and the content's genre. Prefer clear, direct wording.`

const HUMANIZE = `Register guidance (--style none): make the prose sound natural and genuinely human for its context.
Keep an appropriate, readable voice; do not sand everything into stiff, uniform, corporate prose. Do NOT
impose a formal reference or academic register if the piece is not one.`

const GOOGLE = `Apply the Google Developer Documentation Style Guide (--style google). OVERRIDE humanization with a
documentation register: second person, present tense, active voice, one idea per sentence, imperative for
steps. Structure (parallel lists, numbered steps, tables) is correct, not a tell. Headings SENTENCE case.
Straight quotes. Serial comma. Cut "please/simply/just/easily/obviously". Reserve e.g./i.e. for parentheses.
Numerals for quantities including 0-9. Descriptive link text.`

const CMOS = `Apply The Chicago Manual of Style, 18th ed. (--style cmos), for polished PUBLISHED PROSE. Use the em dash
"—" (closed up, no spaces) deliberately; en dash "–" for ranges; convert "--" to "—". Headings TITLE
(headline) case, consistent. Typographic (curly) quotation marks "" '' and apostrophe ' in prose. Serial
comma. Spell out whole numbers zero through one hundred in prose (numerals above); "45 percent". Keep a
consistent, flowing authorial voice appropriate to edited prose.`

const APA = `Apply the Publication Manual of the APA, 7th ed. (--style apa), for FORMAL SCHOLARLY writing. Formal,
objective, precise register; measured, qualified claims; avoid hype and absolutes. Em dash sparingly; en dash
for ranges. Typographic (curly) quotation marks. Serial comma. Spell out zero through nine; numerals for 10+
and for all measurements, percentages, and statistics; use "%" with a numeral. Headings TITLE case
(capitalize words of four+ letters). Latin abbreviations (e.g., i.e.) only inside parentheses; "and" not "&"
in running text.`

const STYLE_RULES = { none: HUMANIZE, google: GOOGLE, cmos: CMOS, apa: APA }
const STYLES = ['none', 'google', 'cmos', 'apa']

const rewritePrompt = (doc, style) => `${DEAI}

${STYLE_RULES[style]}

Return ONLY the rewritten markdown, no preamble or explanation.

--- SOURCE (${doc.genre}) ---
${doc.text}`

// ---- Genre-matched rubric guidance (the judge is told the genre, blind to the style) ----
const GENRE_GUIDE = {
  technical: `GENRE: developer reference documentation (API docs, CLI).
Appropriate register: neutral, second person, present tense; imperative for steps; scannable structure
(lists, tables, code). Appropriate mechanics: sentence-case headings, straight quotes, numerals for
quantities. REWARD concision, action-first clarity, and structure. PENALIZE marketing/chatty tone,
narrative meandering, hype, and exclamations.`,
  casual: `GENRE: casual blog post / product newsletter.
Appropriate register: warm, approachable, and human — a good newsletter voice; light contractions and first
person are fine. Appropriate mechanics: informal, light. REWARD natural human rhythm, plain language, and a
friendly-but-not-hypey tone. PENALIZE remaining AI cliches and marketing hype, corporate stiffness, AND an
over-formal reference or academic register (which is WRONG for this genre).`,
  prose: `GENRE: published long-form prose (essay / nonfiction).
Appropriate register: polished, consistent, flowing narrative-explanatory voice; varied sentence rhythm;
coherent paragraphs. Appropriate mechanics: typographic (curly) quotation marks, deliberate em dash,
spelled-out numbers (Chicago). REWARD flow, coherence, a consistent authorial voice, and readability.
PENALIZE choppy list-ified documentation structure, robotic terseness, AI cliches, AND breezy casual chattiness.`,
  academic: `GENRE: formal scholarly / academic writing.
Appropriate register: formal, objective, precise, third person; measured and qualified claims; no hype.
Appropriate mechanics: APA conventions — curly quotes, numerals for 10+ and all measurements/statistics, "%"
with numerals. REWARD precision, objectivity, and careful qualification. PENALIZE casual voice, marketing
hype, unsupported absolute claims ("groundbreaking", "undeniable"), exclamations, and second-person address.`,
}

const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ai_tells_removed', 'register_fit', 'mechanics_fit', 'readability', 'genre_fit', 'overall', 'rationale'],
  properties: {
    ai_tells_removed: { type: 'integer', minimum: 1, maximum: 5, description: 'Free of AI writing tells and cliches. 5=none, 1=pervasive' },
    register_fit: { type: 'integer', minimum: 1, maximum: 5, description: 'Register matches the stated genre. 5=exactly right, 1=wrong register for the genre' },
    mechanics_fit: { type: 'integer', minimum: 1, maximum: 5, description: 'Typographic/structural mechanics appropriate to the genre. 5=correct, 1=wrong conventions' },
    readability: { type: 'integer', minimum: 1, maximum: 5, description: 'Clear and easy to read. 5=excellent, 1=poor' },
    genre_fit: { type: 'integer', minimum: 1, maximum: 5, description: 'Overall suitability for the stated genre. 5=ship it for this genre, 1=wrong genre entirely' },
    overall: { type: 'integer', minimum: 1, maximum: 5, description: 'Holistic quality for the stated genre' },
    rationale: { type: 'string', description: 'One or two sentences justifying the scores' },
  },
}

const judgePrompt = (doc, rewrite) => `You are a strict editor evaluating a candidate rewrite for a SPECIFIC document genre. Score it against the
rubric FOR THAT GENRE. Different genres want different registers and mechanics; judge fit to THIS genre only.

${GENRE_GUIDE[doc.genre]}

USE THE FULL 1-5 SCALE; do not cluster at the top. 5 = you would publish it in this genre unedited; 3 = usable
but needs an editing pass; 1 = wrong register/mechanics for this genre. Judge ONLY this version on its own
merits for this genre; you are not told or comparing which style produced it.

--- ORIGINAL (${doc.genre}, for context) ---
${doc.text}

--- CANDIDATE REWRITE ---
${rewrite}`

// ---- Run: full matrix — every style on every genre doc, judged by the doc's genre rubric ----
const results = await pipeline(
  CORPUS,
  async (doc) => {
    const texts = await parallel(
      STYLES.map((s) => () => agent(rewritePrompt(doc, s), { label: `rewrite:${s}:${doc.id}`, phase: 'Rewrite' }))
    )
    const rewrites = {}
    STYLES.forEach((s, i) => (rewrites[s] = texts[i]))
    return { doc, rewrites }
  },
  async (r) => {
    const out = { id: r.doc.id, genre: r.doc.genre }
    const panels = await parallel(STYLES.map((s) => () =>
      parallel([0, 1, 2].map((k) => () =>
        agent(judgePrompt(r.doc, r.rewrites[s]), { label: `judge:${r.doc.genre}:${s}:${k}`, phase: 'Judge', schema: JUDGE_SCHEMA })
      )).then((js) => ({ s, text: r.rewrites[s], judges: js.filter(Boolean) }))
    ))
    panels.forEach((p) => (out[p.s] = { text: p.text, judges: p.judges }))
    return out
  }
)

return { results }
