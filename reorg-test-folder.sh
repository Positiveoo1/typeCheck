#!/usr/bin/env bash
set -euo pipefail

cd src/components/test

mkdir -p components hooks utils

# Move a file only if it's still at the old path (safe to re-run).
move_if_present() {
  local from="$1" to="$2"
  if [ -f "$from" ]; then
    mv "$from" "$to"
    echo "moved: $from -> $to"
  elif [ -f "$to" ]; then
    echo "already moved: $to"
  else
    echo "WARNING: neither $from nor $to exists — check filename/case"
  fi
}

move_if_present WordDisplay.jsx components/WordDisplay.jsx
move_if_present ShortcutHints.jsx components/ShortcutHints.jsx

move_if_present useCaretPosition.js hooks/useCaretPosition.js
move_if_present usePressedKeys.js hooks/usePressedKeys.js
move_if_present useRestartShortcut.js hooks/useRestartShortcut.js
move_if_present useTypingEngine.js hooks/useTypingEngine.js

move_if_present keySound.js utils/keySound.js
move_if_present wordDisplayHelpers.js utils/wordDisplayHelpers.js

# --- fix imports inside the moved files ---
sed -i "s#from './wordDisplayHelpers.js'#from '../utils/wordDisplayHelpers.js'#" components/WordDisplay.jsx

sed -i "s#from '../../trainingModes.js'#from '../../../trainingModes.js'#" hooks/useTypingEngine.js
sed -i "s#from '../../typingLogic.js'#from '../../../typingLogic.js'#" hooks/useTypingEngine.js
sed -i "s#from './wordDisplayHelpers.js'#from '../utils/wordDisplayHelpers.js'#" hooks/useTypingEngine.js

sed -i "s#from './keySound.js'#from '../utils/keySound.js'#" hooks/usePressedKeys.js

# --- fix imports inside TypingTest.jsx (stays at top level of test/) ---
sed -i "s#from './ShortcutHints.jsx'#from './components/ShortcutHints.jsx'#" TypingTest.jsx
sed -i "s#from './WordDisplay.jsx'#from './components/WordDisplay.jsx'#" TypingTest.jsx
sed -i "s#from './useCaretPosition.js'#from './hooks/useCaretPosition.js'#" TypingTest.jsx
sed -i "s#from './usePressedKeys.js'#from './hooks/usePressedKeys.js'#" TypingTest.jsx
sed -i "s#from './useTypingEngine.js'#from './hooks/useTypingEngine.js'#" TypingTest.jsx

cd - > /dev/null

# Let git pick up the moves as renames (works whether files were tracked or not)
git add -A

echo ""
echo "Checking for any leftover stale imports..."
grep -rnE "from '\./(WordDisplay|ShortcutHints|useCaretPosition|usePressedKeys|useRestartShortcut|useTypingEngine|keySound|wordDisplayHelpers)" src/components/test/*.jsx src/components/test/*.js 2>/dev/null || echo "None found — looks clean."

echo ""
echo "Done. Run 'git status' to review staged renames, then 'npm run dev' to confirm the build resolves."