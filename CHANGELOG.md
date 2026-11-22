# Changelog

## 1.0.0 (22 November 2026)

- Session 5.8: release. `portfolio.yml`, the release workflow, the README with the live address as the demo and two screenshots, the legal guard now fails the build while the text is pending (DEV-004 closed), the scheduled run moved out of `ci.yml` (the weekly sync and link checks stay in `sync.yml`).
- Session 5.7: Stryker mutation report; fixes for review findings; F-07, F-08 and F-10 logged.

### Build history before release

- Session 5.1: specification adopted, Astro scaffold, Home with project cards from the data file, Contact, Legal shell, not-found page, continuous integration.
- CI versions chosen: Node 24 and 26 (the two newest long-term releases on 21 Nov 2026); both green in CI.
- Session 5.2: `/cv/` and `/in/` short paths, weekly sync and external link workflows, Pages deploy job (main only, after the checks, refuses pending legal text), analytics hook (off), third-party origin scan.
- Session 5.3: Method page, numbers script with snapshot, Home method summary, Method link in the header.
- Session 5.3a: corrections: `german-b1-tutor` test count at its tag, deploy job warns instead of failing while the legal text is pending, Dependabot ignores TypeScript major updates, numbers refreshed, local browser test retry.
- Session 5.4: the proof mark on Home (build-time SVG, readout, keyboard, table, pause, reduced motion), rings in the project cards.
- Session 5.4a: the owner's copy edits, and Contact with a site-only email, LinkedIn and a location line.
- Session 5.5: the four claims in Home's introduction link to their statistics and light the matching arcs; Method gains "How to read the mark" with the legend, a live mark and its table.
- Session 5.6: independent review (`docs/reviews/5.6.md`), ten findings, six must-fix.
- Session 5.6a: the owner's decisions on four findings. Claims light arcs only; every number's source sits on its own element; a ring whose build log is not a table says so; the browser and the link checker install before the tests, and the browser tests cannot reach the network.
