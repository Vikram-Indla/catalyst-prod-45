// ============================================================================
// src/spaces/a11y/focusFirstError.ts
// DOM focus helper — moves keyboard focus + screen-reader announcement
// to the first invalid field after a failed validation/submit.
// ============================================================================

import type { CreateSpaceDraft } from '../types';

/**
 * Stable form-field-name → DOM `name` attribute on the input/textarea/select.
 * The wizard step components must use these `name` values verbatim.
 */
export const FIELD_NAME_TO_DOM: Record<keyof CreateSpaceDraft, string> = {
  name: 'space-name',
  key: 'space-key',
  purpose: 'space-purpose',
  description: 'space-description',
  permissionScheme: 'space-permission-scheme',
  isPrivate: 'space-is-private',
  features: 'space-features',
};

/**
 * Focus the first invalid field. Returns true if focus moved, false otherwise.
 * The wizard root passes `containerRef.current` so we don't accidentally
 * yank focus across modals.
 */
export function focusFirstError(
  field: keyof CreateSpaceDraft | null,
  container: HTMLElement | Document | null = typeof document !== 'undefined' ? document : null,
): boolean {
  if (!field || !container) return false;

  const domName = FIELD_NAME_TO_DOM[field];
  if (!domName) return false;

  // Match by `name` first (textfields, textarea, native selects), then by id.
  const byName = (container as HTMLElement).querySelector?.(
    `[name="${domName}"]`,
  ) as HTMLElement | null;
  const byId = (container as HTMLElement).querySelector?.(
    `#${domName}`,
  ) as HTMLElement | null;

  const target = byName ?? byId;
  if (!target) return false;

  // Wait one frame so any error rendering has flushed before focusing.
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      try { target.focus({ preventScroll: false }); } catch { target.focus(); }
    });
  } else {
    target.focus();
  }

  return true;
}
