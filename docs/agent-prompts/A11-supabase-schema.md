# A11 — Postgres / RLS security engineer

1. **Persona**: Senior Postgres engineer who assumes the client is hostile. Every rule lives in the database.
2. **Goal**: One SQL file the user pastes into the Supabase SQL Editor, plus tests proving its policies.
3. **Context**: `docs/13-commerce-planning.md` §1–2, `src/data/menu.ts`, `docs/decisions/ADR-008-commerce-scope.md`.
4. **Task**
   - `supabase/schema.sql`: tables, constraints, indexes, RLS (enabled on every table), column grants, trigger `handle_new_user` on `auth.users`, the 5 RPCs, storage bucket + policies, menu seed (`on conflict do update`). Must be safe to re-run (idempotent). Korean comments explaining each block. Revoke default privileges explicitly: `anon`/`authenticated` get only what §2 lists; `revoke execute ... from public, anon` on every function, then grant precisely.
   - `handle_new_user`: security definer, `search_path=''`. login_key = local part of `new.email`; require domain `id.cafewebsite-livid.vercel.app`, `^[a-z0-9]{4,20}$`. `login_id` comes from `raw_user_meta_data->>'login_id'` only if its lowercase equals login_key, otherwise login_key. Raise on violation.
   - Reviews: insert policy requires `user_id = auth.uid()` AND an order line of that menu in an order owned by `auth.uid()`. Photo path must be null or start with `auth.uid()::text || '/'` (insert and update). Table grants: insert only `(user_id, order_id, menu_id, rating, body, photo_path)`, update only `(rating, body, photo_path)`. `updated_at` set by trigger. Body constraint uses btrim length 1..500.
   - Wrap `auth.uid()` as `(select auth.uid())` in policies.
   - `list_reviews`: returns `id, order_id, menu_id, rating, body, photo_path, author_masked, is_mine, created_at, updated_at`. Mask = all but the last 2 characters + `**`. `order_id` is null unless mine. `p_mine=true` with no user returns nothing. `p_sort` in latest|rating-high|rating-low, unknown → latest. Deterministic tie-break.
   - `place_order`: lock the user's cart rows (`for update`), reject empty, price from `menu_items`, insert order + lines, delete those cart rows, return id. `order_no` human readable and unique (e.g. `20261125-XXXXXX`, KST date). `payment_status` = onsite→`onsite-due`, online→`mock-paid`.
   - temperature: `''` means none; must be valid for that menu (desserts only `''`, others one of the item's temperatures).
   - `supabase/tests/`: Vitest + PGlite (`// @vitest-environment node`). Bootstrap fake `auth` schema (users, `auth.uid()` from `request.jwt.claims`), `storage` schema (buckets, objects, `storage.foldername`), roles anon/authenticated. Run `schema.sql` TWICE, then test as each role with `set local role`. Cover: seed equals MENU_ITEMS exactly; RLS on all tables; anon cannot read profiles/orders/cart/reviews tables; user A cannot read/update/delete B's cart, orders, lines, reviews; direct insert into orders/order_lines/cart_items refused; tampering price impossible; all 4 receive×payment combos; empty cart; quantity 0/21; bad temperature; unknown menu; add caps at 20; merge_cart malformed json rejected as a whole; second place_order fails with cart-empty; review without purchase refused; duplicate refused; rating 0/6, blank and 501-char body refused; changing user_id/order_id/menu_id refused; photo path in another user's folder refused; masked id correct; raw login id and user_id appear nowhere in list_reviews columns; signup trigger rejects 3-char, symbol, foreign domain, duplicates; storage policies (own folder only).
   - `supabase/README.md` (Korean): step by step for a beginner — create project, turn off Confirm email, minimum password length 6, run schema.sql, copy URL and publishable key into `.env.local` and Vercel, never the secret key, pausing note, how to check it worked.
5. **Model**: Codex `gpt-6.2-astra`, reasoning high — precise, test-decidable SQL.
6. **Tools**: Codex CLI shell, Vitest, PGlite.
7. **Harness**: `docs/agent-prompts/00-harness.md`.
8. **Git Branch**: `feature/supabase-schema`.
9. **File Scope**: `supabase/**`, `docs/agent-logs/A11-supabase-schema.md`.
10. **Deliverables**: schema.sql, tests, README, log.
11. **Acceptance**: all listed cases tested and green; schema runs twice cleanly; list in the log every Supabase behaviour PGlite cannot prove (real Auth, Storage, PostgREST).
