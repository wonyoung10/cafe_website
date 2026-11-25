# Common harness (all commerce agents)

- Project: React 19, Vite 8, TypeScript 6 strict (noUncheckedIndexedAccess), React Router DOM 7 declarative, Tailwind CSS 4, Vitest. You run inside a git worktree with node_modules installed.
- Source of truth: `docs/13-commerce-planning.md` (requirements, DB, TypeScript contracts, routes). Do not change a contract. If one is impossible, stop and write it under "Requests to orchestrator".
- NO network and NO new packages. Do not edit package.json or package-lock.json.
- Do NOT run git commit / checkout / switch / rebase / push. The orchestrator reviews and commits.
- Stay strictly inside your File Scope. Never weaken, skip or delete an existing test to get green.
- Never use `any`. Never use `window.location.href` for navigation. Alias `@/` = `src/`.
- Security: never log passwords or tokens. Never put a `service_role`/secret key anywhere. Render user text as text (no dangerouslySetInnerHTML). Photo URLs only from our own API.
- Design: read `docs/05-design-system.md` §9–10 and existing components first. Leaf corners `rounded-leaf-sm|leaf|leaf-lg` (not `rounded-full`), tokens only, `font-serif` for headings, no English uppercase eyebrow, no numbered decoration, no emoji, no exclamation marks. Touch targets at least 44px. Works at 375px without horizontal scroll.
- Copy: Korean, polite, short. Buttons say what happens. Errors say what to fix.
- Accessibility: labels on every field, errors linked with `aria-describedby` + `aria-invalid`, focus moves to the first invalid field, status messages via `role="status"`/`role="alert"`, full keyboard use, `motion-safe:` for motion.
- Validate before finishing: `npm run typecheck && npm run lint && npm run test && npm run build`. Zero lint warnings. On failure fix and rerun, at most 3 rounds, then report honestly.
- Deliverable log: `docs/agent-logs/<ID>-<name>.md` — what was built per requirement ID, real validation summary lines, anything NOT verified, requests to orchestrator. Never claim a check you did not run.
