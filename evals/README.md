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

**Honest conclusion: unresolved.** The detailed rules are kept because they don't hurt and *may* help the smallest models — but this eval does not establish "keep the rules." A fair test needs a rubric that does NOT name the guides, n>1 docs, and repeated sampling.

Run-specific confounds: a single Sonnet judge (the genre matrix used a different judge, so the two tables aren't comparable); `gen-local.mjs` caps `num_predict: 700`, which truncates verbose models — ornith-35b (a creative fine-tune) was truncated, scored ~1.0, and is excluded, but the truncation is a confound, not simply "it ignored instructions."

Run: `MODELS=... node evals/multi-model/gen-local.mjs` (writes rewrites + `manifest.json`), then pass the manifest as `args` to `multi-model/judge-mm.wf.js` (it adds Haiku rewrites and judges all blind).

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
