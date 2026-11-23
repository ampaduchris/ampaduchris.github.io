# Review N.4: causal claims in the four postmortems

- Commit reviewed: 92afeeea75ac270c504783f45c891e27633cc93c (`main` after the merge of pull request 26)
- Reviewer: Opus 5.5 / high (source: app session record). Builder of the notes and the evidence rows: Sonnet 5.5 / high, sessions N.1, N.2 and N.3 (source: `docs/BUILD-LOG.md`). The models differ.
- Calibration: not run. This is not the first review of the programme (5.6 was).
- Scope: the four notes in `src/content/notes/`, `src/data/evidence.yml`, and the four checks in section 7 of the essay 5 thesis (`ESSAY-5-THESIS.md` in the owner's private folder). No code, test or spec text was in scope or changed.
- Findings: 10 (S1 0, S2 2, S3 5, S4 3); must-fix 2; log-as-deviation 5; none 3

## What was run

| Command | Covered | Result |
| --- | --- | --- |
| `npm run -s claims`, three times | 4 notes, 75 claims | 3 of 3: `ok: 4 notes, 75 claims, every claim linked to an evidence row` |
| Probe 1: remove the marker from cause 3 of `flat-scout-third-version.mdx`, run the checker, restore | REQ-082 on a real note | `FAIL: 1 problem(s) in 4 note(s)`, exit 1. Killed |
| Probe 2: replace the same cause with a sentence its cited row does not hold, keep the marker, run, restore | whether the checker tests support | `ok: 4 notes, 75 claims, every claim linked to an evidence row`. Survived, as the spec defines the checker |
| Probe 3: put a causal sentence with no marker in the "What is still not known" list, run, restore | the claim-free section | `ok: ...`. Survived, as section 6.3 defines it |
| `git status --porcelain` before and after the probes | working tree | unchanged |
| A scratch script that prints each causal sentence under "Causes" beside the text of the rows it cites | 8 causal sentences | output quoted in F-01 and F-05 |
| `grep -niE "improv\|held\|recur\|prompt\|instruct\|exhaust\|report" src/data/evidence.yml` | 28 rows | no match |
| `grep -niE "model quality\|none of the" src/content/notes/*.mdx` | 4 notes | no match: no note restores "none" from the private record |
| `grep -c "E16\|E17" src/content/notes/*.mdx` | 4 notes | 0 in each |
| `tier_check.py --pr 25 --session N.2` and `--pr 26 --session N.3` | the two pull requests that wrote the notes | `tier table: 0 error(s), 0 warning(s)` for both |
| `spec_diff.py --base 83a6b03` (the N.1 spec commit) | REQ rows changed since N.1 | `requirement rows changed after adoption: 1; without a deviation entry: 0` (REQ-071 proof, DEV-054) |

Every sentence under "What happened", "Timeline", "Causes" and "What changed" in the four notes was read against the row it cites. Every observation in those sections is in its cited row. The findings below are about the causal step between rows, not about the rows themselves.

## Section 7 checks (essay 5 thesis)

| Check | Result |
| --- | --- |
| 1. A fix was tried and the failure recurred on the same rule | **Not established either way.** No row says a fix held or that a failure recurred (`grep` above: no match for "held" or "recur"). The private record holds nothing on it either. The thesis sentence "every fix that held was an operating rule" therefore has no row behind "held". The thesis's own section 6 already concedes this. GATE: the owner confirms, for each fix, whether the failure came back; until then essay 5 says "every fix adopted", not "every fix that held". |
| 2. Row 2's overspend came from an instruction to be exhaustive | **Not established, and the record points towards it.** No row records what the second version was told to do. But E18 and E19 show the second version was a rebuild after a coverage failure, built to paginate and to report coverage. A design aimed at breadth is the plain reading of those rows. The note on the second version does not raise the question (F-03). GATE: the owner says whether the rebuild's instructions asked for full coverage. If they did, thesis point 3 changes as section 7 says. |
| 3. Row 3's missing tool was reported by the agent and the report was missed | **Not established.** Row E10 joins "failed silently" and "logged failed immediately". The note on the third version names the question in its not-known list, but cause 2 then asserts that the run did not explain the failure (F-02). GATE: the owner says which half happened and whether a logged failure was read. |
| 4. The owner recalls further incidents that were plainly model errors | **Not verified.** Only the owner can answer. GATE: the owner answers before session N.5 drafts. |

## Findings

### F-01 · S2 Major · must-fix · cause read off the fix
- Issue: https://github.com/ampaduchris/ampaduchris.github.io/issues/27
- Requirement: spec section 6.3, "A note makes claims; every claim links to a row." REQ-082 (MUST) tests the link, not the support.
- Where: `src/content/notes/flat-scout-third-version.mdx` Causes item 3; `src/content/notes/job-scout-usage-limits-and-liveness.mdx` Causes items 2 and 5
- Observed: three causes are inferred from the fix that was adopted afterwards, in one form: "The fix was X, so I read the lack of X as part of the cause." The rows they cite record only that the fix was made. Adopting a fix does not show that its absence caused the failure. Both notes also say, under "What is still not known", that whether the fix worked is not known. A cause read off an untested fix is not evidence for the cause.
- Expected: a cause under "Causes" rests on a row that holds the cause, or is labelled in the sentence as unsupported. Essay 5 will lean on these notes for "every fix that held was an operating rule"; if the causes are read off the fixes, that sentence becomes circular.
- Command: a scratch script printing each causal sentence under "Causes" with the text of its cited rows
- Output: `flat-scout-third-version | 3. The fix was a first step that checks for the tools, so I read the lack of that step as part of the cause.` / `cites: E24: Flat scout gained a first step that checks that the tools it needs are loaded. When a required tool is absent, it writes a failed entry and stops.`
  `job-scout-usage-limits-and-liveness | 2. The fix moved frequent jobs to cheaper lanes and spread the schedule, so I read the lack of both as part of the cause.` / `cites: E26 ... E27 ...` (same form for item 5, citing E28)
- Suggested change: take the three items out of "Causes". Keep the fixes under "What changed", where they are already listed. Add one line to each not-known list: "Whether the lack of this step was a cause. The fix was adopted; nothing tested it." GATE: the owner's wording, since the notes are in the owner's voice.

### F-02 · S2 Major · must-fix · "did not explain" against the record
- Issue: https://github.com/ampaduchris/ampaduchris.github.io/issues/28
- Requirement: spec section 6.3 (as F-01); essay 5 thesis section 7, check 3
- Where: `src/content/notes/flat-scout-third-version.mdx` Causes item 2; the same note's not-known items 2 and 3
- Observed: cause 2 says "I read that as a failure the run did not explain." The row it cites, E10, says the runs "failed silently or logged failed immediately". A run that logged a failure may have explained it. The same note's not-known list says which half happened is not known, and asks "Whether the agent reported the missing tool and I missed the report." The cause asserts what the not-known list says is unknown. The fix in E24 also "writes a failed entry", which some runs already did by E10's account, so the note does not show what the fix added for those runs.
- Expected: the cause states only what E10 holds, and the note does not settle check 3 before the owner does.
- Command: `grep -A2 "id: E10$" src/data/evidence.yml | grep observation`
- Output: `observation: During that week the scheduled runs failed silently or logged failed immediately.`
- Suggested change: replace cause 2 with a sentence that keeps both halves open, for example "Some runs failed with no message and some logged a failure. The record does not say which, or whether I read the logged ones." GATE: the owner answers check 3; if logged failures went unread, the cause is an unread log and the note says so.

### F-03 · S3 Minor · log-as-deviation · second version's design for breadth not raised
- Requirement: essay 5 thesis section 7, check 2
- Where: `src/content/notes/flat-scout-second-version.mdx`, "What is still not known"
- Observed: the note puts the overspend on the run's breadth and length (cause 1) and lists what limits the second version had as unknown. It does not ask why the run was broad. E18 and E19, cited by the note on the first version, show the second version was rebuilt after a coverage failure to paginate and report coverage. That is a design for breadth.
- Expected: the not-known list asks whether the rebuild's instructions asked for full coverage, because thesis point 3 ("failed by being thorough") depends on the answer.
- Command: `grep -A2 -E "id: E1[89]$" src/data/evidence.yml | grep observation`
- Output: `observation: Flat scout v2, the rebuild, paginated its searches.` / `observation: Flat scout v2 had a coverage dashboard.`
- Suggested change: add one not-known item: "Whether the rebuild's instructions asked it to cover every source. It was built after a coverage failure, to page through results and report coverage." GATE: the owner answers check 2.

### F-04 · S3 Minor · log-as-deviation · approvals listed as a cause with an unknown effect
- Requirement: spec section 6.3
- Where: `src/content/notes/flat-scout-second-version.mdx` Causes item 2 and not-known item 2
- Observed: Causes item 2 says approvals were not all manual before the run, inferred from E8. The not-known list says "Whether a manual approval would have stopped the run, or only slowed it." A condition whose effect on the failure is unknown is listed as a cause. The "because" in item 2 marks an inference about the state before the run, not a cause.
- Expected: the item sits under "What changed" (it is already there) and in the not-known list, not under "Causes".
- Command: the pair listing
- Output: `flat-scout-second-version | 2. Approvals were not all manual before the run, because I set them all to manual afterwards.` / `cites: E8: After that run I set all approvals to manual.`
- Suggested change: remove item 2 from "Causes".

### F-05 · S3 Minor · log-as-deviation · "main reason" for a cause the note cannot separate
- Requirement: spec section 6.3
- Where: `src/content/notes/flat-scout-first-version.mdx` Causes item 1; standfirst; not-known items 1 and 2
- Observed: cause 1 says "I read the first as the main reason for the second": the one-page search as the main reason the version missed major sources. The standfirst says the record "cannot separate the design from the small model it ran on", and the not-known list says whether the model mattered is not known. "Main" ranks a cause against one the note says it cannot measure.
- Expected: "a reason", not "the main reason".
- Command: the pair listing
- Output: `flat-scout-first-version | 1. The search was narrow. It covered one page of one portal, and it missed major sources. I read the first as the main reason for the second.`
- Suggested change: change "the main reason" to "a reason".

### F-06 · S3 Minor · log-as-deviation · not-known items that presuppose a fix worked
- Requirement: spec section 6.3 (the not-known section holds no claims, so the checker does not read it; probe 3)
- Where: `src/content/notes/flat-scout-first-version.mdx` not-known item 1 ("Which change improved coverage."); `src/content/notes/flat-scout-second-version.mdx` not-known item 5 ("Which of the third version's limits mattered most.")
- Observed: both items assume an effect no row records: that coverage improved, and that the limits mattered. They sit in the one section the checker never reads.
- Expected: unknowns that do not assume the outcome.
- Command: `grep -niE "improv|held|recur" src/data/evidence.yml`
- Output: no match
- Suggested change: "Whether coverage improved, and if it did, which change did it." and "Whether the third version's limits prevented a repeat, and which of them did."

### F-07 · S3 Minor · log-as-deviation · the sleeping-laptop cause has no fix and no unknown
- Requirement: spec section 6.3
- Where: `src/content/notes/flat-scout-first-version.mdx` Causes item 2, "What changed", "What is still not known"
- Observed: cause 2 is the schedule bound to a laptop. "What changed" lists no change for it and the not-known list does not say whether or when the schedule left the laptop. E9 shows the third version ran as scheduled cloud sessions, but no row says that move answered this cause.
- Expected: the note says what happened to the second cause, or that the record does not say.
- Command: `grep -n "laptop\|cloud" src/data/evidence.yml`
- Output: `observation: The scheduled task of flat scout v1 was bound to a laptop. It did not run while the laptop slept.` / `observation: From 19 to 26 October, scheduled cloud sessions of flat scout v3, which ran on the Sonnet model, lacked the web-fetch tool.`
- Suggested change: add a not-known item: "When the schedule moved off the laptop. The third version ran as scheduled cloud sessions; the record does not say that move answered this cause." Do not add a causal link between the move and the third version's missing tool: no row holds it.

### F-08 · S4 Note · none · standfirsts carry causal claims the checker does not read
- Where: the `standfirst` of all four notes
- Observed: the checker reads the body only, as section 6.3 defines a claim. Each standfirst holds causal or factual sentences with no marker. Read, not run: each one restates a marked sentence in its body, so nothing is unsupported today. The standfirst is the text the index page and the feed show.
- Suggested change: none now. Session N.5 keeps the essay's standfirst to sentences its body marks.

### F-09 · S4 Note · none · a marker shows a row exists, not that it supports the sentence
- Where: `scripts/check-claims.ts`; spec section 12, item 13
- Observed: probe 2 replaced a cause with a sentence its row does not hold and kept the marker. The checker passed. This is the checker as specified. Section 12 item 13 names the narrower gap (causal sentences with no listed word). The wider one, support, is read only by a review.
- Suggested change: add to section 12's "Not checked" that the checker tests the link, not the support, at the next session that edits the spec.

### F-10 · S4 Note · none · rows E16 and E17 are cited by no note, and their fix has no row
- Where: `src/data/evidence.yml` E16, E17; essay 5 thesis section 4, part 3
- Observed: no note cites E16 or E17 (`grep -c` above: 0 in each). DEV-055 keeps the fix for that private row out of the table. The thesis says "The fix was a rule that flags the conflict." With no row, session N.5 cannot mark that sentence.
- Suggested change: none in this review. GATE for N.5: the owner adds a fix row with the same "the record does not date this change" note as E24 to E28, or the essay drops that sentence.

## Not verified by this review

- Whether any row of `evidence.yml` is true. The rows are the owner's reconstruction from memory (thesis, status line). This review checked notes against rows and rows against the private record's text, not against events.
- Section 7 check 4 (further incidents). Only the owner can answer.
- REQ-070 to REQ-086 behaviour (routes, feed, byline, table, markup). Out of scope for a review of causal claims; their tests ran green in the N.2 and N.3 pull requests, whose tier tables pass `tier_check.py`.
- Causal sentences outside the four postmortem sections with no listed causal word (spec section 12, item 13). Read for, none found, but reading is the only method.
- Essay 5. Not yet written.
