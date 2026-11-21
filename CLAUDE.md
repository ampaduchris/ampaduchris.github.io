# ampaduchris.github.io: rules for an agent in this repo

- `docs/spec.md` is the sole authority. Prompts never override it. If the spec and a request disagree, stop and say so.
- Name every test with the requirement ids it proves in square brackets, for example `test('[REQ-012] ...')`. `scripts/trace.py` fails CI on an untested MUST that is not listed in `docs/phase.txt`.
- Make no design decision. Take tokens, type and components from the design reference the session names. If something is missing, stop and ask.
- No placeholder values from the mockups. Every number comes from a data file or a script.
- CI never calls a model and the test job uses no secret.
- Run from the lockfile: `npm ci`, then `npm run check`, `npm test`, `npm run build`, `npm run e2e`.
- One session, one pull request. Open it as a draft. Never merge or approve.
- Append one row to `docs/BUILD-LOG.md` per session. Log every departure from the spec in `docs/DEVIATIONS.md`.
- British English. Short declarative sentences. No em dashes.
