# Style-guide evals

Tooling to test what `--style google|cmos|apa` actually does to text. Two halves,
because a style guide is two different things to verify:

| Half | Tool | Deterministic? |
|---|---|---|
| **Mechanics** (quotes, headings, em dash, numbers, dismissive words) | `style-lint.cjs` | Yes |
| **Register / voice / genre fit** | `judge-eval.wf.js` + `aggregate.cjs` | No (LLM judge) |

The de-AI half is covered by the repo's own `AIDetector` (`detector/patterns.js`),
which `style-lint.cjs` also reports.

## The core idea: genre × style

A style guide is only "good" relative to a **document genre**. Google style is right
for API docs and wrong for an essay; Chicago is right for prose and wrong for a CLI
reference. So the eval is a matrix: one AI-sounding source doc per genre, every style
applied to every doc, and each rewrite judged by a rubric **matched to that doc's
genre**. Each mode has a natural home genre where it should win:

| Genre | Home style (should win) |
|---|---|
| technical (API/dev docs) | `google` |
| prose / narrative (essay, nonfiction) | `cmos` |
| academic (scholarly) | `apa` |
| casual (blog / newsletter) | `none` — here formalizing is *wrong* |

The casual row is the sharp test: for informal content, the plain de-AI `none` pass
should beat the formal styles, proving the guides aren't universally "better."

## 1. Register eval (LLM judge)

`judge-eval.wf.js` is a Claude Code workflow. For each doc in `CORPUS` it generates a
rewrite in each style, then a **blind 3-judge panel** scores each rewrite against the
genre rubric. Judges are told the genre but not which style produced the text.

```
Workflow({ scriptPath: "evals/judge-eval.wf.js" })
```

Then aggregate the returned JSON (per-genre tables) and lint the rewrites:

```sh
node evals/aggregate.cjs <workflow-output.json> evals/rewrites
```

## 2. Mechanics linter (deterministic)

Checks the mechanically-verifiable subset of each guide. Each style is checked against
**its own** rules — Google wants straight quotes, sentence-case headings, and numerals
for small numbers; CMOS/APA want the opposite (curly quotes, title case, spelled-out
numbers, deliberate/​sparing em dash). Pass the mode that matches the text.

```sh
node evals/style-lint.cjs evals/rewrites/technical.api-pagination.google.md --style google
node evals/style-lint.cjs evals/rewrites/prose.essay-attention.cmos.md      --style cmos
node evals/style-lint.cjs evals/rewrites/academic.abstract-sleep.apa.md     --style apa --json
```

Advisory rules (`[advisory]`) are heuristic and expected to be noisy (e.g. the
number-spelling checks); they're reported but don't affect the exit code. Exit is
non-zero only on a non-advisory violation, so it works as a CI gate on a known-good
fixture.

`corpus/` holds the source docs, named `<genre>.<id>.md`.

## Findings

Latest run (n=1 doc/genre, 3-judge panel). Judge `overall`, 1-5; **bold** = the
home style for that genre. It *looks* like a clean diagonal, but see below — the
diagonal is partly an artifact of how the rubrics were written:

| genre | none | google | cmos | apa |
|---|---|---|---|---|
| technical | 4.00 | **5.00** | 4.00 | 4.33 |
| casual | **4.33** | 2.00 | 4.00 | 3.00 |
| prose | 3.67 | 3.33 | **4.00** | 4.00 |
| academic | 4.00 | 3.33 | 4.00 | **4.67** |

An adversarial review found the strong version of these claims doesn't hold. Stated conservatively:

**What holds up:**

- **The one robust result: don't apply `google` to casual copy.** google-on-casual craters to `register_fit`/`genre_fit` **2.00** (overall 2.00) — a large effect well clear of the noise floor. This is the real guardrail: the style layer must not be applied blind to genre.
- **The styles produce distinguishable, genre-appropriate output** — each home style tops its own genre in the table.

**What does NOT hold up (do not cite these as findings):**

- **"Each style wins its home genre" is largely circular.** The genre rubrics (`GENRE_GUIDE` in `judge-eval.wf.js`) hand the judge each home style's mechanics as the definition of correctness (the prose rubric literally names "Chicago"; the technical rubric is the Google rule block). The diagonal is partly designed in, not discovered.
- **"Off-genre hurts" is overstated.** Only google-off-genre is clearly bad. cmos and apa are roughly harmless off-genre (4.00 on technical/academic, tied with `none`), and the cmos "prose win" is a tie with apa broken on a sub-metric.
- **Most deltas are noise.** With n=1 doc and three correlated judges scoring integers, a 0.33–0.45 gap is 3–4 judge-points. Only the 2.00-vs-4+ gaps mean anything.

