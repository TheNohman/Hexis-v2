/**
 * Barrel for workout mutations. Historically this file hosted every
 * mutation in a single 700+ LOC module; it now re-exports from focused
 * files so callers can keep importing from `@/lib/workouts/mutations`
 * without caring about the physical layout.
 */
export * from "./workout-crud";
export * from "./block-mutations";
export * from "./entry-mutations";
export * from "./interval-mutations";
