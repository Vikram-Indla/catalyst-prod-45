/**
 * catalystFlagsStore — Atlaskit Flag-based app feedback channel.
 *
 * Replaces the loud green / red Sonner toasts with bottom-left Atlassian
 * Flags. Started as a pilot on the For You dashboard reply flow; the
 * intent is to extend project-wide once the PO signs off.
 *
 * Contract:
 *   - `addFlag` returns the generated id so the caller can dismiss it
 *     programmatically (e.g. on undo).
 *   - Success / info flags auto-dismiss after `DEFAULT_AUTO_DISMISS_MS`.
 *     Errors are sticky — the user must dismiss them or take an action.
 *   - The shell mounts a single `FlagGroup` reading from this store, so
 *     anywhere in the app can drop a flag without prop-drilling.
 */
import { create } from 'zustand';

export type CatalystFlagAppearance = 'success' | 'info' | 'warning' | 'error';

export interface CatalystFlag {
  id: string;
  appearance: CatalystFlagAppearance;
  title: string;
  description?: string;
  /** When true the flag persists until the user dismisses it. Defaults
   *  to `true` for error/warning and `false` for success/info. */
  sticky?: boolean;
}

export interface AddFlagInput {
  appearance: CatalystFlagAppearance;
  title: string;
  description?: string;
  sticky?: boolean;
}

interface CatalystFlagsStore {
  flags: CatalystFlag[];
  addFlag: (input: AddFlagInput) => string;
  dismissFlag: (id: string) => void;
  clearAll: () => void;
}

const DEFAULT_AUTO_DISMISS_MS = 5000;

let counter = 0;
const nextId = () => `flag-${Date.now()}-${counter++}`;

export const useCatalystFlagsStore = create<CatalystFlagsStore>((set, get) => ({
  flags: [],
  addFlag: ({ appearance, title, description, sticky }) => {
    const id = nextId();
    const resolvedSticky =
      sticky ?? (appearance === 'error' || appearance === 'warning');
    set((s) => ({
      flags: [...s.flags, { id, appearance, title, description, sticky: resolvedSticky }],
    }));
    if (!resolvedSticky) {
      setTimeout(() => get().dismissFlag(id), DEFAULT_AUTO_DISMISS_MS);
    }
    return id;
  },
  dismissFlag: (id) =>
    set((s) => ({ flags: s.flags.filter((f) => f.id !== id) })),
  clearAll: () => set({ flags: [] }),
}));

/** Imperative helper for non-React callers (event handlers, mutations). */
export function addCatalystFlag(input: AddFlagInput): string {
  return useCatalystFlagsStore.getState().addFlag(input);
}