Mechanics (linter, each in its own mode): home styles are clean in their mode except CMOS/APA curly quotes (the model emits straight marks — see the normalizer note). The `prose` cmos rewrite also trips the AIDetector (score 9) on its *deliberate* em dashes — a real guide-vs-catalog tension. (But read the linter's counts with the caveats below; it over-counts.)

## Do the detailed rules earn their keep? (`terse-vs-detailed.wf.js`, `multi-model/`)

The `--style` sections spell out each guide's mechanics. Are they needed, or does the
model already know Chicago/APA/Google from the name alone? Three conditions were
compared: **rules-only** (mechanics, no guide named), **name-only** (just "apply
Chicago 18th"), and **name + rules** (what the skill ships).

- On **Opus**, name-only matched name+rules (google identical at the 5.00 ceiling). A frontier model knows the guides.
- Across **smaller/local models the picture is mixed, not a clean win for the rules** (judge `overall`):
  - mistral-24b: rules 4.11, **name 4.56**, both 4.44 — name-only was its *best* condition.
  - haiku-4.5: rules 4.22, name 3.78, both 4.44 — name-only weakest.
  - gemma4-e4b: rules 3.67, name 2.89, both 3.67 — name-only weakest, but that run produced one degenerate (truncated) document that accounts for most of the gap.

  So name-only is clearly worst only for gemma and haiku; "the gap widens as the model shrinks" rests on ~2 usable points with no established size ordering (haiku vs mistral).
- **The mechanics case is neutralized by our own normalizer.** The one crisp signal (mistral name-only leaked 3 mechanics violations vs 0 for rules/both) is exactly what `scripts/normalize-quotes.cjs` fixes deterministically after every `--style` pass. Post-normalizer the conditions converge on mechanics; any remaining case would have to come from register, where the deltas are noise-scale.

That first comparison was **circular** — its rubric named each guide's mechanics as the definition of correctness. `multi-model/gen-neutral.mjs` + `judge-neutral.wf.js` re-run the three conditions with a rubric that **names no guide and prescribes no mechanics**, n=2 docs/genre, on gemma4-e4b / mistral-24b / Haiku 4.5 (Sonnet judge). Judge `overall` (18 samples/cell):

| model | rules | name | both |
|---|---|---|---|
| gemma4-e4b | **4.06** | 3.17 | 3.22 |
| mistral-24b | **4.17** | 4.06 | 3.72 |
| haiku-4.5 | 4.39 | 4.28 | **4.44** |

- **`rules-only` is best or tied-best on quality for every model** — the concrete directives help, most on the smallest model (gemma).
- **Naming the guide adds little, and hurts the small model:** gemma rules 4.06 vs `both` 3.22 (−0.84). The value is the directives, not the guide name.
- Mechanics (fixed linter, hard/1k words) favor `both` (gemma 0.0), but that's moot — the normalizer handles marks regardless.

**Conclusion (de-biased): keep the detailed rules** — they help quality, most on the small/local models the skill also targets. The **guide name**, though, earns its keep only at the top end (see the tier test next). Caveats: n=2; gemma produced a couple of short outputs under name/both that drag those cells; Sonnet judge; the biased table above is kept only to show why the neutral re-run was needed.

### Does the guide name help stronger models? (`multi-model/judge-tiers.wf.js`)

A cloud-only follow-up: Opus / Sonnet / Haiku as rewriters × rules/name/both, a harder corpus (2 docs/genre) and a strict full-scale neutral rubric to fight ceiling saturation, single fixed Opus judge. `name − rules` on `overall`, placed against gemma from the neutral run:

| model (weak → strong) | name − rules |
|---|---|
| gemma-e4b | −0.89 |
| haiku-4.5 | −0.33 |
| sonnet-5 | 0.00 |
| opus-4.8 | +0.33 |

A clean **monotonic gradient**: the guide name's value rises with model capability — it hurts small models and helps the strongest. By genre, the Opus advantage is **entirely technical/Google** (+1.00; prose and academic are flat), so the name pays off only when a strong model already knows that guide well.

**So there is no universal phrasing.** The name's harm to small models (−0.89) exceeds its help to the strongest (+0.33). Decision: **keep `both` (name + rules) as the shipped default** — the skill's main audience is capable assistants, and `both` banks the Opus/Google win — and **add a SKILL note that small/local models do better acting on the rules with the guide name secondary.** (Both changes are on `feat/style-guides`.) A blanket rules-forward rewrite is *not* warranted; it would forfeit the top-tier gain. Caveats: 1 judge/cell (6 samples); any single ±0.33 is ~2 judge-points — the 4-tier monotonic line is the robust part; the Opus judge shifts the Opus row's level (self-preference), not the within-row name-vs-rules contrast.

Run the biased comparison: `MODELS=... node evals/multi-model/gen-local.mjs` → pass `manifest.json` as `args` to `judge-mm.wf.js`. Neutral (small/local): `MODELS=... node evals/multi-model/gen-neutral.mjs`, inline into `judge-neutral.wf.js`, run. Tier test (cloud): run `multi-model/judge-tiers.wf.js` directly (no local gen).

## Caveats

- **Linter counts still aren't comparable across styles** (inherent): cmos/apa flag
  every straight mark while google has no equivalent failure surface, so google looks
  clean by construction — don't compare hard counts across styles. Word-sense uses
  ("returns *just* the first page"), number-spelling, and em-dash rate are now
  **advisory** (excluded from the hard count), and the em-dash threshold is aligned to
  the skill's 1/1,000. Use `hardPerKw` (hard violations per 1,000 words), not the raw
  count, to compare outputs of different length.
- Rewrites are model output, so judge scores and linter results on generated text vary
  run to run. The linter on a *fixed* file is deterministic.
- n=1 doc per cell; no repeated sampling; no confidence intervals. Directional only.
  Add docs to `corpus/` and to the `CORPUS` arrays (with a `genre` field) to strengthen it.
- The corpus docs are seeded with the exact cliches the de-AI prompt enumerates, so
  `ai_tells_removed` is inflated and flat across conditions; results say little about
  real drafts. The corpus, rules, and rubrics share an author.
- The curly-quote transform is not self-enforcing: models emit straight marks even
  under `--style cmos`/`apa`. That is what the normalizer is for.
