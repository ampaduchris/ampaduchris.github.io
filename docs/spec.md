# Site specification (draft), version 0

Status: adopted in session 5.1 on 21 Nov 2026. Adopted draft: Fable 5.2 / high, 15 Nov 2026 (frontload F11). Departures from the draft are in `docs/DEVIATIONS.md`.

At the GATE on 15 Nov 2026 the owner asked for a more visual and interactive direction. The result is direction D, the proof mark: section 6.2 and the motion rows in section 9 follow from it.

Written before the repo exists. Nothing here was measured against a running site. Section 12 lists what was checked and what was not.

Read with `DESIGN.md` and `mockups/` in the same folder. This file says what the site must do. `DESIGN.md` says what it looks like. Where the two disagree on behaviour, this file wins; on appearance, `DESIGN.md` wins.

## 1. Purpose

A static personal site at https://ampaduchris.github.io. It gives a reader who has 30 seconds three things: who Chris Ampadu is, the claim (he directs coding agents and approves every change, and does not write the code by hand), and evidence for the claim that the reader can check without trusting the site.

This document is the sole authority for behaviour. Prompts, README text and tests never override it.

### 1.1 The claim, exactly

Every number shown on the site is produced by a script in the site's repository from a named public source, is shown with the size of the sample it rests on, and can be recomputed by a reader with the commands in the README.

### 1.2 What is not claimed

| Limit | Meaning |
| --- | --- |
| LIM-1 Attention | The numbers show that the owner merged each pull request and how long after it opened. They do not show how carefully he looked. |
| LIM-2 Freshness | Numbers are as of the `generated_at` date shown on the page, not live. |
| LIM-3 History | Pull requests merged before 15 Nov 2026 were merged by an automated routine. They are excluded from every number and the cut-off date is shown. |
| LIM-4 Private work | Nothing from private repositories or from any employer is counted or shown. |
| LIM-5 Legal | The legal page carries the owner's decided text. This specification does not say what German law requires. |
| LIM-6 One account | The agent and the owner use one GitHub account. A comment or a merge from it does not show who wrote it, and the rule that the agent never merges is one it follows, not one GitHub enforces. |

The Method page repeats LIM-1 to LIM-3 and LIM-6 in the owner's words.

## 2. Conventions

- MUST, MUST NOT, SHOULD and MAY have their usual specification meaning. Every MUST and MUST NOT has at least one test. A SHOULD without a test is allowed.
- Requirement ids are `REQ-###`. Ids are never reused or renumbered. A removed requirement keeps its row with the text "withdrawn" and the reason.
- Tests carry the id in the test title in square brackets, for example `test('[REQ-012] home has one h1', ...)`. One test may carry several ids.
- `scripts/trace.py` reads every table row in this file that begins `| REQ-`, reads the ids in the test titles under `tests/`, prints the matrix, and exits 1 if any MUST or MUST NOT has no test.
- Section 11 holds planned work as plain bullets, not table rows, so the trace script ignores it. The session that builds a planned item turns its bullets into rows first.
- Proof names: **PW** is a Playwright test against the built site served locally. **AXE** is an axe run inside Playwright. **VT** is a Vitest unit test. **LY** is a lychee link check. **CI** is a step in the workflow file, asserted by reading its exit code.
- "Every route" means every route in section 4 that the current phase has built.
- Widths: narrow is 375 CSS pixels, wide is 1280. The smallest supported width is 320.

## 3. Definitions

**Project.** One released public repository of the owner's, listed in the project data file.

**Project data file.** `src/data/projects.yml` in the site repository (section 5.1).

**`portfolio.yml`.** The file each project repository carries, defined in the build standard (section 5.2).

**Stale.** A project entry is stale when its `portfolio` block differs from the repository's `portfolio.yml` on the default branch, or when its `release` differs from the repository's latest release tag.

**Statistic.** A number shown on the site that was computed from more than one record: a count, a proportion or a median.

**Sample size (n).** The number of records a statistic rests on. For a count of a whole population (tests in a release, sessions in a log) the count is its own sample size.

