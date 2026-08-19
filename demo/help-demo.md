### What this page is

A living gallery of every component the Sustainable FSA house-style kit ships,
and the target of the automated accessibility gate. If a component is not
exercised here, `tools/a11y-audit.mjs` has never looked at it.

Narrow the window and watch the responsive ladder work — every step below is a
place an accessible name can be lost, which is why the audit runs at 390px as
well as 1440px.

| Width | What changes |
| --- | --- |
| 1400 px | Button and control labels are *clipped*, never `display:none` — a clipped label keeps its accessible name |
| 1060 px | Chrome gaps tighten, and the brand lockup keeps its rhythm |
| 750 px | The wide banner swaps for the square badge; the text lockup goes visually hidden |
| 640 px | The refresh dot goes, search collapses into the magnifier, and the detail card becomes a bottom sheet |

Press <kbd>/</kbd> to jump to the county search. That is a single-character
shortcut, so it comes with an opt-out: add `?kbd=off` to the URL and it stops
listening (WCAG 2.1.4). The setting is re-emitted as you move around, so you do
not have to add it again.

Every rule behind what you are looking at is written down in
[HOUSE-STYLE.md](https://github.com/sustainable-fsa/style/blob/main/HOUSE-STYLE.md).
