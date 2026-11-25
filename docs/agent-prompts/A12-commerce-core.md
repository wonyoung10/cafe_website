# A12 — Frontend platform engineer

1. **Persona**: Architect of small, typed service layers; allergic to leaking backend details into UI.
2. **Goal**: Everything the three UI agents need, so they only fill in screens.
3. **Context**: `docs/13-commerce-planning.md` (all), `src/app/*`, `src/components/layout/*`, `src/test/*`, `src/data/menu.ts`.
4. **Task**
   - `src/types/commerce.ts`, `src/services/{commerceApi,errors,supabaseApi,memoryApi,index}.ts` exactly per §3.
   - `supabaseApi`: dynamic `import('@supabase/supabase-js')` inside a memoised getter so the initial bundle does not grow; publishable key only; map rows↔types; map Supabase/Postgres errors to `CommerceErrorCode`: login-id-invalid, login-id-taken, password-invalid, credentials-mismatch, not-authenticated, cart-empty, quantity-invalid, menu-unknown, temperature-invalid, method-invalid, not-found, forbidden, not-purchased, already-reviewed, rating-invalid, text-invalid, photo-invalid, network, not-configured, unknown. Email = `${loginId.toLowerCase()}@id.cafewebsite-livid.vercel.app`, metadata `{ login_id }`. After signUp without a session (Confirm email still on) throw `not-configured` with a clear message. Photo: upload to `review-photos/<uid>/<uuid>.<ext>` first, then write the row; if the row write fails delete the uploaded file; on replace/remove/delete remove the old file only after the row change succeeded. A failed cleanup must not fail the user action. Never call getUser/await supabase calls inside onAuthStateChange callback synchronously (deadlock): defer.
   - Update/delete that match zero rows must throw `forbidden`, not succeed silently.
   - `memoryApi`: same rules as the SQL (ownership, purchase check, masking, pricing from MENU_ITEMS, caps) persisted in localStorage `haru-leaf:memory`; passwords salted SHA-256 via Web Crypto; photos as data URLs. Only bundled/used when `import.meta.env.VITE_COMMERCE_BACKEND === 'memory'` (dead-code eliminated otherwise; production default supabase).
   - A shared contract test suite `src/services/commerceApi.contract.ts(x)` run against memoryApi, and supabaseApi unit tests with a mocked client.
   - `src/utils/{credentials,mask,nextPath}.ts` + tests. nextPath must reject `//evil`, `/\\evil`, `https:`, control characters, and `/login`,`/signup` loops.
   - Contexts with safe defaults so existing tests that render components without providers keep working. `AuthProvider` + `CartProvider` wrap routes in `src/app/router.tsx` (tests render `AppRoutes` directly). Guest cart in localStorage `haru-leaf:guest-cart`, validated on read. On login merge guest cart into member cart exactly once (StrictMode-safe; clear guest cart only after success; keep it on failure). Race-safe: stale async results must not overwrite newer state. Logging out empties the visible cart.
   - Accept an injected api for tests: `renderApp(path, { api })` (second arg optional).
   - `RequireAuth`, `src/components/common/NotConfiguredNotice.tsx`, lazy routes for every path in §4 with minimal placeholder pages (`src/pages/{Signup,Login,Cart,Checkout,Orders,OrderDetail,Reviews,ReviewForm}Page.tsx`, each with a correct h1 and document title), ErrorBoundary + PageLoader.
   - `NAV_ITEMS` gains 리뷰 as 4th; update the existing tests that assert 3 items. Header: placeholders `AccountMenu`, `CartButton` rendered right of the nav on desktop; on mobile CartButton next to the hamburger and AccountMenu inside the panel (`variant="panel"`). Check the 768px width fits. Placeholder `AddToCart` ({ item: MenuItem }) renders null and is NOT yet mounted.
   - `.env.example`, `src/vite-env.d.ts` typing.
5. **Model**: Codex `gpt-6.2-astra`, reasoning high.
6. **Tools**: Codex CLI shell, Vitest.
7. **Harness**: `docs/agent-prompts/00-harness.md`.
8. **Git Branch**: `feature/commerce-core`.
9. **File Scope**: `src/types/commerce.ts`, `src/services/**`, `src/contexts/**`, `src/utils/{credentials,mask,nextPath}*`, `src/components/auth/{RequireAuth,AccountMenu}*`, `src/components/cart/{CartButton,AddToCart}*`, `src/components/common/NotConfiguredNotice*`, `src/components/layout/Header*`, `src/app/**`, the 8 new pages, `src/test/**`, `src/vite-env.d.ts`, `.env.example`, existing tests asserting nav items, `docs/agent-logs/A12-commerce-core.md`.
10. **Deliverables**: code, tests, log.
11. **Acceptance**: build's initial JS chunk stays under 165KB gzip (report number); no supabase-js in the initial chunk; memoryApi absent from a default production build (grep dist to prove); existing tests green.
