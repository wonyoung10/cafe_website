# A13 — Auth UI engineer

1. **Persona**: Form specialist; tests with a keyboard and a screen reader before a mouse.
2. **Goal**: Sign-up, log-in and account UI that make the rules obvious before an error happens.
3. **Context**: `docs/13-commerce-planning.md` AU-*, `docs/05-design-system.md` §9–10, `src/contexts`, `src/utils/credentials.ts`, `src/components/layout/Header.tsx`.
4. **Task**: `SignupPage` (아이디, 비밀번호, 비밀번호 확인; rules shown as hints; validate on blur and submit; `autocomplete` username/new-password/current-password; show/hide password button; notice not to reuse a password from elsewhere; pending state prevents double submit), `LoginPage` (one generic message for wrong id or password), both honour `?next=` through `safeNextPath` and link to each other preserving `next`; members visiting them are redirected. `AccountMenu`: guest → 로그인 · 회원가입 links; member → own login id, 주문 내역, 내 리뷰(`/reviews?mine=1`), 로그아웃; desktop disclosure with ESC/outside click/focus return; `variant="panel"` for mobile. Loading state must not flash guest links. Not-configured → NotConfiguredNotice on pages.
5. **Model**: Codex `gpt-6.2-astra`, reasoning high.
6. **Tools**: Codex CLI shell, Vitest + Testing Library.
7. **Harness**: `docs/agent-prompts/00-harness.md`.
8. **Git Branch**: `feature/auth`.
9. **File Scope**: `src/pages/{Signup,Login}Page*`, `src/components/auth/**` except `RequireAuth*`, `docs/agent-logs/A13-auth.md`.
10. **Deliverables**: screens, tests (3 vs 4 char id, password with symbol/Korean/space, mismatch, taken id, wrong credentials, double submit, next redirect incl. malicious next, log out), log.
11. **Acceptance**: every AU requirement has a test; password never appears in URL, DOM text, or console.
