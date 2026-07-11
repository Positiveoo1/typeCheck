# Contributing to TypeCheck

Thanks for considering a contribution to TypeCheck! This project is a
beginner-friendly typing speed test built with Next.js, React, and Firebase,
and contributions of all sizes are welcome.

## Ways to contribute

- **Bug fixes** — anything from a broken layout to incorrect WPM/accuracy math.
- **New training modes** — see `src/trainingModes.js` for how existing modes
  (Standard, Weak letters, Quotes, Code, Numbers, Accuracy lock) are defined.
- **New languages / word lists** — see `src/languages/` for the existing
  format. Adding a new language file is one of the easiest ways to contribute.
- **UI/UX improvements** — themes, accessibility, mobile responsiveness.
- **Test coverage** — new tests in `src/typingLogic.test.js` or additional
  `*.test.js` files.
- **Documentation** — README clarity, code comments, this file.

If you're not sure whether something is wanted, open an issue first to
discuss before doing a lot of work.

## Getting set up

```bash
git clone https://github.com/Positiveoo1/typeCheck.git
cd typeCheck
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Firebase environment variables are
optional for local development — the typing test itself works without them.
Account-related features (auth, dashboard, leaderboard) require a Firebase
project; see the README's "Environment Variables" section.

## Before you open a pull request

1. **Run the test suite:**
   ```bash
   npm test
   ```
   This runs the typing logic test suite (WPM/accuracy calculations, mistake
   counting, paste/autofill limiting, training target generation, etc.) using
   Node's built-in test runner. Add tests for any new logic in
   `src/typingLogic.js` or `src/trainingModes.js`.

2. **Check formatting and linting with Biome:**
   ```bash
   npx biome check .
   ```
   Fix any issues it reports before opening your PR
   (`npx biome check --write .` will auto-fix most of them).

3. **Build the project** to make sure nothing is broken:
   ```bash
   npm run build
   ```

## Branch and commit conventions

- Branch off `main`, using a short descriptive name, e.g.
  `feature/spanish-word-list`, `fix/leaderboard-sort`.
- Keep commits focused — one logical change per commit where practical.
- Write commit messages in the imperative mood ("Add Spanish word list", not
  "Added" or "Adding").

## Opening a pull request

- Fill in a clear description of **what** changed and **why**.
- Link any related issue (`Fixes #12`, `Closes #34`).
- Keep PRs focused on a single feature or fix — smaller PRs are reviewed
  faster.
- Screenshots or a short screen recording are appreciated for any UI changes.

## Code style notes

- This project uses [Biome](https://biomejs.dev/) for linting and formatting
  — please don't introduce a different formatter's output.
- Match the existing patterns in `src/components/` for new UI components.
- Core typing logic lives in `src/typingLogic.js` and should stay
  framework-agnostic and easily testable (pure functions where possible).

## Reporting bugs

Open an issue with:
- Steps to reproduce
- Expected vs. actual behavior
- Browser/OS if relevant
- Screenshots if it's a visual bug

## Code of conduct

Be respectful and constructive. Assume good intent, and keep feedback
focused on the code, not the person.

Thanks again for contributing to TypeCheck!
