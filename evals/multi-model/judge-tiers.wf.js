export const meta = {
  name: 'tiers-name-vs-rules',
  description: 'Does the guide NAME help stronger models? Opus/Sonnet/Haiku x rules/name/both, neutral strict rubric',
  phases: [{ title: 'Rewrite', detail: '3 tiers x 3 conditions per doc' }, { title: 'Judge', detail: 'strict neutral 3-judge (Opus) panel' }],
}

// Harder, longer corpus so strong models don't saturate at 5. 2 docs/genre.
const CASES = [
  { id: 'idempotency', genre: 'technical', style: 'google', text: `# Making Requests Idempotent

In the world of distributed systems, network failures are simply a fact of life, and that's where idempotency keys come to the rescue. They're an absolutely essential tool for ensuring that retrying a request never accidentally charges a customer twice or creates duplicate records.

## How It Works

It's important to understand that any request which creates or modifies a resource can accept an optional Idempotency-Key header. Simply generate a unique key (a UUID works great) and include it with your request. If the request succeeds, we store the result and associate it with that key for 24 hours. Should you retry with the same key, we'll return the original response instead of performing the operation again—no duplicates, no headaches.

There are a few gotchas worth noting. First, keys are scoped to your account, so collisions across accounts simply aren't a concern. Second, if you reuse a key with different request parameters, we'll return an error, because that almost certainly indicates a bug in your retry logic. Finally, keys expire after 24 hours, so a retry sent days later will be treated as a brand new request.` },
  { id: 'rate-migration', genre: 'technical', style: 'google', text: `# Migrating to Token-Bucket Rate Limits

We're thrilled to announce that we're rolling out a brand new rate-limiting system, and it's a massive improvement over the old fixed-window approach! This guide will walk you through everything you need to know to migrate smoothly.

## What's Changing

Previously, your limit reset at the top of each minute, which meant a burst of traffic could exhaust your entire quota in the first few seconds and leave you throttled for the rest of the minute. The new token-bucket model is far more forgiving: you accumulate tokens continuously, up to a maximum burst capacity, and each request spends one token.

## What You Need to Do

The good news is that for most users, absolutely no action is required—the new limits are strictly more generous. However, if you've built custom retry logic around the old X-RateLimit-Reset header, you'll want to update it. The new response includes X-RateLimit-Remaining and a Retry-After header on 429 responses, which together tell you exactly how long to wait. We strongly recommend honoring Retry-After rather than implementing your own backoff.` },

  { id: 'attention-econ', genre: 'prose', style: 'cmos', text: `# The Attention Economy's Hidden Tax

In today's hyper-connected world, we've grown accustomed to thinking of our attention as infinite, a resource we can spend freely across a dozen open tabs and a buzzing phone. But nothing could be further from the truth. Attention is perhaps the scarcest resource we possess, and the modern economy has been engineered, with breathtaking precision, to extract every last drop of it.

## The Machinery of Distraction

Let's dive into the mechanics. Every notification, every autoplay, every infinite scroll is the product of teams of brilliant engineers whose sole mandate is to capture and hold your gaze. These aren't accidents; they're features, honed through relentless A/B testing to exploit the very wiring of the human brain. The result is a kind of learned helplessness, a sense that we simply cannot look away.

And here's the truly insidious part: the cost is largely invisible. We don't receive a bill for our fractured focus, our shallow reading, our half-present conversations. The tax is paid quietly, in the currency of depth—the depth of thought, of relationship, of work that only sustained concentration can produce.` },
  { id: 'mastery', genre: 'prose', style: 'cmos', text: `# The Long Road to Mastery

We live in an age obsessed with hacks, shortcuts, and the promise that anything worth doing can be done faster. But when it comes to genuine mastery, there simply are no shortcuts, and that's a truth worth sitting with.

## Ten Thousand Hours, Reconsidered

You've probably heard of the ten-thousand-hour rule, the idea that expertise requires roughly that many hours of practice. But the popular version misses the crucial caveat: it's not just any practice that counts. It's deliberate practice—focused, effortful, and often deeply uncomfortable work at the very edge of your ability.

This is why so many people plateau. They put in the hours, but they spend them comfortably, repeating what they already know rather than struggling with what they don't. The violinist who runs through familiar pieces will never improve like the one who isolates the four bars that trip her up and plays them, badly, a hundred times. Mastery, it turns out, is less about time than about the willingness to be bad at something long enough to become good.` },

  { id: 'sleep-memory', genre: 'academic', style: 'apa', text: `# Sleep Quality and Memory Consolidation: A Longitudinal Study

Sleep is absolutely crucial when it comes to how we form and retain memories, and in this groundbreaking study we dive deep into that fascinating relationship. Prior work has established that sleep supports consolidation, but the role of sleep quality, as distinct from mere duration, remains surprisingly understudied.

## Method and Findings

We followed a diverse cohort of 120 participants over an eight-week period, tracking sleep quality via actigraphy and administering weekly memory-recall assessments. Our results clearly demonstrate that participants who enjoyed high-quality sleep performed dramatically better on recall tasks than those with fragmented sleep, even when total sleep duration was held constant.

It's worth noting that a single night of poor sleep had a significant negative impact on next-day performance, an effect that persisted even after a subsequent night of recovery sleep. These findings underscore the undeniable importance of sleep quality and open up exciting new avenues for interventions targeting not just how long we sleep, but how well.` },
  { id: 'exercise-cognition', genre: 'academic', style: 'apa', text: `# Aerobic Exercise and Executive Function in Older Adults

It's no secret that exercise is great for the body, but its impact on the aging brain is nothing short of remarkable. This study set out to explore the powerful connection between regular aerobic exercise and executive function in a population of adults aged 65 and older.

## Results and Discussion

Participants were randomly assigned to either a 12-week supervised aerobic program or a stretching-and-toning control condition. The results were truly striking: the aerobic group showed dramatic improvements on tasks measuring working memory and cognitive flexibility, absolutely blowing the control group out of the water.

Interestingly, the magnitude of cognitive improvement correlated with gains in cardiorespiratory fitness, suggesting a dose-response relationship that future work should absolutely pursue. While the mechanisms remain to be fully elucidated, these findings make it crystal clear that aerobic exercise should be a cornerstone of any strategy for preserving cognitive health in later life.` },
]

