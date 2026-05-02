# Agent Notes

## Architecture

- Keep `workspace` as the application shell and `page` as the document/editor domain.
- Keep server/query/cache state in React Query. Use zustand only for local UI shell state where prop chains become noisy.
- Prefer small hooks and pure `lib` helpers over growing editor components or workspace screens past roughly 200 lines.
- Put shared cross-runtime logic under `src/shared` instead of importing from one feature into another.

## Component Boundaries

- Components should primarily render UI. Do not leave calculation, condition-building, DOM measurement, selector lookup, or state-transition logic in component files when it can live in `lib` or hooks.
- Keep small render-only child components in the same component file when they are purely JSX presentation and are not reused elsewhere.
- Move stateful UI behavior, timers, refs, effects, subscriptions, and event-flow orchestration into feature hooks under `hooks/`.
- Move pure calculations, shape-aware conditions, tree/grouping helpers, drag/drop placement math, and DOM geometry helpers into feature `lib/`.
- If a component starts accumulating several local handler/helper functions, classify each one before extracting: render-only stays with the component, state/effect/event orchestration becomes a hook, and pure logic becomes a `lib` helper.
- Avoid inline render functions that recursively or repeatedly return component trees from inside another component; extract them into named components so React reconciliation stays explicit.

## Readability Guardrails

- Treat 200 lines as a review trigger, not a formatting game. A component or screen over roughly 200 lines should justify why it still owns all of that behavior.
- When a file crosses the threshold, classify the extra code in this order:
  1. Render-only JSX for a distinct block of UI -> extract a named component near the original feature.
  2. State, refs, effects, subscriptions, timers, keyboard wiring, or event choreography -> extract a feature hook under `hooks/`.
  3. Pure calculation, grouping, condition-building, tree math, or DOM geometry math -> extract a helper under `lib/` or `web/`.
  4. Shared domain shape used across components/hooks -> move the type to `types/`.
- Prefer meaningful prop bundles over long prop tunnels. Bundle by responsibility, such as `editorActions`, `dragActions`, `selectionState`, or `pageEditorProps`; do not hide unrelated behavior in a generic `actions` bag.
- Screens should compose data, controllers, and layout. If a screen starts handling command context, route fallback, page reconciliation, or restore flows inline, move those flows into small workspace hooks.
- Hooks may be longer than render components when they coordinate real behavior, but a hook over roughly 200 lines should be checked for separate concerns such as sync, history, drag, command, and route handling.
- After extracting, read the call site first. A new developer should be able to infer the feature flow from the prop names and hook names without opening every implementation file.

## React State

- Do not mirror values that can be derived from props/state with `useEffect`. Compute them during render, and keep state only for real user intent or external synchronization.
- Separate event logic from effect logic. Effects should subscribe to browser/external systems or sync imperative APIs, not encode normal UI transitions.
- For editor hot paths, avoid `JSON.stringify` as equality logic. Use shape-aware comparators and keep JSON stringification limited to storage, RPC payloads, or history snapshots.

## DOM Geometry

- Centralize DOM measurement, viewport tracking, and RAF throttling in hooks/helpers instead of embedding it in UI components.
- Use event-driven geometry updates for scroll, resize, and observed element size changes. Avoid continuous `requestAnimationFrame` loops unless the UI is actively animating.
- Cache block rects at the start of drag/range selection and compare against cached geometry during pointer movement.

## Verification

- Run `bun run check` after editor or sync changes; it covers typecheck, tests, and build.
- Run `npx -y react-doctor@latest . --verbose --diff` after React changes and address new findings before stopping.
