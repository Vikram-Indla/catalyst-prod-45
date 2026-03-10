/**
 * Feature flags — controlled via environment variables.
 * Set VITE_ENABLE_AI=false in your hosting provider to disable heavy AI/export modules.
 */

export const ENABLE_AI = import.meta.env.VITE_ENABLE_AI !== 'false';
export const ENABLE_HEAVY_EXPORTS = import.meta.env.VITE_ENABLE_HEAVY_EXPORTS !== 'false';