**Sourced number.** Any digit sequence in a page's main content. Every one sits inside an element with a `data-src` attribute naming where it came from (section 7).

**Cut-off date.** 15 Nov 2026. Pull requests opened before it are outside every statistic (LIM-3).

**Own pull request.** A pull request in a listed project repository or in the site repository, opened on or after the cut-off date, not opened by Dependabot.

**Upstream pull request.** A pull request by the owner's account in a repository the owner does not own.

**Third-party request.** Any network request a page causes to an origin other than the site's own.

**Scheme.** Light or dark. Light is the default. Dark is chosen only by the reader, with the theme toggle.

## 4. Routes

| Id | Level | Requirement | Proof |
| --- | --- | --- | --- |
| REQ-001 | MUST | `/` (Home) renders, in this order: the header with the name, the two-sentence introduction, the mark (section 6.2), the method summary with a link to `/method/`, one project card per project in the data file in `order`, the upstream list (REQ-004), the footer. (The mark is not built yet; see `docs/phase.txt`.) | PW: locate each block by its `data-block` attribute and assert document order |
| REQ-002 | MUST | Each project card on Home shows the project name, the pitch, exactly one number (REQ-020), the release tag, and links to the repository and to the example pull request. | PW: per card, count of `[data-headline]` is 1; links match the data file |
| REQ-003 | MUST | The introduction on Home is exactly two sentences and is the page's only `h1` or the paragraph directly after it, as `DESIGN.md` sets out. | PW: sentence count of `[data-block=intro]` by splitting on full stops is 2 |
| REQ-004 | MUST | Home shows a list of merged upstream pull requests from the `prs` list of `src/data/upstream.json`, newest first, at most five, each as a pull request evidence row. When the file's list is empty, the heading and the list MUST NOT be in the page. | PW with two fixture data files: five-of-seven rows shown in date order; zero rows gives no `[data-block=upstream]` |
| REQ-005 | MUST | `/method/` renders, in this order: the loop, what the owner's approval means, the two modes (own repositories and upstream), how to read the mark (with the mark), the numbers (section 7) with the date they were generated, the five most recent own pull requests as evidence rows, the limits LIM-1 to LIM-3 and LIM-6. (The reading block and its mark are not built yet; see `docs/phase.txt`.) | PW: block order by `data-block` |
| REQ-006 | MUST | `/contact/` lists each channel in `src/data/site.yml` `contact` as a link, and nothing else that collects data: no form, no embedded frame. | PW: links equal the data file; count of `form, iframe, input, textarea` is 0 |
| REQ-007 | MUST | `/legal/` has two sections with ids `imprint` and `privacy`. Their text comes from `src/content/legal/imprint.md` and `privacy.md`. The build fails while either file is missing or still contains the string `OWNER-DECISION-PENDING`. | VT on the content check with a pending fixture; PW: both ids present |
| REQ-008 | MUST | Every page's footer links to `/legal/#imprint` with the text "Imprint" and to `/legal/#privacy` with the text "Privacy", and to `/contact/`. | PW on every route |
| REQ-009 | MUST | An unknown path serves a `404.html` page with a link to Home, the same header and footer, and `noindex`. | PW: request `/no-such-page/` from the local server; assert status 404 and the link |
| REQ-010 | MUST | `/cv/` and `/in/` render the same main content as Home, carry `<link rel="canonical">` pointing at `/` and `<meta name="robots" content="noindex">`, and are absent from the sitemap. (Session 5.2. They exist so that the analytics path shows which document sent the visitor.) | PW: main content text equals Home's; head tags present; VT on the sitemap |
| REQ-011 | MUST | Every page has a header with the owner's name linking to `/` and navigation links to `/method/` and `/contact/`. The link to the current page carries `aria-current="page"`. | PW on every route |
| REQ-012 | MUST | Every page has exactly one `h1`, a unique `<title>`, a meta description between 50 and 160 characters, `<html lang="en-GB">`, and a canonical link. | PW on every route; uniqueness across routes |
| REQ-013 | SHOULD | A `sitemap.xml` lists the routes of this section except those marked `noindex`. | VT |

