/**
 * Canonical entry point for the ProductHub backlog hook.
 *
 * Re-exports `useRequestsBacklog` (canonical), plus the legacy aliases
 * `useMDTBacklog` and `useInitiativesBacklog` and the row types
 * (`BRDTask`, `MDTRequest`), from the implementation file
 * `useMDTBacklog.ts`. Both import paths resolve to the same hook
 * during the file rename — `@/hooks/useRequestsBacklog` (preferred)
 * and `@/hooks/useMDTBacklog` (legacy, kept until call sites migrate).
 */
export * from './useMDTBacklog';
