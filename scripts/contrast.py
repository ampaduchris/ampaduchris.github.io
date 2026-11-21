#!/usr/bin/env python3
"""Contrast ratios for every text and background token pair (WCAG 2.2 relative luminance).

  python3 scripts/contrast.py src/styles/tokens.json

Prints one Markdown table per direction and theme. Exit 1 if any pair is below its floor.
Floors: 4.5 for text pairs, 3.0 for rule pairs (non-text contrast).
Standard library only.
"""
import json
import sys

TEXT = ["text", "text-2", "accent", "ok", "warn"]
GROUNDS = ["bg", "surface", "surface-2"]
FIXED = [("ok", "ok-bg", 4.5), ("warn", "warn-bg", 4.5), ("on-accent", "accent", 4.5)]
RULES = [("border-strong", g, 3.0) for g in GROUNDS]
# Graphic tokens: strokes of the mark. Checked on every ground at the non-text floor, when a direction defines them.
GRAPHIC = ["iris-1", "iris-2", "iris-3", "text", "ok", "warn"]


def lum(hex_colour):
    h = hex_colour.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def main(argv):
    data = json.load(open(argv[1]))
    if "light" in data:  # a single scheme file such as src/styles/tokens.json
        data = {"site": data}
    only = argv[2] if len(argv) > 2 else None
    fails = 0
    pairs_total = 0
    for name, themes in data.items():
        if name.startswith("_") or (only and name != only):
            continue
        for theme, t in themes.items():
            print(f"\n**{name}, {theme}**\n")
            print("| Foreground | Background | Ratio | Floor | Result |")
            print("| --- | --- | --- | --- | --- |")
            pairs = [(f, g, 4.5) for f in TEXT for g in GROUNDS] + FIXED + RULES
            if "iris-1" in t:
                # iris stops are also used as gradient text and as the ground under claim text, so they take the text floor.
                pairs += [(f, g, 4.5) for f in GRAPHIC if f.startswith("iris") for g in GROUNDS]
            for f, g, floor in pairs:
                r = ratio(t[f], t[g])
                # Truncate, never round up: 4.497 must not print as 4.50.
                shown = int(r * 100) / 100
                ok = r >= floor
                fails += 0 if ok else 1
                pairs_total += 1
                print(f"| `{f}` {t[f]} | `{g}` {t[g]} | {shown:.2f} | {floor} | {'PASS' if ok else 'FAIL'} |")
    print(f"\n{pairs_total} pairs checked, {fails} below floor.")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
