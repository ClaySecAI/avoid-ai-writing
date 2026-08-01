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
home style for that genre. The result is a clean diagonal — every home style tops
(or ties the top of) its own genre:

| genre | none | google | cmos | apa |
|---|---|---|---|---|
| technical | 4.00 | **5.00** | 4.00 | 4.33 |
| casual | **4.33** | 2.00 | 4.00 | 3.00 |
| prose | 3.67 | 3.33 | **4.00** | 4.00 |
| academic | 4.00 | 3.33 | 4.00 | **4.67** |

What it shows:

- **Each `--style` is the right tool for its genre.** google wins technical (5.00),
  cmos wins prose (4.00, and it leads on `register_fit` 4.67 where apa ties on
  overall), apa wins academic (4.67), and `none` wins casual (4.33).
- **Formalizing casual content is actively wrong** — the sharpest signal. On the
  newsletter doc, google and apa crash to `register_fit`/`genre_fit` of **2.00**
  (`overall` 2.00 and 3.00): a reference/scholarly register is the wrong genre. This
  is the guardrail that the style layer must NOT be applied blindly.
- **google is too terse for prose/academic** (`overall` 3.33 in both) — right
  instinct, wrong genre.
- **Mechanics (linter, each in its own mode):** every home style is mechanically clean
  in its mode. The recurring exception is CMOS/APA curly quotes — the `cmos` rewrites
  still get flagged for `straight-apostrophe`/`straight-double-quote` because the model
  emits straight marks (see the caveat below). Also note the `prose` cmos rewrite trips
  the AIDetector (score 9) on its *deliberate* em dashes — CMOS wants them, the de-AI
  detector flags them; a real tension between the guide and the catalog.

## Do the detailed rules earn their keep? (`terse-vs-detailed.wf.js`, `multi-model/`)

The `--style` sections spell out each guide's mechanics. Are they needed, or does the
model already know Chicago/APA/Google from the name alone? Three conditions were
compared: **rules-only** (mechanics, no guide named), **name-only** (just "apply
Chicago 18th"), and **name + rules** (what the skill ships).

- On a **frontier model (Opus)**, name-only matched name+rules — the model knows the
  guides, and the detailed rules bought little. This is the trap: testing only on a
  strong model makes the rules look redundant.
- Across **smaller / local models** (`multi-model/`: ornith-35b, mistral-24b,
  gemma4-e4b via Ollama, plus Haiku 4.5), name-only was the **weakest** condition
  every time, and the gap widened as the model shrank. mistral-24b leaked mechanics
  violations under name-only (3) that rules/both fixed (0); gemma4-e4b's overall
  dropped to 2.89 (vs 3.67 with rules) and it failed one rewrite outright. `both` was
  best or tied-best on every working model.
- **Conclusion: keep the detailed rules.** The "model already knows it" result is a
  frontier-model artifact; the skill targets *any* assistant, including local models,
  where the rules measurably improve quality and mechanical consistency.

Run: `MODELS=... node evals/multi-model/gen-local.mjs` (writes rewrites + a
`manifest.json`), then pass the manifest as `args` to `multi-model/judge-mm.wf.js`
(it adds Haiku rewrites and judges all blind). ornith-35b is a creative-writing
fine-tune that ignored "return only the rewrite" — a bad fit for copyediting, and
excluded from the conclusion.

## Caveats

- Rewrites are model output, so judge scores and the AIDetector/linter results on
  generated text vary run to run. The linter on a *fixed* file is deterministic.
- n=1 doc per genre. Directional, not a benchmark. Add docs to `corpus/` and to the
  `CORPUS` array in `judge-eval.wf.js` (with a `genre` field) to strengthen it.
- The curly-quote transform is not self-enforcing: models emit straight apostrophes
  even under `--style cmos`/`apa`, which the linter flags. True typographic marks want
  a deterministic post-process, not a prompt instruction.
