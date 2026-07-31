# Style-guide evals

Tooling to test what `--style google|cmos|apa` actually does to text. Two halves,
because a style guide is two different things to verify:

| Half | Tool | Deterministic? |
|---|---|---|
| **Mechanics** (quotes, headings, em dash, numbers, dismissive words) | `style-lint.cjs` | Yes |
| **Register / voice** ("reads like a reference manual", not casual) | `judge-eval.wf.js` + `aggregate.cjs` | No (LLM judge) |

The de-AI half is covered by the repo's own `AIDetector` (`detector/patterns.js`),
which `style-lint.cjs` also reports.

## 1. Mechanics linter (deterministic)

Checks the mechanically-verifiable subset of each guide. Each style is checked
against **its own** rules — Google wants straight quotes, sentence-case headings,
and numerals for small numbers; CMOS wants the opposite (curly quotes, title case,
spelled-out numbers, deliberate em dash). Running the wrong mode flags correct
output, so pass the mode that matches the text.

```sh
node evals/style-lint.cjs path/to/output.md --style google
node evals/style-lint.cjs path/to/output.md --style cmos --json
```

Advisory rules (`[advisory]`) are heuristic and expected to be noisy (e.g. the
number-spelling checks); they are reported but don't affect the exit code. Exit is
non-zero only on a non-advisory violation, so it works as a CI gate on a known-good
fixture.

## 2. Register eval (LLM judge)

`judge-eval.wf.js` is a Claude Code workflow. For each doc in its embedded corpus it
generates a `none`, `google`, and `cmos` rewrite, then a **blind 3-judge panel**
scores each version against a *guide-neutral technical-documentation* rubric (the
judges are not told which variant they are scoring, or that any guide is the target).

Run it from a Claude Code session:

```
Workflow({ scriptPath: "evals/judge-eval.wf.js" })
```

Then aggregate the returned JSON and lint the generated rewrites:

```sh
node evals/aggregate.cjs <workflow-output.json> evals/rewrites
node evals/style-lint.cjs evals/rewrites/rate-limits.google.md --style google
node evals/style-lint.cjs evals/rewrites/rate-limits.cmos.md   --style cmos
```

`corpus/` holds the source docs (longer, AI-sounding, seeded with conversational
hooks that tempt a plain de-AI pass to drift casual — the hard case for register).

## What the current corpus shows

- **Google is the clear win for technical docs.** On inputs that tempt casual drift,
  the plain de-AI pass (`none`) lands ~3.7/5 on register and technical-fit (judges:
  "reads like a tutorial voice"); `--style google` holds ~4.75/5 and is mechanically
  clean in `google` mode every time.
- **CMOS on this corpus is an away game — by design.** The corpus is developer
  reference docs; CMOS targets published prose. On a docs rubric CMOS scores about the
  same as `none` (~3.6), because it isn't trying to produce a reference register. A
  fair CMOS quality number needs a prose/publishing corpus and a CMOS-conformance
  rubric, not this one.
- **The curly-quote transform isn't self-enforcing.** In `cmos` mode the linter flags
  `straight-apostrophe` on the CMOS rewrites: the model emits straight `'` in
  contractions even when told to use typographic marks. If CMOS/APA output needs true
  curly marks, that wants a deterministic post-process, not a prompt instruction.

## Caveats

- Rewrites are model output, so the judge scores and the AIDetector/linter results on
  generated text vary run to run. The linter on a *fixed* file is deterministic.
- n=4 docs. Directional, not a benchmark. Add docs to `corpus/` (and to the `CORPUS`
  array in `judge-eval.wf.js`) to strengthen it.
- The judge rubric is tuned for technical documentation. It is the wrong yardstick for
  CMOS/APA prose quality.
