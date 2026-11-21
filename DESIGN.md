---
name: TypeCheck
description: A friendly typing coach whose whole interface is re-coloured by the reader's chosen theme.
colors:
  accent-2-lime: "#b9dc6d"
  accent-ochre: "#cfc257"
  accent-3-brass: "#d6ca62"
  caret-lime: "#b6e36c"
  wrong-signal-red: "#ff5f57"
  bg-olive-black: "#10120f"
  bg-soft-olive: "#171a15"
  bg-deep-olive: "#0e100d"
  heading-bone: "#edf0df"
  text-sage-paper: "#d5d8c9"
  muted-lichen: "#7f8575"
  subtle-moss: "#5d6355"
  panel-veil: "rgba(255, 255, 255, 0.035)"
  panel-strong-smoke: "rgba(16, 18, 15, 0.48)"
  border-hairline: "rgba(255, 255, 255, 0.06)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(3.2rem, 12vw, 6.8rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "0"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  page-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.2
  stat-numeral:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.15
    fontFeature: "tnum"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  body-lead:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
    lineHeight: 1.3
  typing-text:
    fontFamily: "var(--typing-font-family), Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.55vw, 2rem)"
    fontWeight: 400
    lineHeight: 1.68
    letterSpacing: "0"
rounded:
  key: "6px"
  control: "7px"
  surface: "8px"
  pill: "999px"
spacing:
  hairline-cell-y: "16px"
  hairline-cell-x: "20px"
  section-gap: "16px"
  page-gap: "56px"
  page-gutter: "16px"
  page-max: "1060px"
components:
  button-primary:
    backgroundColor: "{colors.accent-2-lime}"
    textColor: "{colors.bg-olive-black}"
    rounded: "{rounded.surface}"
    padding: "0 18px"
    height: "44px"
  button-quiet:
    backgroundColor: "{colors.panel-veil}"
    textColor: "{colors.heading-bone}"
    rounded: "{rounded.surface}"
    padding: "0 14px"
    height: "38px"
  segmented:
    backgroundColor: "{colors.panel-veil}"
    rounded: "{rounded.surface}"
    padding: "3px"
  segmented-option:
    textColor: "{colors.muted-lichen}"
    rounded: "{rounded.key}"
    padding: "0 12px"
    height: "32px"
  segmented-option-active:
    backgroundColor: "{colors.accent-2-lime}"
    textColor: "{colors.bg-olive-black}"
  page-pill:
    textColor: "{colors.accent-2-lime}"
    rounded: "{rounded.pill}"
    padding: "2px 7px"
  keycap:
    backgroundColor: "{colors.bg-soft-olive}"
    textColor: "{colors.heading-bone}"
    rounded: "{rounded.key}"
    padding: "1px 7px 3px"
  input-text:
    backgroundColor: "{colors.panel-strong-smoke}"
    textColor: "{colors.heading-bone}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
---

# Design System: TypeCheck

## Overview

**Creative North Star: "The Reader's Own Room"**

TypeCheck is a quiet, dark-by-default practice room that the typist repaints. Every colour on every page is a theme token, and the theme belongs to the reader: 27 named themes in `src/styles/base.css` (the olive default on `:root`, plus warm, cool, light, high-contrast and colour-blind sets) redefine the same fifteen-odd custom properties. The system is therefore less a palette than a contract. Pages state roles (`--heading`, `--muted`, `--accent-2`, `--border`), never colours, and each theme decides what those roles look like.

Inside that contract the world is restrained and text-led. The typing test is a field of words on a transparent ground with one glowing caret; the dashboard, leaderboard and profile read as typeset reports with hairline rules instead of card grids. One accent role, `--accent-2`, carries the primary action, the current selection and progress. Wrong input is the only other signal colour, and it is always paired with a non-colour cue (an underline). Numbers are set with tabular figures so stats line up across rows.

Density is moderate and keyboard-first: compact controls (32 to 44px tall), generous vertical spacing between page sections, and no decoration that competes with the words being typed.

