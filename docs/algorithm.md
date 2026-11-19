# How drift is classified

QuantDrift compares each quantized output with the **FP16 output for the same prompt** and
puts the pair into one of three classes. The comparison depends on the task type, because
"the same answer" means something different for a sum, a program and a translation.

| Class | Meaning |
|---|---|
| `no_drift` | The text is identical (after trimming whitespace). |
| `benign` | The text differs, but the answer, behavior or meaning is preserved. |
| `dangerous` | A wrong answer, changed code behavior, a syntax error, or a changed meaning. |

The entry point is `DriftClassifier.classify` in `analyzer/src/classifier.py`. Identical text
short-circuits to `no_drift` for every category; otherwise the category picks the method.

## Why not just compare embeddings?

Sentence embeddings measure topical closeness, and a wrong number is topically identical to a
right one. Measured with `all-MiniLM-L6-v2`:

| Pair | Cosine similarity |
|---|---|
| `"The answer is 391."` vs `"The answer is 361."` | 0.884 |
| `"391"` vs `"361"` | 0.779 |
| `"17 * 24 = 408"` vs `"17 * 24 = 336"` | 0.686 |

The first pair differs by one digit and scores above the 0.85 "paraphrase" cutoff used for
chat, so a similarity-only check would call a wrong answer harmless. That is why math and code
get their own verifiers and embeddings are only used where meaning is the thing being compared.

## Math

`MathVerifier` extracts a final numeric answer from each output and compares the numbers.

1. If the output has a `\boxed{...}` answer, the last one wins. Braces are matched properly,
   so `\boxed{\frac{3}{8}}` is read as 0.375 (a plain regex stops at the first `}` and misreads it).
2. Otherwise a list of patterns is tried in order: "the answer is", "answer:", `=`, a bold
   number at the end, and finally a trailing number. Commas are stripped and `a/b` fractions
   are evaluated.
3. Two answers match if they are equal or within a relative tolerance of 1e-6.

| Situation | Class |
|---|---|
| Both numbers found and equal | `benign` ("same answer, different wording") |
| Both numbers found and different | `dangerous` ("wrong answer: A → B") |
| No number on one side, but the same symbolic expression on both | `benign` |
| Otherwise: embedding similarity > 0.95 | `benign` |
| Otherwise | `dangerous` |

## Code

`CodeVerifier` extracts the first fenced code block (or the text from the first `def`),
checks that it parses, then **runs both programs on the same inputs and compares what they
do**.

1. Syntax: `ast.parse` on each extracted block.
2. Behavior: the first top-level function of each block is called on a fixed set of 18
   argument lists covering numbers, strings, lists, nested lists and two-argument calls
   (`[]`, `[10]`, `["racecar"]`, `[[64, 34, 25, 12, 22, 11, 90]]`, `[[2, 7, 11, 15], 9]`, ...).
   For each call it records the return value **and the arguments after the call**, so
   in-place algorithms (sorting, reversing) are compared too.
3. The baseline is the reference: inputs the FP16 code cannot handle are ignored. Every
   input FP16 handles must give the same return value and the same resulting arguments in
   the quantized code (a quantized function that raises there counts as different).
4. If nothing was runnable on either side, the two programs are compared structurally
   (`ast.dump`).

Each program runs in its own `python -I` subprocess with a 5-second timeout, so a degraded
model that emits an infinite loop cannot hang or starve the API process. Note that this is a
resource guard and not a security sandbox: the code is not isolated from the filesystem or
network, so only run QuantDrift on outputs of models you are benchmarking, not on untrusted
input.

| Situation | Class |
|---|---|
| FP16 parses, quantized does not | `dangerous` ("syntax errors") |
| Both parse, same behavior on every comparable input | `benign` |
| Both parse, behavior differs | `dangerous` |
| Neither parses: similarity > 0.85 | `benign`, else `dangerous` |
| FP16 does not parse but quantized does: similarity > 0.90 | `benign`, else `dangerous` |

## Translation, summarization and chat

These use embedding similarity between the two outputs (`SemanticVerifier`, cosine
similarity of `all-MiniLM-L6-v2` embeddings, clipped to 0..1).

| Category | `no_drift` | `benign` | `dangerous` |
|---|---|---|---|
| Translation | > 0.95 | > 0.80 | otherwise |
| Summarization, chat | > 0.95 | > 0.85 | otherwise |

The cutoffs are hand-picked, not calibrated against labelled data, and they are the weakest
part of the method; see [the benchmark report](benchmark-report.md) for the cases where they
fire on a correct paraphrase. Errors raised by the runner (`ERROR: ...` outputs) are always
`dangerous`.

## From classes to a verdict

Per task type and config, the analyzer reports two rates over the prompts of that type:

- **drift rate** = (benign + dangerous) / total
- **dangerous rate** = dangerous / total

The verdict comes from the dangerous rate (`statistics.verdict`):

| Dangerous rate | Verdict |
|---|---|
| exactly 0% | `safe` |
| below 5% | `caution` |
| 5% or more | `unsafe` |

The dashboard always pairs a verdict colour with an icon and a label. The thresholds live in
one place in the backend, and the API returns the verdict with each heatmap cell so the UI
never re-derives it.

Two things to keep in mind when reading a verdict: it is relative to FP16 (not to ground
truth), and with fewer than 20 prompts per cell the `caution` level cannot occur, because one
dangerous prompt is already 5% or more.
