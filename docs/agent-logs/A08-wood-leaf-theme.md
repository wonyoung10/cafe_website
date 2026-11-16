# A08 — Wood & leaf theme (/frontend-design)

Branch `feature/wood-leaf-theme`. User asked for a stronger tree-and-leaf mood including colors, so tokens changed this time (fonts and copy unchanged).

| Area | Change |
|---|---|
| Palette | Cream → leaf-shade paper (`#F4F3EA`), moss alternate, new `sprout` / `oak` / `oak-light` / `bark`; shadows tinted bark. `src/styles/index.css`, `tokens.ts`, favicon, theme-color. |
| Shape language | Leaf corners (`rounded-leaf-sm / leaf / leaf-lg`) on buttons, chips, badges, cards, photos, map, 3D frame, logo badge. |
| Hero | `LeafShade` — blurred branch shadows behind the copy, slow 14s sway (static under reduced motion). |
| Menu section | `bg-oak` wood-grain tabletop (single 2400px noise tile, no seam). |
| Footer | Two-layer forest-edge silhouette; labels in `sprout` for contrast. |
| WeekBranch | Past leaves forest, today `sprout`, stem `bark`. |
| Header | Active nav marker is a small sprout leaf. |
| Docs | `docs/05-design-system.md` token table + §10. |

Contrast checked (WCAG AA): ink-soft on ivory 6.5, forest on oak-light 6.7, sprout on forest 5.12.
Verification: `npm run verify` (79 unit) and `npm run test:e2e` (71 passed / 3 skipped).
