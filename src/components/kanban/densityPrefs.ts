/**
 * Kanban density preference — localStorage adapter.
 *
 * Why localStorage and not the DB: the existing DENSITY_STORAGE_KEY
 * constant in KanbanBoardPage was already scaffolded for this path,
 * and density is a per-browser UI concern, not a shared project setting.
 * No Supabase migration required.
 *
 * Read is tolerant to bad values; write is fire-and-forget.
 */
import type { KanbanDensity } from './kanban-tokens';

export const DENSITY_STORAGE_KEY = 'kanban-density';

const ALL: readonly KanbanDensity[] = ['compact', 'dense', 'comfortable'];

export function readDensityPref(fallback: KanbanDensity = 'comfortable'): KanbanDensity {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (raw && (ALL as readonly string[]).includes(raw)) {
      return raw as KanbanDensity;
    }
  } catch {
    // quota / disabled — swallow and fall back
  }
  return fallback;
}

export function writeDensityPref(d: KanbanDensity): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, d);
  } catch {
    // quota / disabled — swallow
  }
}
