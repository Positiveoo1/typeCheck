---
version: 1
slug: "src-components-dashboard-dashboard-jsx"
primary_target: "src/components/dashboard/Dashboard.jsx"
related_targets: []
---

# Dashboard surface

Mode: Operate. Audience: improving typists returning after a few sessions. Job: learn what to practise next, then see whether they are improving. Constraints: inherits TypeCheck's theme tokens (all 27 themes must work, light and high-contrast included); works for guests from local history; keyboard-operable. Data: results (wpm, accuracy, mode, training mode, date) and per-language key stats (weak keys, slow pairs) from keyStats.js.

## Direction contract

THESIS: The dashboard is a coach's report, not a scoreboard. It opens with one written read-out of the week and a drill. It refuses the hero-metric template (giant PB number, mood copy, three stat tiles).

OWN-WORLD: Existing theme tokens only (--bg, --text, --heading, --muted, --accent-2, --wrong, --border). Restrained: neutrals from the theme and --accent-2 for the primary action and the trend line. Signature move: weak keys and slow pairs set as small physical keycaps inline in the read-out sentence. Tables use hairline rules, not cards. Tabular numerals throughout.

STORY: The typist reads "this week vs last", sees exactly which keys cost them, presses Practise to start a weak-letters drill, and checks the trend and recent tests if curious.

FIRST VIEWPORT: Header. Then a full-width report block: an h2 sentence comparing this week to last week (WPM delta); a second line with weak keycaps and the slowest pair; a Practise button (primary). Beneath it, one ruled stats line: best, 7-day avg, accuracy, tests. The chart heading starts within the first viewport at 1440x900.

FORM: Coach's report, position 4 of my 7 ordered candidates (dealt lead). seed:eeb5d8d67d7de3ce

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
