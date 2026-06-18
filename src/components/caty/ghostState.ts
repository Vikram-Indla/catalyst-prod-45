/**
 * ghostState — pure reducer for the muted "ghost" predictive suggestion shown
 * in the canonical AI search input.
 *
 * Behavior (Vikram spec): a muted top-prediction sits in the empty box. Pressing
 * Enter / Tab accepts it as the query. The moment the user types (or explicitly
 * clicks-in to edit), the ghost is dismissed and never revives for that open —
 * the field belongs to the user from then on. Re-arming only happens on the next
 * `open`.
 *
 * The component decides WHEN to dispatch (e.g. it does not fire `focusClear` on
 * autofocus, so Enter-to-accept still works on a freshly opened, focused box).
 */

export interface GhostState {
  input: string;
  ghost: string | null;
  dismissed: boolean;
}

export type GhostAction =
  | { type: "open"; ghost: string | null }
  | { type: "change"; value: string }
  | { type: "acceptGhost" }
  | { type: "focusClear" };

export function ghostReducer(state: GhostState, action: GhostAction): GhostState {
  switch (action.type) {
    case "open":
      return { input: "", ghost: action.ghost, dismissed: false };
    case "change":
      return { input: action.value, ghost: null, dismissed: true };
    case "acceptGhost":
      if (!state.ghost) return state;
      return { ...state, input: state.ghost, ghost: null, dismissed: true };
    case "focusClear":
      if (state.dismissed && state.ghost === null) return state;
      return { ...state, ghost: null, dismissed: true };
    default:
      return state;
  }
}
