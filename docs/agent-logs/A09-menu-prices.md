# A09 — Menu prices + store first paint

Branch `feature/menu-prices`.

## Menu prices (MN-06 changed, ADR-007)
- `MenuItem.price` (원, VAT incl., same for HOT/ICE, 100원 units) on all 23 items; shown right of the HOT/ICE badges on regular and lead cards (`<data value>`), wraps under the badges on narrow 2-column mobile cards.
- Price band: neighbourhood specialty café, at or slightly above Starbucks (Americano tall 4,700원, latte 5,200원). Coffee 4,000–6,000 / non-coffee 5,800–6,500 / tea 5,000–5,500 / dessert 3,500–7,000.
- Tests: data range/format, `formatPrice`, card display. Docs 00/02/03/11 updated.

## Store page first paint (pre-existing e2e flake)
- `home → /store` CTA tests failed 5/18 on `main` under machine load: the h1 waited for the 1MB three.js chunk, whose evaluation blocked the main thread for up to 2.4s.
- `StorePage` now renders heading/description immediately, then lazy-loads `StoreExperience` on the frame after first paint, with a same-size loading box.
- Result: heading in 1–3.4s instead of up to 6.8s; CTA tests 24/24.

Verification: `npm run verify` (95 unit), `npm run test:e2e` 71 passed / 3 skipped.
