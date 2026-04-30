# Agent Notes

## Architecture

- Keep `workspace` as the application shell and `page` as the document/editor domain.
- Keep server/query/cache state in React Query. Use zustand only for local UI shell state where prop chains become noisy.
- Prefer small hooks and pure `lib` helpers over growing editor components or workspace screens past roughly 200 lines.
- Put shared cross-runtime logic under `src/shared` instead of importing from one feature into another.

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
