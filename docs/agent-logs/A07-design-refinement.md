# A07 — Design refinement (/frontend-design)

Branch `feature/design-refinement`. Tokens (colors, fonts, type scale, shadows) unchanged; brand copy unchanged.

| Area | Change |
|---|---|
| Signature | `WeekBranch` — this week's branch with seven weekday leaves (past = sage, today = forest, upcoming = dotted outline). The page's only automatic motion: the stem grows, then the leaves appear one by one. Static under reduced motion. |
| Hero | Today's date line replaces the English all-caps strap; desktop image bleeds to the right edge; caption removed. |
| Philosophy | Left-aligned large serif quote; value cards → hairline-divided columns; scattered `Reveal` motion removed (component deleted). |
| Sections / pages | English uppercase eyebrows removed (home, menu, store, location, footer, hotspot panel). Store hotspot list numbers → leaf marks (not a sequence). |
| Location | Address set in serif 700 on home summary and the address card. |
| Docs | `docs/05-design-system.md` §9 usage guidance. |

Verification: `npm run verify` (65 unit tests) and `npm run test:e2e` (69 passed / 3 skipped, device-conditional) passed.