const DEAI = `You are applying the "avoid AI writing" skill. Remove AI-writing tells: cut cliches and filler ("in today's hyper-connected world", "dive into", "it's worth noting", "come to the rescue", "no secret", "nothing short of", "blowing out of the water", "here's the truly", "the good news is"), hype, and empty inflation. Preserve the meaning, ALL specific facts and numbers, and the content's genre. Prefer clear, direct wording.`
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

const GENRE_GUIDE = {
  technical: `GENRE: developer reference documentation. Good output is clear, concise, scannable, direct and action-oriented, with a consistent professional register and no marketing language or hype, and it preserves every technical fact. Do NOT reward or penalize any specific mechanical convention (heading case, quote style, number style).`,
  prose: `GENRE: published long-form prose (essay). Good output has coherent flow, a consistent authorial voice, varied and readable sentences, a preserved argument, and no AI cliches or filler. Do NOT reward or penalize any specific mechanical convention.`,
  academic: `GENRE: formal scholarly writing. Good output is formal, precise, and objective, with measured, qualified claims, preserved facts and numbers, and no hype or salesmanship. Do NOT reward or penalize any specific mechanical convention.`,
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
const judgePrompt = (doc, rewrite) => `You are a demanding editor scoring a rewrite for a specific genre. Judge quality ONLY; do NOT reward or penalize any mechanical/typographic convention (quote style, heading case, number style).

${GENRE_GUIDE[doc.genre]}

USE THE FULL 1-5 SCALE AND SPREAD IT. Anchors: 5 = you would publish it in this genre unedited, genuinely excellent; 4 = solid, one or two small edits; 3 = usable but needs a real editing pass; 2 = notable problems; 1 = poor. Most competent output is a 3 or 4 — reserve 5 for the exceptional. Do NOT cluster at the top. Judge ONLY this version on its own merits; you are not told which model or process produced it.

--- ORIGINAL (${doc.genre}) ---
${doc.text}

--- CANDIDATE REWRITE ---
${rewrite}`

const REWRITERS = ['opus', 'sonnet', 'haiku']
const CONDS = ['rules', 'name', 'both']

const results = await pipeline(
  CASES,
  async (doc) => {
    const combos = REWRITERS.flatMap((m) => CONDS.map((c) => ({ m, c })))
    const rewrites = (await parallel(combos.map(({ m, c }) => () =>
      agent(buildPrompt(doc, c), { label: `rw:${m}:${c}:${doc.id}`, phase: 'Rewrite', model: m })
        .then((text) => ({ model: m, cond: c, text }))
    ))).filter(Boolean)
    return { doc, rewrites }
  },
  async (r) => {
    // Reduced to 1 judge/cell after a session-limit hit; 6 docs still give 6 samples/cell.
    const judged = await parallel(r.rewrites.map((rw) => () =>
      parallel([0].map((k) => () =>
        agent(judgePrompt(r.doc, rw.text), { label: `j:${rw.model}:${rw.cond}:${r.doc.id}:${k}`, phase: 'Judge', model: 'opus', schema: JUDGE_SCHEMA })
      )).then((js) => ({ model: rw.model, cond: rw.cond, id: r.doc.id, genre: r.doc.genre, text: rw.text, judges: js.filter(Boolean) }))
    ))
    return { id: r.doc.id, genre: r.doc.genre, judged }
  }
)
return { results }
