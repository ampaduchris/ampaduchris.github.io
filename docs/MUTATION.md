# Mutation report (R2, session 5.7)

Stryker 10.1.1 with the Vitest runner, run once on 22 Nov 2026 on commit `s/5.7` (after the fixes for review 5.6). No floor applies (`DESIGN.md` proposals P3 and P18; `STANDARD.md` R2). This is the score and every mutant that survived, each with a reason.

Command: `npx stryker run` (configuration in `stryker.config.json`; `npm run mutate`). It mutates three things: `src/lib/numbers.ts` (the numbers script's logic), `src/lib/schema.ts` (the data schema check) and lines 47 to 79 of `src/lib/mark.ts` (`ringRadii` and `layout()`). It runs the Vitest suite only, with per-test coverage. Playwright is not run, so wording that only a browser test checks counts as unkilled here.

## Score

| File | Score (all) | Score (covered) | Killed | Survived | No coverage | Run-time errors |
| --- | --- | --- | --- | --- | --- | --- |
| `numbers.ts` | 71.78 | 73.82 | 234 | 83 | 9 | 0 |
| `schema.ts` | 60.37 | 66.44 | 198 | 100 | 30 | 0 |
| `mark.ts` (`layout()` and `ringRadii`) | 69.35 | 69.35 | 43 | 19 | 0 | 7 |
| **All** | **66.34** | **70.16** | **475** | **202** | **39** | **7** |

Run-time errors are mutants that make the code throw outside a test. Stryker leaves them out of the score. They are listed below so that none is hidden.

## What the survivors say

A survivor shows a gap in the tests, not a wrong number on the site; the committed outputs still match the snapshot check. Of the 241 survived and no-coverage mutants, the reasons fall in two kinds. Test gap: no test gives the input that tells the original from the mutant (an invalid value for a schema field, the wording of a label, a tie in a sort). Equivalent: the mutant gives the same result for every input the code can receive. The reviewer's probes P3a, P3b and P4 are not in this list because the tests added in 5.7 kill them.

The largest gap is `schema.ts`: the tests cover missing fields, an unknown field, one wrong type, the label limit, duplicates and the two headline rules, but give no invalid value for most other fields. The honest reading is that the schema check is untested for any input that is not one of those cases. Adding one invalid value per field would kill most of the 130 survivors there. That is not done in 5.7, and it is not a MUST of the spec.

## Surviving mutants

Rows are grouped by line. Kind is "Test gap", "Equivalent" or "Not a survivor" (run-time error only).

### `numbers.ts`

| Line | Mutants | Status | Kind | Reason |
| --- | --- | --- | --- | --- |
| numbers.ts:5 | 1 | Survived 1 | Test gap | The fetch path reads this constant. `computeNumbers` takes the cut-off from the snapshot, and no unit test runs the fetch. |
| numbers.ts:49 | 2 | Survived 2 | Test gap | The loop over `models`. Fixture entries have an empty list. |
| numbers.ts:56 | 3 | Survived 3 | Test gap | Regex anchors and whitespace quantifiers. Fixture rows are all well formed, with no indented or malformed row. |
| numbers.ts:58 | 1 | Survived 1 | Test gap | No test passes a `portfolio` that is not a mapping. |
| numbers.ts:59 | 4 | Survived 4 | Test gap | The note-stripping regex and its replacement string. Fixtures have one parenthesised note per cell and no spacing variants. |
| numbers.ts:60 | 2 | NoCoverage 2 | Test gap | The fallback for a row that names no effort. No fixture has one. |
| numbers.ts:62 | 1 | Survived 1 | Test gap | Only `portfolio.tests` has a wrong-type test. The other text fields have none. |
| numbers.ts:63 | 1 | Survived 1 | Test gap | The `>= 0` comparison on `portfolio.tests`. No test passes a negative value. |
| numbers.ts:75 | 2 | Survived 2 | Test gap | No test passes an invalid `headline.n`. |
| numbers.ts:118 | 2 | Survived 2 | Test gap | Anchor and word boundary of the co-author pattern. Fixtures hold one matching line and one empty list. |
| numbers.ts:121 | 3 | Survived 3 | Equivalent | Guards in `hoursToMerge`. The `state` check is only reached for merged requests in the median, and a merged request without `merged_at` does not occur in the type's use. |
| numbers.ts:131 | 1 | Survived 1 | Test gap | No fixture has a comment at exactly the merge time. |
| numbers.ts:132 | 2 | Survived 2 | Test gap | No fixture has a commit dated exactly on the cut-off, so `>=` and `>` agree. |
| numbers.ts:134 | 2 | Survived 2 | Equivalent | Every merged pull request in the fixtures has a merge time, so the null filter removes nothing. |
| numbers.ts:142 | 2 | Survived 2 | Test gap | Label and definition text. The unit tests check each statistic's keys, value and n, not its wording. |
| numbers.ts:143 | 2 | Survived 2 | Test gap | Label and definition text. The unit tests check each statistic's keys, value and n, not its wording. |
| numbers.ts:144 | 2 | Survived 2 | Test gap | Label and definition text. The unit tests check each statistic's keys, value and n, not its wording. |
| numbers.ts:145 | 2 | Survived 2 | Test gap | Label and definition text. The unit tests check each statistic's keys, value and n, not its wording. |
| numbers.ts:146 | 3 | Survived 3 | Test gap | Label and definition text, and the `med !== null` test. `med` is null only when there are no merged requests, which is under 20 and already gives null. |
| numbers.ts:147 | 2 | Survived 2 | Test gap | Label and definition text. The unit tests check each statistic's keys, value and n, not its wording. |
| numbers.ts:148 | 2 | Survived 2 | Test gap | Label and definition text. The unit tests check each statistic's keys, value and n, not its wording. |
| numbers.ts:149 | 2 | Survived 2 | Test gap | Label and definition text. The unit tests check each statistic's keys, value and n, not its wording. |
| numbers.ts:152 | 7 | Survived 7 | Test gap | The lookup that joins a recent row to its build-log row. The unit tests check the five keys and the numbers of the rows, not their model, effort or minutes. |
| numbers.ts:154 | 7 | Survived 7 | Test gap | The tie-break for equal creation times and the comparison signs on ties. The 5.7 test uses seven distinct dates. |
| numbers.ts:157 | 1 | Survived 1 | Test gap | The join key for the recent rows. Same gap as line 152. |
| numbers.ts:160 | 3 | Survived 3 | Test gap | The `?? null` fallbacks for a recent row with no log row. No fixture has one. |
| numbers.ts:161 | 1 | Survived 1 | Test gap | The date of a recent row, and the `.slice(0, 10)` on it. |
| numbers.ts:165 | 1 | Survived 1 | Test gap | The per-repository filter on queries. The fixture has one repository, so the filter keeps everything either way. |
| numbers.ts:171 | 1 | Survived 1 | Test gap | The three values of `log` are asserted. Variants of the `rows.some` call survive because the prose-log fixture has no rows under either reading. |
| numbers.ts:172 | 2 | Survived 2 | Test gap | The filter of rows by repository. The fixtures that have several repositories hold no table in the second one. |
| numbers.ts:173 | 1 | Survived 1 | Test gap | The null check on the row's pull request number. A row without a number gives `unknown` either way. |
| numbers.ts:182 | 1 | Survived 1 | Equivalent | The empty array is overwritten on line 185 before it is read. |
| numbers.ts:185 | 13 | NoCoverage 2, Survived 11 | Test gap | Ordering of upstream pull requests in `mark.json`. The unit tests give at most one upstream request, so the comparator never runs (the no-coverage ones). |
| numbers.ts:186 | 2 | Survived 2 | Test gap | The mapping of an upstream record into `mark.json`. Only the length is used in one test and no test reads the fields. |
| numbers.ts:190 | 1 | Survived 1 | Test gap | The `counts` object. No unit test reads `counts`. |
| numbers.ts:195 | 1 | Survived 1 | Test gap | The mapping of a merged upstream request. One test reads the fields of one record, so method-expression variants that keep one record survive. |
| numbers.ts:196 | 6 | NoCoverage 5, Survived 1 | Test gap | Ordering of merged upstream requests by merge time. The tests give one, so the comparator never runs. |

### `schema.ts`

| Line | Mutants | Status | Kind | Reason |
| --- | --- | --- | --- | --- |
| schema.ts:24 | 6 | Survived 6 | Test gap | The type guard for a mapping. No test passes an array, null or a scalar where a mapping belongs. |
| schema.ts:25 | 2 | Survived 2 | Test gap | The integer guard. No test passes a float. |
| schema.ts:26 | 5 | Survived 5 | Test gap | The text guard. No test passes an empty string, and the equality in `v.length > 0` is unobserved. |
| schema.ts:36 | 3 | NoCoverage 2, Survived 1 | Test gap | No test passes a file that is not a list. |
| schema.ts:40 | 4 | NoCoverage 3, Survived 1 | Test gap | No test passes an entry that is not a mapping. |
| schema.ts:41 | 5 | NoCoverage 2, Survived 3 | Test gap | The fallback name for an entry with no slug in error messages. |
| schema.ts:43 | 7 | NoCoverage 1, Survived 6 | Test gap | No test passes an invalid slug. The regex is untested. |
| schema.ts:44 | 7 | NoCoverage 1, Survived 6 | Test gap | No test passes an invalid repository value. |
| schema.ts:45 | 3 | NoCoverage 1, Survived 2 | Test gap | No test passes a non-integer order. |
| schema.ts:46 | 6 | NoCoverage 1, Survived 5 | Test gap | No test passes a negative or non-integer `sessions`. |
| schema.ts:47 | 4 | Survived 4 | Test gap | No test passes `models` in any form but the valid fixture. |
| schema.ts:48 | 2 | NoCoverage 1, Survived 1 | Test gap | No test passes `models` that is not a list. |
| schema.ts:49 | 1 | Survived 1 | Test gap | The loop over `models`. Fixture entries have an empty list. |
| schema.ts:50 | 3 | NoCoverage 2, Survived 1 | Test gap | No test passes a model entry that is not a mapping. |
| schema.ts:51 | 1 | Survived 1 | Test gap | No test passes an unknown key inside a model entry. |
| schema.ts:52 | 3 | NoCoverage 1, Survived 2 | Test gap | No test passes a model name that is not text. |
| schema.ts:53 | 7 | NoCoverage 1, Survived 6 | Test gap | No test passes a model with zero, negative or non-integer sessions. |
| schema.ts:57 | 1 | Survived 1 | Test gap | The `portfolio` block is always present in the fixtures. |
| schema.ts:58 | 2 | NoCoverage 1, Survived 1 | Test gap | No test passes a `portfolio` that is not a mapping. |
| schema.ts:62 | 2 | NoCoverage 1, Survived 1 | Test gap | Only `portfolio.tests` has a wrong-type test. The other text fields have none. |
| schema.ts:63 | 2 | Survived 2 | Test gap | The `>= 0` comparison on `portfolio.tests`. No test passes a negative value. |
| schema.ts:64 | 10 | NoCoverage 1, Survived 9 | Test gap | No test passes an invalid `stack` (empty, or with a non-text item). |
| schema.ts:65 | 8 | NoCoverage 1, Survived 7 | Test gap | No test passes an invalid `released_on`. The date regex is untested. |
| schema.ts:69 | 1 | Survived 1 | Test gap | The `headline` block is always present in the fixtures. |
| schema.ts:70 | 2 | NoCoverage 1, Survived 1 | Test gap | No test passes a `headline` that is not a mapping. |
| schema.ts:72 | 1 | Survived 1 | Test gap | No test passes an unknown key inside `headline`. |
| schema.ts:73 | 3 | NoCoverage 1, Survived 2 | Test gap | No test passes a non-text headline value. |
| schema.ts:74 | 1 | Survived 1 | Test gap | The length limit is tested at 41 characters. The boundary at 40 is not. |
| schema.ts:75 | 9 | NoCoverage 6, Survived 3 | Test gap | No test passes an invalid `headline.n`. |
| schema.ts:76 | 3 | NoCoverage 1, Survived 2 | Test gap | No test passes an invalid `headline.kind`. |
| schema.ts:77 | 6 | NoCoverage 1, Survived 5 | Test gap | No test passes a source URL that is not `https`. |
| schema.ts:81 | 5 | Survived 5 | Test gap | The `measured` rule is tested for one wrong URL and one right one. The guards on a missing `repo_url` are not. |
| schema.ts:85 | 1 | Survived 1 | Test gap | The duplicate check on `order` is tested, but not that an invalid order is skipped before the check. |
| schema.ts:86 | 1 | Survived 1 | Test gap | Same, for `slug`. |
| schema.ts:92 | 3 | Survived 3 | Test gap | The test that the real data file loads in order passes on a file that is already in order, so removing the sort survives. |

### `mark.ts`

| Line | Mutants | Status | Kind | Reason |
| --- | --- | --- | --- | --- |
| mark.ts:47 | 1 | RuntimeError 1 | Not a survivor | Stryker reports a run-time error for these mutants and leaves them out of the score. They are not counted as killed or survived. |
| mark.ts:49 | 2 | Survived 2 | Test gap | The CSS class names `m0` to `m2`. No unit test reads `cls`. |
| mark.ts:52 | 1 | RuntimeError 1 | Not a survivor | Stryker reports a run-time error for these mutants and leaves them out of the score. They are not counted as killed or survived. |
| mark.ts:55 | 1 | Survived 1 | Equivalent | `?? 0` only matters for a model not yet counted, and `undefined + 1` is NaN. The sort that reads the counts then falls back to the name, so the order in the fixtures does not change. |
| mark.ts:56 | 6 | Survived 6 | Test gap | The model ordering by count and then by name. Fixtures use one or two models with different counts. |
| mark.ts:59 | 1 | RuntimeError 1 | Not a survivor | Stryker reports a run-time error for these mutants and leaves them out of the score. They are not counted as killed or survived. |
| mark.ts:64 | 2 | Survived 2 | Test gap | The shrink factor when arcs overflow the ring. The `>` to `>=` change is equivalent at exactly 360 degrees. The arithmetic changes are not observed because the property test checks no overlap and span only. |
| mark.ts:65 | 1 | Survived 1 | Test gap | The start angle of each ring. The property test does not check offsets. |
| mark.ts:66 | 1 | RuntimeError 1 | Not a survivor | Stryker reports a run-time error for these mutants and leaves them out of the score. They are not counted as killed or survived. |
| mark.ts:71 | 3 | Survived 3 | Test gap | The mid-point angle and the running index. No unit test reads `mid` or `i`. |
| mark.ts:72 | 1 | Survived 1 | Test gap | The effort width scaling for the mini mark. |
| mark.ts:75 | 2 | RuntimeError 1, Survived 1 | Test gap | The default of `log` when a project does not set it. (The run-time errors on this line are not counted as survivors.) |
| mark.ts:77 | 3 | RuntimeError 1, Survived 2 | Test gap | The angle of each upstream node. No unit test reads `angle`. (The run-time errors on this line are not counted as survivors.) |
| mark.ts:78 | 1 | RuntimeError 1 | Not a survivor | Stryker reports a run-time error for these mutants and leaves them out of the score. They are not counted as killed or survived. |