## 5. Data

### 5.1 The project data file

`src/data/projects.yml` is a list. Each entry:

| Field | Type | Meaning |
| --- | --- | --- |
| `slug` | string, lower case, hyphens | Used in ids and, later, in the project page path |
| `repo` | string `owner/name` | The public repository |
| `order` | integer | Position on Home, ascending |
| `portfolio` | mapping | A copy of the nine fields of the repository's `portfolio.yml` (section 5.2) |
| `headline.value` | string | The one number as shown, for example `177` or `0 of 38` |
| `headline.label` | string, at most 40 characters | What the number counts, for example `tests pass with no API key` |
| `headline.n` | integer or null | Sample size when it is not already in `value`; null when the value is a whole-population count |
| `headline.kind` | `tests` or `measured` | `tests` means the value is `portfolio.tests` |
| `headline.source_url` | URL | Where a reader can reproduce the number: a CI run or the README "Verify it yourself" anchor, at the release tag |
| `sessions` | integer | Rows in the repository's `docs/BUILD-LOG.md` at the release tag |
| `models` | list of mappings `{name, sessions}` | Distinct "model / effort" pairs in that log, most used first. `name` is the pair as the log spells it, `sessions` the rows that carry it |

| Id | Level | Requirement | Proof |
| --- | --- | --- | --- |
| REQ-014 | MUST | The build fails with a message naming the entry and the field when any entry lacks a field of this table, has a field of the wrong type, or has an unknown field. | VT: one fixture per failure class |
| REQ-015 | MUST | The build fails when two entries share a `slug` or an `order`. | VT |
| REQ-016 | MUST | When `headline.kind` is `tests`, the build fails unless `headline.value` equals `portfolio.tests` written as a decimal integer. | VT |
| REQ-017 | MUST | When `headline.kind` is `measured`, the build fails unless `headline.source_url` starts with the entry's `portfolio.repo_url`. | VT |

### 5.2 The `portfolio.yml` contract

The fields, all required, are those of the build standard: `name`, `pitch` (one sentence), `stack` (list), `tests` (integer), `release` (tag), `released_on` (date), `demo_url`, `repo_url`, `example_pr_url`.

| Id | Level | Requirement | Proof |
| --- | --- | --- | --- |
| REQ-018 | MUST | `scripts/sync-check` reads each entry's repository `portfolio.yml` from the default branch and its latest release tag, compares them with the entry's `portfolio` block, prints one line per difference, and exits 1 if any entry is stale or its `portfolio.yml` is missing or fails the schema. | VT with recorded responses: equal, field differs, release differs, file missing, schema failure |
| REQ-019 | MUST | A workflow runs `scripts/sync-check` weekly and on manual dispatch. On exit 1 it opens one issue titled "Project data is stale", or adds a comment if that issue is already open. It never pushes a commit. (Session 5.2.) | CI: workflow file has no `contents: write`; VT on the issue-or-comment decision |

`scripts/numbers` and the CI step that compares the committed outputs with the snapshot are in section 7. The test job of the pull request workflow MUST NOT call the network for project data (REQ-038). Schema failures stop a pull request; staleness is found by the weekly run.

## 6. Components and their content rules

Appearance is in `DESIGN.md`. These rows fix what each component must contain.

