# A04 — Three.js cafe

## Delivered

- `/store`: compact `SectionHeading` (`매장`, `Virtual Store`), concept-space disclosure, existing document title hook, location CTA. Preserved `StoreExperience`'s no-props default-export contract.
- Procedural 12 × 9 × 3.2 m interior: cached 512px plank floor / garden textures, plaster walls and ceiling, walnut baseboards/window frames, oak ceiling louvers, counter/slats/backbar, espresso machine/two group heads/wand/cups, grinder, glazed pastry case, two tables/chairs, window bar/four stools, three plant forms, four pendant fixtures, English menu board.
- `scene/layout.ts` supplies both mesh placements and colliders. Tables, chairs, stools, counter, display, window bar and planters have XZ collision boxes.
- Orbit: damping, zoom/polar constraints, pan and per-frame room clamps. Walk: pointer drag, yaw/pitch, eye height, WASD/arrows, Shift speed, axis-separated collision with substeps, touch D-pad, blur/visibility input cleanup. Camera mode/focus transitions use exponential damping.
- Six accessible HTML marker buttons and a keyboard-accessible list, selected states, responsive info panel, Escape/close, focus restoration. Selecting a hotspot from walk switches to orbit.
- Toolbar/reset/conditional Fullscreen API, device-specific hints, Suspense/useProgress overlay (400 ms minimum plus fade), shared ErrorBoundary fallback, WebGL detection and context-loss fallback, frozen read-only `window.__CAFE_3D__` interface with first-render readiness.
- Shared geometry/material batches using Drei Instances, static root matrix, one shadow-casting sun, coarse-device shadow/light/DPR limits, PerformanceMonitor downgrade, hidden/offscreen pause, explicit texture/geometry/material disposal.
- Home preview contract preserved (`{ className?: string }`, fills parent): same interior, no shadows/UI/hotspots/interactive controls, DPR 1–1.25, demand rendering, slow timer-driven camera revolution while visible, reduced-motion pause, static fallback and context-loss/error recovery.
- Menu lettering uses an original 6.64 kB geometric uppercase font, served locally via Vite. Source generator: `src/components/three/scene/generate-menu-font.py` (Python standard library only). No proprietary/system fonts or external font requests. Troika's own parser successfully read all menu glyphs and outlines.

## ST checklist

Status “implemented” means source and applicable unit/static checks pass. Browser interaction, appearance and measured GPU performance remain unverified because this task explicitly forbids opening a browser.

- [x] ST-01 — R3F Canvas interior implemented.
- [x] ST-02 — All required furnishings, three plant forms, windows, warm lighting and sun shadows implemented; visual review pending.
- [x] ST-03 — Orbit and walk pointer-drag look implemented; browser interaction pending.
- [x] ST-04 — Orbit wheel/pinch zoom implemented through Drei; browser interaction pending.
- [x] ST-05 — Orbit pan and keyboard/D-pad translation implemented; browser interaction pending.
- [x] ST-06 — Orbit touch gestures, touch-action suppression, coarse-pointer D-pad implemented; physical touch review pending.
- [x] ST-07 — Orbit/walk switching and 1.6 m walk eye height implemented; browser interaction pending.
- [x] ST-08 — Six markers/list entries, damped focus and descriptions implemented; data integrity tested.
- [x] ST-09 — Room/height clamps, distance/polar limits implemented; clamp unit test passes.
- [x] ST-10 — Shared layout collision boxes, wall/furniture sliding and anti-tunnelling implemented; unit tests pass.
- [x] ST-11 — Progress status and minimum-duration fading loading overlay implemented.
- [x] ST-12 — WebGL/error/context-loss fallback with SmartImage and six text cards implemented; no-Canvas fallback and image failure tested.
- [x] ST-13 — Instancing, reuse, DPR downgrade, shadow budgets and visibility pause implemented; 60/30fps and <150 actual draw calls require GPU measurement.
- [x] ST-14 — Four device/mode-specific control hints implemented.
- [x] ST-15 — Reset and supported-browser fullscreen implemented; browser interaction pending.
- [x] ST-16 — External hotspot list with real buttons, pressed states and focus handling implemented.

Also supports HM-05 (preview implementation), RT-10 (lazy Three isolation), RT-12 (title), and QA-01/02/03/05.

## Validation

Round 1: typecheck passed; lint found one inline-useMemo-callback rule violation. Corrected it before retrying. No lint suppression added.

Round 2, final full command:

```text
npm run typecheck && npm run lint && npm run test && npm run build

> tsc -b --noEmit                      # exit 0
> eslint .                            # exit 0; 0 errors / warnings
Test Files  10 passed (10)
     Tests  41 passed (41)
✓ 3116 modules transformed.
dist/assets/cafe-grid-Dcc3KsGg.ttf      6.64 kB
dist/assets/index-rslVBXrQ.js         275.02 kB │ gzip: 88.57 kB
dist/assets/StorePage-CF8uVHw9.js   1,094.28 kB │ gzip: 305.84 kB
✓ built in 229ms
```

- New coverage: six collision cases, two hotspot-integrity cases, two WebGL utility cases, two fallback/preview cases, and StorePage heading/title/CTA case (13 added tests).
- Checked built entry JS: no `WebGLRenderer`, `WebGLRenderTarget`, or `OrbitControls` strings; they occur in the separate StorePage chunk. Initial JS gzip 88.57 kB, below the 200 kB target.
- Menu font parsed with the installed Troika/Typr parser; every non-space menu character has a nonempty outline.
- No explicit `any` in owned TypeScript source or tests.
- No browser, preview server, E2E run, commit, branch operation, dependency installation, or out-of-scope source edit performed.

## Open issues / limits

- Vite reports its standard >500 kB chunk-size advisory for the lazy 3D chunk. The main bundle remains isolated. Further shared/manual chunk configuration belongs to A01's Vite config scope.
- Vitest prints a dependency `THREE_CJS_DEPRECATED` warning from the test runner's dependency loading, plus jsdom's getContext notices from an existing app route test. All tests pass; application code uses ESM imports. The owned WebGL utility tests explicitly mock getContext and fallback tests never render Canvas.
- Runtime visual quality, drag/gesture feel, fullscreen, actual context-loss events, browser console, Safari/Firefox behavior, framerate and GPU draw calls need A06 browser/device checks.

## Requests to orchestrator

1. A03: this worktree's HomePage is still the original text-only stub and does not reference StorePreview. Integrate its existing default export with React.lazy after viewport entry, within a sized container, as specified in the cross-agent contract. This file is outside A04 scope; the preview will produce a separate/shared lazy chunk once referenced by the home implementation.
2. A05: `/images/store/store-fallback.webp` is absent in this worktree. Merge the planned image asset. SmartImage already provides the leaf-placeholder failure path.
3. A06: run ST-01..16 browser checks and device/GPU performance checks; use `window.__CAFE_3D__` to observe mode, camera and readiness. No physical floor plan is represented; keep the concept-space disclosure.
