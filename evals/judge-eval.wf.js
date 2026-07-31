export const meta = {
  name: 'style-google-eval',
  description: 'Blind LLM-judge eval: does --style google read better as technical docs than --style none?',
  phases: [
    { title: 'Rewrite', detail: 'generate none + google rewrites per doc' },
    { title: 'Judge', detail: 'blind 3-judge register rubric per version' },
  ],
}

// ---- Corpus: LONGER AI-sounding docs with conversational hooks that tempt a
//      plain de-AI pass to drift chatty (harder register test than v1). ----
const CORPUS = [
  { id: 'rate-limits', text: `# Understanding Rate Limits

Let's be honest—nobody loves hitting a rate limit. But here's the thing: rate limits are actually your friend, and once you wrap your head around how they work, you'll never look at them the same way again. In this guide, we'll dive deep into everything you need to know.

## What Are Rate Limits, Anyway?

At their core, rate limits are simply a way for our API to protect itself from being overwhelmed. Think of it like a bouncer at a club—only so many requests can come in at once. Pretty neat, right? Every plan comes with its own limits, and it's super important to know yours.

The default tier gives you a whopping 100 requests per minute, while our Pro tier bumps that up to a generous 1,000 requests per minute. Enterprise? Well, that's basically unlimited for all intents and purposes.

## Handling Rate Limit Errors

So what happens when you go over? You'll get a 429 response, and honestly, that's totally fine—it's just the API's way of saying "hey, slow down a sec." The response includes a Retry-After header that tells you exactly how long to wait. Just grab that value, wait it out, and you're good to go. Easy peasy!

Our SDK handles all of this for you automatically under the hood, so in most cases you won't even have to think about it. Pretty awesome, huh?` },

  { id: 'getting-started', text: `# Getting Started With the SDK

Welcome aboard! We're absolutely thrilled to have you here, and we can't wait to see what you'll build. Getting started is a breeze, and before you know it, you'll be shipping features like a pro. Let's jump right in!

## Step 1: Grab Your API Key

First things first, you'll need an API key. Head on over to your dashboard, click that shiny "Create Key" button, and boom—you've got yourself a key. Make sure to copy it somewhere safe, because for security reasons we'll only show it to you once. Trust us, you don't want to lose it!

## Step 2: Install the Package

Now for the fun part. Simply fire up your terminal and run our install command. It'll pull down everything you need and set it all up automatically. Node 18 or higher is required, so just double-check you've got that first.

## Step 3: Make Your First Call

This is where the magic happens! Import the client, pass in your key, and make a call. That's literally it. If everything's set up correctly, you'll get back a lovely response object packed with all the data you could ever want. Congrats—you're officially up and running!` },

  { id: 'caching-practices', text: `# Caching Best Practices

Caching is one of those things that can feel a little intimidating at first, but honestly? Once you get the hang of it, it's a total game-changer for performance. Let's talk about how to do it right.

## Cache What Actually Matters

Here's a little secret: you don't need to cache everything. In fact, you really shouldn't! The trick is to focus on data that's expensive to compute and doesn't change all that often. User profiles? Great candidate. Real-time stock prices? Yeah, maybe not so much.

## Set Sensible Expiration Times

This is where a lot of folks trip up. You'll want to set a TTL (that's "time to live" for the uninitiated) that strikes the right balance. Too short and you're not really getting the benefit; too long and you risk serving up stale data, which nobody wants. A good rule of thumb is to start somewhere around 300 seconds and tune from there.

## Don't Forget to Invalidate

Last but certainly not least: invalidation. As the famous saying goes, there are only two hard things in computer science, and cache invalidation is one of them! Whenever the underlying data changes, you'll need to bust the cache. It's a bit of a pain, but trust me, it's absolutely worth getting right.` },

  { id: 'error-faq', text: `# Frequently Asked Questions: Errors

Got questions about errors? You've come to the right place! We've rounded up the questions we hear most often and answered them in plain English. Let's dig in.

## Why am I getting a 401 error?

Great question! Nine times out of ten, a 401 simply means there's something up with your authentication. Maybe your token expired, or maybe it wasn't included in the request at all. Double-check that you're passing your API key in the Authorization header, and you should be golden.

## What's the deal with 500 errors?

Ugh, 500 errors—nobody likes those. The good news is that these are on us, not you. It means something went sideways on our end. If you see one, don't panic! Just retry the request after a short wait, and if it keeps happening, feel free to reach out to our support team. We're always happy to help.

## How do I debug a failed request?

Ah, the age-old question! Our best advice is to start by logging the full response body—it's packed with helpful details about what went wrong. Every error response includes a handy error code and a human-readable message that'll point you in the right direction. From there, it's usually pretty smooth sailing.` },
]

// ---- Faithful rule blocks from the fork's SKILL.md ----
const DEAI = `You are applying the "avoid AI writing" skill. Rewrite the text to remove AI-writing tells:
cut fluff, hype, hedging, wordiness, and cliches ("game-changer", "dive into", "unlock", "seamlessly",
"in today's fast-paced", "it's worth noting", "at their core", "flip the script"); prefer active voice;
use em dashes sparingly; use straight quotes. Preserve all technical meaning and structure.`

const HUMANIZE = `Default register guidance (--style none): make the prose sound natural and human, not robotic.
Keep some natural variation; do not sand away all personality into stiff, uniform prose.`