| Id | Level | Requirement | Proof |
| --- | --- | --- | --- |
| REQ-020 | MUST | A project card's number is `headline.value`, with `headline.label` directly after it, and `n = <headline.n>` when `headline.n` is not null. The number is a link to `headline.source_url`. | PW: text and `href` equal the data file |
| REQ-021 | MUST | A pull request evidence row shows the repository as `owner/name`, the pull request number, the title, the state (merged), the merge date, and who merged it; the whole row links to the pull request. | PW with fixture data |
| REQ-022 | MUST | A provenance tag shows a model name and an effort level exactly as they appear in a BUILD-LOG row, and the number of sessions it covers. It never shows a model or effort that is absent from the data. | PW with fixture data; VT: rendering an entry with empty `models` omits the tag |
| REQ-023 | MUST | A statistic shows its value, its label and its sample size as `n = <integer>` in the same component, and the sample size is in the accessible name of the component. | PW: every `[data-stat]` contains `[data-n]`; accessible name contains "n =" |
| REQ-024 | MUST | A proportion is shown as "k of n". A percentage sign MUST NOT appear in the main content of any page. | PW: no `%` in `main` on every route |
| REQ-025 | MUST | A median is shown only when its sample size is at least 20 pull requests. Below 20 the component shows the text "Shown from 20 pull requests. Today: n = <n>." and no value. | VT on the numbers script at n = 19 and n = 20; PW with both fixtures |
| REQ-026 | MUST | Dates are shown as day, month abbreviated to three letters, four-digit year (`15 Nov 2026`), inside a `<time datetime>` element. | PW: every `time` matches the pattern and has a valid `datetime` |

### 6.2 The mark

The mark is a drawing of the build record: rings of arcs around a centre. `mockups/d/mark.js` is the reference for its geometry and `DESIGN.md` section 6.1 for its meaning.

| Id | Level | Requirement | Proof |
| --- | --- | --- | --- |
| REQ-053 | MUST | The mark is drawn at build time from `src/data/mark.json` as inline SVG on Home and on `/method/`. It is in the HTML with JavaScript disabled. | PW with `javaScriptEnabled: false`: `svg.mark` exists and has one `.seg` per session in the data file |
| REQ-054 | MUST | Encoding. One ring per project in the data file, oldest innermost. One arc per build-log row, clockwise in log order. Arc angle is proportional to minutes taken. Stroke width is set by effort level. An arc is solid if and only if its pull request was merged by the owner, otherwise dashed. One dot per check reported as not verified. One outer node per upstream pull request, filled if and only if merged. | VT on `layout()` and `renderMark()` with fixtures: counts of arcs, dashed arcs, dots and nodes equal the data; widths match the effort table in `DESIGN.md` |
| REQ-055 | MUST | For any valid data, no two arcs on a ring overlap, the arcs and gaps of a ring span at most 360 degrees, and every ring radius lies between the inner and outer limits in `DESIGN.md`. | Property-based test (fast-check) on `layout()` over generated data: 1 to 6 projects, 0 to 60 sessions each, 1 to 600 minutes |
| REQ-056 | MUST | Every page that shows the full mark also holds the same data as an HTML table, one row per arc, inside a `details` element. | PW: table row count equals `.seg` count; each row's session id, minutes and state equal the data file |
| REQ-057 | MUST | The full mark has an accessible name that states the counts of sessions, merged pull requests and checks not verified. It is one tab stop. Arrow keys move the selection arc by arc, Home and End jump, Escape clears. The selected arc's project, session, model, effort, minutes, pull request state and link appear in a readout that is an `aria-live="polite"` region. | PW: Tab reaches the mark once; three ArrowRight presses select the third arc and the readout text equals the data; AXE on the page |
| REQ-058 | MUST | Motion. With `prefers-reduced-motion: reduce` nothing on any page moves. Otherwise the rings may drift, a visible "Pause motion" button stops and restarts them, and they stop while the mark is hovered or focused. The choice is not stored. | PW: with reduced motion emulated every `.ring` has computed `animation-name: none`; without it, pressing the button sets `animation-play-state: paused`; REQ-036 covers storage |
| REQ-059 | MUST | Each claim phrase in the introduction is a link to the `id` of its statistic in the method summary. Scripts add highlighting of the matching arcs and nothing else: no text appears only on hover. | PW with JavaScript disabled: all four `href` targets exist; with it enabled: hovering the fourth claim gives every merged arc the class `on` and no dashed arc |

## 7. Numbers