**Key Characteristics:**
- Role tokens only; the reader's theme supplies every colour.
- One accent role (`--accent-2`) for action, selection and progress.
- Hairline-ruled rows and tables in place of cards on data pages.
- Physical keycap chips for keys, set inline in prose.
- Tabular numerals on every stat surface.
- Heavy sans weights (700 to 900) for headings and numbers, regular weight for prose.

## Colors

The frontmatter records the default olive theme; every value is overridden per theme, so prose names roles, not hues.

### Primary
- **Accent-2 Lime** (`--accent-2`): the system's one action colour. Fills the primary call to action, the active segment of a segmented control, the tier-rail progress fill, earned badge icons, `::selection`, focus outlines, and the current letter in the typing field. Tinted at 10 to 14% (`color-mix(in srgb, var(--accent-2) 14%, transparent)`) it becomes the pill, earned-badge and selected-row ground.

### Secondary
- **Accent Ochre** (`--accent`): the older brand accent. Fills inline SVG icons (`.material-icon`), the active typing-mode background, the sign-out button, and supplies the radial glow at the top of the page background via `--accent-rgb`.
- **Accent-3 Brass** (`--accent-3`): a minor third accent for replay badges and the medium-difficulty label.

### Tertiary
- **Caret Lime** (`--caret`): the typing caret and its glow (`--caret-rgb`), plus input focus halos. Distinct from accent-2 so themes can separate caret from action.
- **Wrong Signal Red** (`--wrong`): mistyped letters, error counts on the visual keyboard, hard difficulty. Never used decoratively.

### Neutral
- **Olive Black** (`--bg`): the page ground; also the text colour on accent-2 fills.
- **Soft Olive / Deep Olive** (`--bg-soft`, `--bg-deep`): the two other stops of the 135deg body gradient; `--bg-soft` is also the keycap face and tooltip ground.
- **Bone** (`--heading`): headings, stat numerals, keycap legends, player names.
- **Sage Paper** (`--text`): running text and table cells.
- **Lichen** (`--muted`): labels, column heads, secondary meta, unselected segments.
- **Moss** (`--subtle`): untyped words in the typing field.
- **Panel Veil** (`--panel`): the faintest lift for segmented tracks, quiet buttons and row hover.
- **Strong Smoke** (`--panel-strong`): input and settings-bar grounds.
- **Hairline** (`--border`): every rule, divider and outline.

### Named Rules
**The Reader Owns the Colour Rule.** Every colour on every page comes from a theme token in `base.css`. No hex, no `rgba(255,255,255,…)`, no `rgba(0,0,0,…)` fills. Tints are made with `color-mix(in srgb, var(--role) N%, transparent)` or `rgba(var(--accent-2-rgb), a)`. Test any new surface in the default, one light theme (serika, sakura, mint, skyline, ice, lavender) and `contrast-light` before calling it done.

**The One Action Rule.** `--accent-2` marks what to do next, what is selected and how far the typist has come. Nothing else on a page competes with it in fill.

**The Two-Cue Error Rule.** Wrong input is shown with `--wrong` and an underline, so errors read without hue perception (the colour-blind theme swaps red for orange and relies on this).

## Typography

