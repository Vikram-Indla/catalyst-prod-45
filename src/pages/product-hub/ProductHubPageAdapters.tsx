/**
 * ProductHubPageAdapters — thin route wrappers for per-product hub pages.
 *
 * Resolves `:key` (products.code, e.g. "INV") → products table lookup →
 * forwards resolved product info to canonical project-hub components.
 *
 * ProductHubBacklogAdapter removed 2026-06-01: /product-hub/:key/backlog
 * now uses ProductNativeBacklogPage (business_requests data model).
 *
 * ProductHubAllWorkAdapter updated 2026-06-01: /product-hub/:key/allwork
 * now uses ProductNativeAllWorkPage (business_requests + demand_process_steps).
 */

// ProductNativeAllWorkPage handles its own product lookup internally —
// no wrapper logic needed. Re-export as the adapter for the route.
// NOTE: do NOT lazy() here — FullAppRoutes.tsx already wraps this export
// in lazy(); double-wrapping would feed React a promise instead of a
// component and throw "Element type is invalid".
export { default as ProductHubAllWorkAdapter } from '@/pages/product-hub/ProductNativeAllWorkPage';