| Id | Level | Requirement | Proof |
| --- | --- | --- | --- |
| REQ-027 | MUST | `scripts/numbers` writes `src/data/method.json`, `src/data/mark.json` and `src/data/upstream.json` from two kinds of source only: the `docs/BUILD-LOG.md` of each listed repository and of the site repository, and GitHub's pull request records. Each output file records `generated_at`, the cut-off date, and for every source the repository and the commit or the query used. | VT on fixture logs and recorded responses; assert the output byte for byte |
| REQ-028 | MUST | `method.json` holds exactly the statistics of table 7.1, each with `id`, `value`, `n`, `label` and `definition`, and a `recent` list of the five newest own pull requests (repository, number, title, state, model, effort, minutes, hours to merge, date). A median with `n` below 20 has `value: null`. `mark.json` holds, per project, one record per build-log row: session id, model, effort, minutes, NOT VERIFIED count, pull request number, state, whether the owner merged it, hours to merge. | VT |
| REQ-029 | MUST | Running `scripts/numbers` twice on the same inputs gives byte-identical output apart from `generated_at`. | VT |
| REQ-030 | MUST | In the built HTML of every route, every text node inside `main` that contains a digit is inside an element with a `data-src` attribute. Allowed values: `method.json#<id>`, `upstream.json`, `projects.yml#<slug>`, `site.yml`, and `content` for legal text and for a date or version the owner typed in a content file. | PW: walk the text nodes of `main` on every route |
| REQ-031 | MUST | On `/method/`, every element with `data-src="method.json#<id>"` shows the value and the sample size that `method.json` holds for that id, and every id in `method.json` is shown. | PW: compare page against the file both ways |
| REQ-032 | MUST | `/method/` shows `generated_at`, the cut-off date, and the count of build-log rows and of pull requests the numbers rest on. | PW |
| REQ-033 | MUST | The README's "Verify it yourself" block gives three commands that rebuild `method.json` from public sources and compare it with the committed file. CI runs the same comparison against recorded responses. | CI step; VT |

### 7.1 The statistics

| Id | Label on the page | Definition | Sample |
| --- | --- | --- | --- |
| `sessions` | Agent sessions logged | Rows in the build logs of the listed repositories and the site repository | Itself |
| `agent_commits` | Commits that carry a model's co-author line | Commits on the default branch of each listed repository and the site repository, on or after the cut-off date, merge commits excluded, whose message has a `Co-Authored-By` line naming a model | Those commits |
| `prs_merged` | Pull requests opened by the agent and merged by me | Own pull requests whose state is merged and whose `mergedBy` is the owner's account | Own pull requests that are closed or merged |
| `prs_commented` | Merged with my written check | Merged own pull requests on which the owner's account left a comment before the merge time | Merged own pull requests |
| `hours_to_merge` | Median hours from ready for review to merge | Median over merged own pull requests of merge time minus the time the pull request was last marked ready for review (or opened, if never a draft), in hours to one decimal place | Merged own pull requests; shown from 20 |
| `not_verified` | Checks reported as not verified | Sum of the NOT VERIFIED column over all build-log rows | Build-log rows |
| `models` | Sessions by model and effort | Count of build-log rows per distinct "model / effort" pair | Build-log rows |
| `upstream_merged` | Upstream pull requests merged by their maintainers | Upstream pull requests whose state is merged | Upstream pull requests opened |

`agent_commits`, `prs_merged`, `prs_commented` and `upstream_merged` are proportions and follow REQ-024. `models` renders as one provenance tag per pair.

## 8. Privacy and third parties