**UI Font:** Inter, then `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Inter is named but not loaded, so most readers see their system sans.
**Readable Font:** Atkinson Hyperlegible, loaded through `next/font` as `--font-readable` and offered as the "Readable" typing font.
**Typing Font:** whatever the reader picks, through `--typing-font-family` and `--typing-font-scale`.

**Character:** one sans family doing everything, with weight as the only hierarchy lever: 800 for headings and numbers, 700 for labels and controls, regular for prose.

### Hierarchy
- **Display** (800, `clamp(3.2rem, 12vw, 6.8rem)`, 0.9): the global `h2`, used for the result WPM figure.
- **Headline** (800, 2.5rem, 1.1, -0.02em, `text-wrap: balance`, max 24ch): the dashboard's written read-out sentence.
- **Page Title** (800, 2.25rem): leaderboard and profile `h2` titles; drops to about 1.7 to 1.85rem on narrow screens.
- **Title** (800, 1.35rem, 1.2): section heads (`h3`) on data pages.
- **Stat Numeral** (800, 1.5 to 1.75rem, 1.15, tabular): values in ruled stat rows, with a 0.8rem muted unit in `<small>`.
- **Body Lead** (400, 1.12rem, 1.75, max 60ch): coaching prose beneath a headline.
- **Body** (400, 1rem): table cells and running text.
- **Label** (700, 0.78 to 0.82rem, sentence case, `--muted`): stat terms and table column heads.
- **Typing Text** (`clamp(1.25rem, 2.55vw, 2rem)` times the reader's scale, 1.68): the words to type.

### Named Rules
**The Tabular Figures Rule.** Any page that shows numbers sets `font-variant-numeric: tabular-nums` on its root, so columns of WPM and accuracy align.

**The Reader's Font Rule.** The typing field always takes `--typing-font-family` and `--typing-font-scale`; never hardcode its face or size.

## Layout

The app is a single centred column, `width: min(1060px, calc(100% - 32px))` (a 16px gutter each side), 34px top padding, with a header of at least 76px. Timed tests widen the typing shell to `min(1280px, 100vw - 64px)` at 900px and up.

Data pages stack sections on a 56px page gap with 16px inside each section. Stat rows are CSS grids of equal columns (four on the dashboard, six on the profile) with 16px by 20px cell padding and the first cell flush left. The leaderboard is a two-column split, the table beside a 320px sticky player pane; under 900px the pane is dropped.

Breakpoints in use: 720px (the main mobile switch; segmented controls become horizontally scrolling strips), 900px (leaderboard pane, wide typing shell), and minor adjustments at 640, 520, 430 and 380px.

## Elevation & Depth

Flat by default. Depth comes from tonal steps (`--panel` over `--bg`, `--bg-soft` for keycaps and tooltips) and from the page's own soft gradient: a radial glow of `--accent-rgb` at 13% top-left over a 135deg `--bg` to `--bg-soft` to `--bg-deep` sweep. Shadows are reserved for things that float above the page.

### Shadow Vocabulary
- **Tooltip** (`box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22)`): badge and chart tooltips.
- **Marker** (`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)`): the tier-rail position marker.
- **Caret glow** (`box-shadow: 0 0 16px rgba(var(--caret-rgb), 0.55)`): the typing caret only.
- **Key press** (`box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.16)`): the bottom lip on visual-keyboard keys.
- **Focus halo** (`box-shadow: 0 0 0 3px rgba(var(--caret-rgb), 0.08)`): text inputs on focus.

### Named Rules
**The Rules Not Cards Rule.** Data pages separate content with 1px `--border` hairlines (top and bottom of a stats row, left between cells, under each table row), not with filled, shadowed cards.

## Shapes

Gently rounded and small. Keys and inner segments take 6px, controls on the typing test and form inputs 7px, page-level controls and panels 8px, and anything pill-shaped (badges, page pills, the profile button, replay badges) 999px. The tier-rail track is a 10px bar with 5px ends. Keycaps get a 3px bottom border so they read as physical keys.

## Components

### Buttons
Compact and confident: heavy label weight, small radius, colour change on hover rather than lift.
- **Shape:** 8px corners on page actions; 7px on typing-test controls.
- **Primary (page CTA):** `--accent-2` fill, `--bg` text, 800 weight, 44px tall, 0 18px padding; an 18px icon may lead.
- **Hover / Active:** fill mixes 14% toward `--heading`; presses down 1px on `:active`.
- **Quiet:** `--panel` ground, 1px `--border`, `--heading` text, 700 weight, 38px tall; hover darkens border to 24% heading and ground to 7% heading. Disabled at 50% opacity.
- **Focus:** every button and link gets a 2px `--accent-2` outline at 3px offset.

### Segmented Control
- **Style:** a 3px-padded track with `--panel` ground, 1px `--border` and 8px corners; options are 32px, 0.84rem, 700, `--muted`, 6px corners.
- **State:** hover lifts text to `--heading`; the active option fills with `--accent-2` and `--bg` text. Under 720px the track scrolls horizontally without a scrollbar.

### Chips
- **Page pill:** `--accent-2` text on a 14% accent-2 tint, 0.7rem, 800, fully rounded. Used for small status tags such as "You" and verified marks.
- **Badge strip:** 36px pills, 14px right padding. Locked badges are dashed `--border` outlines in `--muted`; earned badges switch to a 14% accent-2 tint with `--heading` text and an `--accent-2` icon.
- **Shortcut chip (typing test):** a faint outlined chip holding small `kbd` keys, used for the Esc / Cmd-Enter hints.

### Hairline Stat Row
A `<dl>` grid ruled top and bottom with `--border`, cells divided by left hairlines, terms in the label style and values in the stat-numeral style with a muted unit. The dashboard has four cells; the profile has six.

### Tables
Collapsed tables with 0.78rem `--muted` column heads, a hairline under the head and under every row, first column flush left, numeric columns right aligned. On the leaderboard rows are 52px, hover takes `--panel`, the selected row takes `color-mix(in srgb, var(--accent-2) 10%, var(--bg))`, and podium ranks are distinguished by numeral weight (900, 1.1rem, `--heading`) instead of medal colours.

### Inputs / Fields
- **Style:** 40px tall, 1px `--border`, 7px corners, `--panel-strong` ground, `--heading` text, 12px side padding.
- **Focus:** border shifts to 38% caret colour with a 3px, 8% caret halo.

### Navigation
The header pairs the logo and wordmark on the left with a row of icon buttons on the right (test, dashboard, leaderboard, settings, profile). The active page's icon takes a 70% accent-2 border, a 14% accent-2 ground and an `--accent-2` icon fill. Icons are inline SVG at 23px filled with `--accent`.

### Keycap (signature)
Keys are drawn as small physical keycaps: minimum 1.9em wide, `--bg-soft` face, 1px border at 22% `--heading` with a 3px bottom edge, 6px corners, `--heading` legend at 800 weight. They sit inline in coaching prose ("you miss **E** **R**") so weak keys read as keys, not as data.

### Tier Rail (signature)
A full-width 10px track (9% `--heading`) filled with `--accent-2` up to the typist's best WPM. Tier thresholds are 2px ticks; a 22px `--heading` marker ringed in `--bg` sits at the exact position, with a `--heading` flag above showing the value. Labels sit below, each tier left-ruled with a hairline, the current tier's name in `--accent-2`.

### Typing Field (signature)
Words sit on a transparent ground with a vertical fade mask top and bottom. Untyped words are `--subtle` at about 40% opacity, the active word mixes `--text` 86% with accent-2, typed letters take `--text` (or `--correct` where a theme defines it), and wrong letters take `--wrong` with an 11% tint and a 2px underline. A 2px `--caret` caret glides between letters on a 150ms `cubic-bezier(0.22, 1, 0.36, 1)` and pulses when idle.

## Do's and Don'ts

### Do:
- **Do** use theme tokens for every colour, and tint with `color-mix(... var(--role) N%, transparent)` or the `--*-rgb` triplets.
- **Do** check new surfaces in the default theme, a light theme and `contrast-light`.
- **Do** reserve `--accent-2` fills for the primary action, the active selection and progress.
- **Do** separate data with 1px `--border` hairlines and set numbers in tabular figures.
- **Do** draw keys as keycaps (`--bg-soft` face, 3px bottom edge) wherever a key is named.
- **Do** pair every `--wrong` signal with a non-colour cue such as an underline.
- **Do** give every interactive element the shared 2px `--accent-2` focus outline and keep it operable from the keyboard.
- **Do** honour the reader's motion setting: animations collapse under `[data-reduced-motion='true']` and `prefers-reduced-motion`.

### Don't:
- **Don't** hardcode hex or `rgba(255, 255, 255, …)` / `rgba(0, 0, 0, …)` fills or borders; they break the seven light themes and the high-contrast pair.
- **Don't** wrap stats in filled, shadowed cards on data pages.
- **Don't** colour leaderboard ranks gold, silver and bronze; rank is shown by numeral weight.
- **Don't** set the typing field's face or size directly; use `--typing-font-family` and `--typing-font-scale`.
- **Don't** copy the small uppercase accent label that sits above some headings (header tagline, results, settings, legal); it is carried in the build, not a pattern for new surfaces.
