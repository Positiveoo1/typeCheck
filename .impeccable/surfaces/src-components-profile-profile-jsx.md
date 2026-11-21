---
version: 1
slug: "src-components-profile-profile-jsx"
primary_target: "src/components/profile/Profile.jsx"
related_targets: ["src/components/profile/PublicProfile.jsx"]
---

# Profile surface

Mode: Operate. Audience: a signed-in typist reviewing their own standing and editing public details. Job: see the level and progress toward the next one, review lifetime stats, badges and activity, and manage public details and password reset. Constraints: theme tokens; edit modal, avatar preview, sign out and reset-email limits keep their behaviour; mobile-safe; stays inside the app width (the current panel overflows it).

## Direction contract

THESIS: The profile is a level journey. Your position on the tier track E to S is the identity. It refuses the wall of seven identical stat cards.

OWN-WORLD: Theme tokens only. Restrained. Signature move: a horizontal tier rail (Rookie E 0, Bronze D 40, Silver C 60, Gold B 80, Diamond A 100, Elite S 120 WPM) with a marker at the exact best WPM and the distance to the next tier. Lifetime stats are one ruled definition row. Badges are a compact strip with locked badges dimmed. Activity grid kept. Account is a quiet ruled section at the end.

STORY: The typist sees who they are (name, handle, city, links), where they stand on the tier rail and what reaching the next level takes, then lifetime numbers, badges and activity. Editing and security are available but quiet.

FIRST VIEWPORT: Header. Identity row: avatar, h2 handle, display name, city and joined date, with Edit and Sign out on the right. Full-width tier rail with the marker and an "N WPM to Level X" caption. A ruled stats row: best WPM, tests completed, streak, typing time, words, consistency. The badges strip starts above the fold at 1440x900.

FORM: Level journey, position 7 of my 7 ordered candidates (dealt lead). seed:5ac6bdc2b0ca4f72

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
