---
version: 1
slug: "src-components-leaderboard-leaderboard-jsx"
primary_target: "src/components/leaderboard/Leaderboard.jsx"
related_targets: []
---

# Leaderboard surface

Mode: Operate. Audience: improving typists comparing themselves, plus visitors browsing players. Job: find where I stand in a mode, look at the runs ahead of me. Constraints: theme tokens; leaderboard fairness is a product promise (verified mark stays visible); daily view keeps the reset countdown; signed-out prompt stays; keyboard-operable; no data fetch beyond what is loaded.

## Direction contract

THESIS: A working board, not a trophy poster. A dense ranked table with a selected-player pane beside it. It refuses the giant filter-label hero, the stat tiles and the medal badges.

OWN-WORLD: Theme tokens only. Restrained: --accent-2 marks the selection and the current user. The top three ranks are shown by numeral weight, not coloured medals. Signature move: the selected row and the player pane share one tint, so the pane reads as that row opened up. Verified runs keep a check icon. Tabular numerals.

STORY: The typist picks All-time or Daily, then a mode tab, sees the ranked table with their own row marked, and selects a row to preview that player's best per mode and level. View profile opens the public profile.

FIRST VIEWPORT: Header. One toolbar row: h2 "Leaderboard", All-time/Daily segmented control, mode tabs (15s 30s 60s 10 words 30 words 60 words) or the daily reset line. Below, a two-column split: the ranked table (rank, player, WPM, accuracy, date) at about 64%, and a sticky player pane at about 36% showing the selected (default rank 1) player. Under 900px the pane is hidden and a row opens the profile directly.

FORM: Board plus player pane, position 4 of my 7 ordered candidates (dealt lead). seed:6766dd5195f1c0a2

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
