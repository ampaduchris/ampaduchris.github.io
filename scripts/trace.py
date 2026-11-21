"""Requirement traceability (control R1).

Reads every table row in docs/spec.md that begins `| REQ-`, reads the ids in
the titles of tests under tests/ (written `[REQ-012]`), and the ids in
docs/phase.txt that are not yet due. Prints the matrix and exits 1 if:

- a MUST or MUST NOT that is due has no test;
- a test title names an id that is not in the spec;
- an id appears twice in the spec;
- docs/phase.txt names an id that is not in the spec.

A listed id with no test prints as "deferred". Withdrawn rows are ignored.
Usage: python3 scripts/trace.py [--report-only]
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROW = re.compile(r"^\|\s*(REQ-\d{3})\s*\|\s*(MUST NOT|MUST|SHOULD|MAY)\s*\|")
TITLE = re.compile(r"""(?:test|it)\(\s*(['"`])((?:(?!\1).)*)\1""")
ID = re.compile(r"\[(REQ-\d{3}(?:[ ,]+REQ-\d{3})*)\]")
ANY = re.compile(r"REQ-\d{3}")


def read_spec(spec: Path):
    levels, dupes = {}, []
    for line in spec.read_text(encoding="utf-8").splitlines():
        m = ROW.match(line)
        if m and "withdrawn" not in line.lower():
            if m.group(1) in levels:
                dupes.append(m.group(1))
            levels[m.group(1)] = m.group(2)
    return levels, dupes


def read_tags(tests: Path):
    counts = {}
    for path in sorted(tests.rglob("*.ts")):
        for m in TITLE.finditer(path.read_text(encoding="utf-8")):
            for group in ID.findall(m.group(2)):
                for rid in ANY.findall(group):
                    counts[rid] = counts.get(rid, 0) + 1
    return counts


def read_phase(path: Path):
    ids = []
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if line:
                ids.append(line)
    return ids


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--report-only", action="store_true")
    ap.add_argument("--spec", type=Path, default=ROOT / "docs" / "spec.md")
    ap.add_argument("--tests", type=Path, default=ROOT / "tests")
    ap.add_argument("--phase", type=Path, default=ROOT / "docs" / "phase.txt")
    args = ap.parse_args(argv)

    levels, dupes = read_spec(args.spec)
    tags = read_tags(args.tests)
    deferred_ids = set(read_phase(args.phase))

    untested, deferred = [], 0
    for rid in sorted(levels):
        n = tags.get(rid, 0)
        if n:
            status = f"{n} test(s)"
        elif rid in deferred_ids:
            status = "deferred"
            deferred += 1
        else:
            status = "NO TEST"
        print(f"{rid}  {levels[rid]:<8} {status}")
        if status == "NO TEST" and levels[rid].startswith("MUST"):
            untested.append(rid)

    errors = []
    for rid in sorted(set(tags) - set(levels)):
        errors.append(f"test title names unknown requirement {rid}")
    for rid in sorted(set(dupes)):
        errors.append(f"requirement {rid} appears more than once in the spec")
    for rid in sorted(deferred_ids - set(levels)):
        errors.append(f"docs/phase.txt names unknown requirement {rid}")
    for e in errors:
        print(f"ERROR {e}")

    print(f"{len(levels)} requirements, {deferred} deferred, {len(untested)} untested MUST, {len(errors)} errors")
    if errors:
        return 1
    if untested and not args.report_only:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
