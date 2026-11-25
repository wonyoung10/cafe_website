# A14 — Commerce flow engineer

1. **Persona**: Frontend engineer who has shipped checkouts and worries about double clicks and lost carts.
2. **Goal**: Menu → cart → checkout → order history that cannot lose or duplicate an order.
3. **Context**: `docs/13-commerce-planning.md` SH-*, `src/components/menu/*`, `src/contexts`, `src/utils/menu.ts` (formatPrice), `docs/05-design-system.md` §9–10.
4. **Task**: `AddToCart` mounted in both MenuCard variants on the menu page only (home featured cards stay unchanged — prop `showAddToCart`): HOT/ICE toggle when both exist, quantity not needed, "담기" + `role="status"` feedback naming the item, keeps lead-card grid from breaking. `CartButton` with count (accessible name "장바구니, 3개"). `CartPage`: lines, quantity stepper 1–20, remove with undo-free confirmation by focus management, total, empty state linking to menu, checkout button (guest → login with next=/checkout). `CheckoutPage`: order summary; radio group 받는 방법 = 테이크아웃 / 매장에서; radio group 결제 방법 = 현장 결제 / 온라인 결제, both required, same two payment options for both receive methods; clear notice that no real payment happens; onsite → "주문하기" places the order; online → modal mock payment dialog (native `<dialog>` or focus-trapped) showing amount, "모의 결제 승인" and "취소", NO card/phone/bank inputs; cancel keeps cart and creates no order; pending state blocks double submit; failure keeps cart and shows a retryable alert. After success `navigate('/orders/:id', { replace: true })`. `OrdersPage` list newest first; `OrderDetailPage` (not found for other users' ids) shows order number, lines, total, receive/payment labels, payment status label ("현장에서 결제 예정" / "모의 결제 완료"), and per distinct menu a link 리뷰 쓰기 → `/reviews/new?order=<id>&menu=<menuId>` or 리뷰 수정 → `/reviews/<id>/edit` (use `api.reviews.list({ mineOnly: true })`). Labels in `src/utils/order.ts`.
5. **Model**: Codex `gpt-6.2-astra`, reasoning high.
6. **Tools**: Codex CLI shell, Vitest + Testing Library.
7. **Harness**: `docs/agent-prompts/00-harness.md`.
8. **Git Branch**: `feature/cart-checkout`.
9. **File Scope**: `src/pages/{Cart,Checkout,Orders,OrderDetail}Page*`, `src/components/{cart,checkout,orders}/**`, `src/components/menu/{MenuCard,MenuCategorySection}*`, `src/utils/order*`, `docs/agent-logs/A14-cart-checkout.md`.
10. **Deliverables**: screens, tests (all 4 combos, cancel, double click, failure, empty cart, guest redirect, foreign order id), log.
11. **Acceptance**: every SH requirement has a test; no payment data field exists; existing menu tests green.
