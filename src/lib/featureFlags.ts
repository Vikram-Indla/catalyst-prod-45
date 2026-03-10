/**
 * Feature flags — controlled via environment variables.
 * 
 * Defaults to FALSE so that Lovable publish (which doesn't set env vars)
 * gets a slim build. Set VITE_ENABLE_AI=true in your hosting provider
 * to re-enable AI/heavy modules.
 */

export const ENABLE_AI = import.meta.env.VITE_ENABLE_AI === 'true';
export const ENABLE_HEAVY_EXPORTS = import.meta.env.VITE_ENABLE_HEAVY_EXPORTS === 'true';
export const ENABLE_WIKI = import.meta.env.VITE_ENABLE_WIKI === 'true';
export const ENABLE_KNOWLEDGE_HUB = import.meta.env.VITE_ENABLE_KNOWLEDGE_HUB === 'true';

/**
 * Master gate — set VITE_ENABLE_FULL_APP=true in Vercel/hosting
 * to unlock ALL modules. When false, only auth + for-you render.
 */
export const ENABLE_FULL_APP = import.meta.env.VITE_ENABLE_FULL_APP === 'true';