| Id | Level | Requirement | Proof |
| --- | --- | --- | --- |
| REQ-034 | MUST | With analytics switched off (the test build), no route causes any third-party request. | PW: record every request on every route in both schemes; all origins equal the server's |
| REQ-035 | MUST | With analytics switched on (the production build), the only third-party origin named anywhere in the built files is the GoatCounter endpoint in `src/data/site.yml`. The counting script itself is served from the site's own origin. (Session 5.2.) | VT: scan `dist/` for `http://` and `https://` in `src`, `href` of `link` and `script`, `url(` and `@import`; anchors to other sites are exempt |
| REQ-036 | MUST | No route sets a cookie or writes to session storage. Local storage holds nothing until the reader presses the theme toggle, and then exactly one key, `theme`, with the value `dark`; switching back removes it. | PW: after visiting every route, cookies and both storages are empty; after one press local storage has that one key; after a second press it is empty |
| REQ-037 | MUST | Fonts are served from the site's origin as WOFF2 files. For every font family named in the style sheet, the repository holds its SIL Open Font Licence (OFL) text under `public/fonts/licences/`. | VT: families parsed from built CSS, each has a licence file containing "SIL Open Font License" |
| REQ-038 | MUST | The pull request workflow's test job uses no secret and makes no network call after dependencies are installed. | CI: job has no `secrets.` reference; tests run with the network blocked in Playwright and fail on any unmocked `fetch` in Vitest |

## 9. Accessibility, layout and writing

| Id | Level | Requirement | Proof |
| --- | --- | --- | --- |
| REQ-039 | MUST | axe reports zero serious and zero critical issues on every route, in the light scheme and, after pressing the toggle, in the dark scheme, at the narrow and the wide width. | AXE: four runs per route |
| REQ-040 | MUST | Every page shows all of its content with JavaScript disabled. Scripts add selection, highlighting and motion only. The site ships no framework runtime. | PW with `javaScriptEnabled: false`: main text equals the text with it enabled before any interaction; VT: `dist/` holds no script other than the mark module, the loop module, the theme script and the analytics script |
| REQ-041 | MUST | No route scrolls horizontally at widths 320, 375, 768 and 1280. | PW: `scrollWidth` is at most `clientWidth` on the root element |
| REQ-042 | MUST | Every page opens in the light scheme whatever `prefers-color-scheme` says. A toggle in the header switches to dark and back, names what it will do in its accessible name, and the choice holds on the next page visited. With JavaScript disabled the toggle is not shown and the page is light. | PW: with dark emulated, computed background equals the light `bg` token; after a press it equals the dark one, and still does after navigating to another route; with `javaScriptEnabled: false` the toggle is hidden |
| REQ-043 | MUST | Every page starts with a skip link to `main` that becomes visible on keyboard focus, and every interactive element shows a visible focus ring. | PW: first Tab focuses the skip link; AXE focus rules |
| REQ-044 | MUST | Every colour pair used for text meets the ratio listed for it in `DESIGN.md`. `scripts/contrast.py` recomputes the table from `src/styles/tokens.json` and exits 1 on any pair below its floor. | CI step |
| REQ-045 | MUST | The built text of every route contains no em dash (U+2014). | PW: text of `body` on every route |
| REQ-046 | MUST | No internal link is broken. | LY in offline mode over `dist/` |
| REQ-047 | SHOULD | External links are checked weekly by the scheduled workflow, which opens an issue on failure. They do not gate a pull request. | Workflow file |
| REQ-048 | SHOULD | First load of any route transfers at most 260 kilobytes, of which fonts are at most 130 and scripts at most 20 before compression. Lighthouse scores are printed in CI and are not a gate. | CI prints the sizes |
| REQ-049 | SHOULD | The footer carries the sentence "This site was built by directing Claude Code. The model and effort for every session are in the build log." with a link to the site repository's `docs/BUILD-LOG.md`. | None |
| REQ-050 | MUST NOT | No page carries an `og:image` or `twitter:image` tag, a tracking pixel other than the analytics request of REQ-035, or an embedded frame. | VT: scan `dist/` |

## 10. Checks in CI

| Id | Level | Requirement | Proof |
| --- | --- | --- | --- |
| REQ-051 | MUST | The pull request workflow runs, in order: install from the lockfile, type check, Vitest, build, contrast script, trace script, Playwright with axe on every route, lychee offline. Any failure fails the workflow. | CI: workflow file read by a VT test that asserts the step names in order |
| REQ-052 | MUST | The deploy workflow publishes `dist/` to GitHub Pages only from `main` and only after the checks of REQ-051 pass on the same commit. (Session 5.2.) | CI: `needs:` on the deploy job |

