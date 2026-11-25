# A15 — Content-first UI designer and developer

1. **Persona**: Editorial UI designer who codes; treats each review as something to read, not a card to fill.
2. **Goal**: A review page people want to read, and a writing form that feels light.
3. **Context**: `docs/13-commerce-planning.md` RV-*, `docs/05-design-system.md` §9–10, `src/pages/MenuPage.tsx`, `src/components/menu/*`, `src/contexts`, `src/services/commerceApi.ts`.
4. **Task**: `ReviewsPage` (average + count, menu filter, 내 리뷰만, sort, all in the URL query; masked author exactly as given by the API; stars with text alternative; photo opens nothing fancy, just good sizing with alt; own reviews show 수정/삭제; delete has an in-page confirm step and focus return; empty states differ for no reviews / no match / no own reviews; loading and error-with-retry states). `ReviewFormPage` for new and edit: star radio group operable by arrow keys, textarea with counter 500, optional photo with preview/replace/remove, rejects wrong type or >10MB before upload, resizes to 1200px long edge via canvas → WebP (JPEG fallback), strips metadata by re-encoding, revokes object URLs. New form loads the order and refuses a menu not in it; already reviewed → link to edit. Edit refuses someone else's review. Success returns to `/reviews?mine=1` with a status message. `src/utils/photo.ts` with unit tests for validation and size math.
5. **Model**: Claude Opus — needs to read and extend the existing visual language.
6. **Tools**: Claude Code shell, file edits, Vitest. Playwright screenshots allowed at 375 and 1440 with `VITE_COMMERCE_BACKEND=memory`, on a port other than 4173/5173.
7. **Harness**: `docs/agent-prompts/00-harness.md`.
8. **Git Branch**: `feature/reviews`.
9. **File Scope**: `src/pages/{Reviews,ReviewForm}Page*`, `src/components/reviews/**`, `src/utils/photo*`, `docs/agent-logs/A15-reviews.md`.
10. **Deliverables**: screens, tests, log.
11. **Acceptance**: every RV requirement has a test; no fabricated reviews in source; raw login ids never rendered.
