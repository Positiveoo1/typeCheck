# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are **improving typists**: students, office workers and learners who want to type faster and more accurately. They come for short, repeated practice sessions on a desktop or laptop keyboard and come back to check progress. Leaderboards motivate them, but they are not the point. Competitive enthusiasts and developers (code mode) are welcome secondary audiences, not the design target.

## Product Purpose

TypeCheck is a friendly typing speed test that measures WPM, accuracy, mistakes and elapsed time, then helps people improve rather than only scoring them. Success means a typist returns regularly, practises their actual weak spots, and can see their speed and accuracy improving over time.

## Positioning

TypeCheck coaches. It doesn't only measure. Four commitments set it apart:

- **Targeted practice:** Weak-letters drills are built from the keys a person misses and the letter pairs that slow them down, alongside the quotes, code, numbers and accuracy-lock modes.
- **Accessibility first:** A hyperlegible font (Atkinson Hyperlegible), high-contrast and colour-blind-friendly themes, adjustable text size, and sound and motion controls are core product values, not add-ons.
- **Habit and progress:** Daily goals and streaks, a shared daily challenge, a ghost race against your own personal best or last run, and dashboard history.
- **Multilingual:** Typists who don't type in English are first-class users. Word lists ship for English, French, Polish, Russian, Spanish and Uzbek.

## Operating Context

- People use it in short, repeated keyboard sessions. A run starts on the first keystroke. Esc or Cmd/Ctrl+Enter restarts it.
- Test types: timed (15s, 30s, 60s, or custom from 5 to 300s) and word count (10, 30 or 60 words).
- The daily challenge gives everyone the same 40 words each UTC day, seeded from the date and language. It has its own daily leaderboard and a "resets in" timer.
- Results stay in the browser without an account. Signing in (Firebase Auth) syncs them across devices and enables the dashboard, profile and leaderboard.
- Onboarding is a spotlight tour, versioned so returning users see only a short "what's new".
- On mobile, a tip suggests a physical keyboard. Desktop with a hardware keyboard is the primary setting.

## Capabilities and Constraints

- **The core works without an account.** The typing test must always work without signing in and without Firebase configured. Account features stay behind the Firebase configuration check and load lazily.
- **The leaderboard must be fair.** Leaderboard integrity is a product promise. Client plausibility checks run over the keystroke log, Firestore rules set bounds and rate limits, and runs from the optional Cloud Function show as verified. Runs below 50% accuracy are saved to history but not ranked. New features must not create unverifiable paths onto the leaderboard.
- **Keyboard-only flow.** Everything in a run (starting, restarting and changing settings) must work without a mouse.
- Stack: Next.js 15 (App Router), React 19, Firebase Auth and Firestore, Framer Motion, and Biome for linting. Tests use the Node test runner.
- Routes: `/` (test), `/dashboard`, `/leaderboard`, `/profile`, `/settings`, `/privacy`, `/terms` and `/player/{userId}`. Old hash links redirect.
- Themes unlock from dashboard progress and best results. Settings and theme choices are stored in `localStorage`.
- Terminology: WPM, accuracy, training modes (Standard, Weak letters, Quotes, Code, Numbers, Accuracy lock), daily challenge, ghost, daily goal, streak.

## Brand Commitments

- The name is **TypeCheck**. The voice is friendly, plain and encouraging toward learners. The onboarding and README copy set the tone: "Train a weak spot", "Race your ghost", "Keep your streak".
- Logo: `public/logo.png` (also `src/logo.png`). Favicon: `public/favicon.png`.
- Open-source under the MIT licence, and contributions are welcome. This is not treated as a design constraint.

## Evidence on Hand

- Social previews: `public/social-preview.png` and `public/social-preview2.png`. The live demo is at type-check-taupe.vercel.app.
- Key-sound audio: `public/audio/`.
- No testimonials, user counts, press or benchmark claims exist. Future work must not invent them.

## Product Principles

1. **Coach, don't just score.** Every result should point toward what to practise next.
2. **Nothing between the typist and the first keystroke.** No account, setup or mouse is needed to start a run.
3. **Readable and comfortable for everyone.** Accessibility settings shape the defaults, not a hidden menu.
4. **Progress you can trust.** Stats are computed honestly and the leaderboard stays fair, so streaks and ranks mean something.
5. **Every supported language is a full citizen.** Features must work the same way in every word list.

## Accessibility & Inclusion

- Readable typography (Atkinson Hyperlegible), adjustable text size, high-contrast and colour-blind-friendly themes, and user control over sound and motion.
- The whole run must be operable from the keyboard alone.
- Text must render correctly in Cyrillic and Latin-extended scripts (Russian, Uzbek, Polish and others).