## 11. Planned, not yet requirements

Plain bullets on purpose (section 2). Ids are reserved.

- Project pages (reserved REQ-060 to REQ-069). `/projects/<slug>/`: the pitch, the headline number with its source, the example pull request as an evidence row, the build summary (sessions, provenance tags, NOT VERIFIED count), the demo, links to the repository, the specification and the build log. One template, generated from the project data file. The mockup `mockups/project-wide.png` and its narrow twin are the reference. When built, each project card's name links to its project page and each repository's homepage field is set to it.
- Notes (reserved REQ-070 to REQ-089). `/notes/`, `/notes/<slug>/`, an RSS feed, the essay byline "Drafted with Claude from my outline and evidence. Edited by me.", and a "Notes" navigation link. Built in the notes phase.

## 12. Evidence

Measured on 15 Nov 2026 in the frontload session:

- Font licences: the five packages named in `DESIGN.md` were downloaded from the npm registry and each `LICENSE` file read. All five state the SIL Open Font Licence, version 1.1. None names a reserved font name.
- Contrast: `scripts/contrast.py` was run on the colour tokens. The output is in `DESIGN.md`.
- Mockups: Home, Method, a project page and Contact in direction D were captured in Chrome at 1280 and 375 pixels wide in both schemes. All sixteen captures report no sideways scroll.

Measured on 21 Nov 2026 in session 5.1, with Astro 7.4.13, Vitest 5.1.1, Playwright 1.65.1 (installed Google Chrome), axe-core through `@axe-core/playwright` 4.14.0, Node 24.18.0:

- The build produces `404.html` and a sitemap that excludes it.
- Type check, Vitest, the build, the contrast script, the trace script and the Playwright suite (every route, axe in both schemes at two widths) pass locally.
- The sync check against the public repositories reports `inkproof` current and `german-b1-tutor` missing its `portfolio.yml`.

Measured on 21 Nov 2026 in session 5.2: the offline link check in CI reported 37 links OK and 0 errors on the 5.1 build (lychee 0.24.2 through lychee-action 2.9.0), so root-relative links resolve with `--root-dir`. The Pages site at the user address is currently the legacy Jekyll build of `main`, and the project page of `german-b1-tutor` is served by that repository, not by this one.

Measured on 21 Nov 2026 in session 5.3: GitHub's issue timeline for a pull request returns `ready_for_review` events with their times (checked on this repository's pull request 3), so `hours_to_merge` can use the last time a pull request was marked ready. The numbers script ran against the public repositories and wrote its outputs; two runs on the same snapshot gave identical bytes. On that run the median was not shown, because 15 pull requests are below the floor of 20.

Not checked:

1. (Resolved in session 5.2: see above.) Whether lychee's offline mode resolves root-relative links in `dist/` with `--root-dir`. It is not installed locally. The first CI run is the evidence.
2. Whether axe can evaluate contrast on text over the tinted tag backgrounds in both schemes. The 5.1 pages have no tinted tags.
3. Whether GoatCounter's counting script may be self-hosted under its licence (REQ-035). Not looked at in session 5.2: the script is not in the repository (DEV-014).
4. (Resolved in session 5.3: see above.) Whether GitHub's API exposes the time a pull request was last marked ready for review.
5. Whether cookie-free analytics need consent in Germany, and what the imprint must contain. The owner's decision.
6. Whether Safari and Firefox draw the mark as Chrome does. The mark is not built.
7. Any browser other than Chrome and CI's Chromium.
8. Whether the Latin font subset covers every character the copy uses. The 5.1 copy was read for the two missing characters (check mark, rightward arrow) and has neither.
9. The rendering of the header and cards against the mockup captures was not compared pixel by pixel.
10. Node 26 and the CI workflow as a whole have not run yet. The first CI run is the evidence.