const GOOGLE = `Apply the Google Developer Documentation Style Guide (--style google) ON TOP of the de-AI pass.
OVERRIDE the humanization guidance with these two rules:
1. Register beats humanization. Technical docs want a clear, consistent documentation register — second
   person ("you"), present tense, active voice, one idea per sentence — NOT injected personality. This is
   the fix for a rewrite that came out too casual for technical content.
2. Structure is correct, not a tell. Parallel bullet lists, numbered steps, imperative instructions, and
   parameter tables are the norm. Headings are SENTENCE CASE. Straight quotes and the serial (Oxford) comma
   required. Imperative mood for steps. Cut "please/simply/just/easily/obviously/of course". Reserve e.g./i.e.
   for parentheses. Use numerals for quantities including 0-9. Descriptive link text, never "click here".`

const CMOS = `Apply The Chicago Manual of Style, 18th ed. (--style cmos) ON TOP of the de-AI pass. CMOS targets polished
PUBLISHED PROSE, not developer reference docs. OVERRIDE these de-AI defaults:
1. Em dash. Use "—" (closed up, no surrounding spaces) DELIBERATELY for a break or an amplifying element; do
   NOT drive em dashes to zero. Convert "--" to "—". Use en dash "–" for number/date/page ranges. Still avoid
   the AI habit of 3+ em-dash-joined clauses in one paragraph.
2. Headings. TITLE (headline) case, applied consistently; lowercase articles, coordinating conjunctions, and
   prepositions unless first or last word.
3. Quotation marks. Typographic (curly) marks "" '' and the apostrophe ' in prose; straight marks only in code.
Also: serial (Oxford) comma required; spell out whole numbers ZERO THROUGH ONE HUNDRED in prose (numerals
above that); write "45 percent"; keep a consistent register appropriate to edited prose.`

const RULES = { none: HUMANIZE, google: GOOGLE, cmos: CMOS }
const rewritePrompt = (doc, mode) => `${DEAI}

${RULES[mode]}

Return ONLY the rewritten markdown, no preamble or explanation.

--- SOURCE ---
${doc.text}`

// ---- Guide-neutral technical-documentation rubric (does NOT name Google) ----
const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['register', 'imperative_actions', 'concision', 'no_ai_personality', 'technical_fit', 'overall', 'rationale'],
  properties: {
    register: { type: 'integer', minimum: 1, maximum: 5, description: 'Consistent, professional documentation register (not chatty/blog/casual). 5=reads like a reference manual, 1=reads like a marketing blog' },
    imperative_actions: { type: 'integer', minimum: 1, maximum: 5, description: 'Instructions are action-first and imperative where appropriate. 5=clear imperative steps, 1=vague/passive' },
    concision: { type: 'integer', minimum: 1, maximum: 5, description: 'One idea per sentence, no padding. 5=tight, 1=bloated' },
    no_ai_personality: { type: 'integer', minimum: 1, maximum: 5, description: 'Free of injected "personality", hype, and filler enthusiasm. 5=none, 1=lots' },
    technical_fit: { type: 'integer', minimum: 1, maximum: 5, description: 'Overall suitability for professional technical documentation. 5=ship it, 1=wrong genre' },
    overall: { type: 'integer', minimum: 1, maximum: 5, description: 'Holistic quality as technical documentation' },
    rationale: { type: 'string', description: 'One or two sentences justifying the scores' },
  },
}

const judgePrompt = (doc, rewrite) => `You are a strict technical-documentation editor evaluating a candidate rewrite for use as
PROFESSIONAL TECHNICAL DOCUMENTATION (developer docs, API references, CLIs). Score it against the rubric.

USE THE FULL 1-5 SCALE. Do NOT cluster at the top. Anchors:
- 5 = indistinguishable from a polished reference manual; you would ship it unedited.
- 4 = solid, one or two small nits.
- 3 = usable but clearly needs an editing pass for register or structure.
- 2 = reads like a blog post or tutorial voice, not reference docs.
- 1 = pervasively chatty/marketing.
Reserve 5 only for prose with no residual conversational tone. PENALIZE, as register/personality defects:
rhetorical questions to the reader, exclamation points, "let's", "honestly", "trust me", "here's the thing",
"pretty neat/awesome", figures of speech and analogies ("like a bouncer"), asides in parentheses, and
over-familiar second person. Judge ONLY this version on its own merits; you are not comparing against anything.

--- ORIGINAL (for context) ---
${doc.text}

--- CANDIDATE REWRITE ---
${rewrite}`

// ---- Run: rewrite (none+google+cmos) then blind judge panel per version ----
const VARIANTS = ['none', 'google', 'cmos']
const results = await pipeline(
  CORPUS,
  async (doc) => {
    const [none, google, cmos] = await parallel(
      VARIANTS.map((m) => () => agent(rewritePrompt(doc, m), { label: `rewrite:${m}:${doc.id}`, phase: 'Rewrite' }))
    )
    return { doc, none, google, cmos }
  },
  async (r) => {
    const panel = (text, variant) => parallel([0, 1, 2].map((k) => () =>
      agent(judgePrompt(r.doc, text), { label: `judge:${variant}:${r.doc.id}:${k}`, phase: 'Judge', schema: JUDGE_SCHEMA })
    ))
    const [noneJ, googleJ, cmosJ] = await Promise.all([
      panel(r.none, 'none'), panel(r.google, 'google'), panel(r.cmos, 'cmos'),
    ])
    return {
      id: r.doc.id,
      none: { text: r.none, judges: noneJ.filter(Boolean) },
      google: { text: r.google, judges: googleJ.filter(Boolean) },
      cmos: { text: r.cmos, judges: cmosJ.filter(Boolean) },
    }
  }
)

return { results }