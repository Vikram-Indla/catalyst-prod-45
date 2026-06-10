/**
 * Singleton coordinator for hover cards.
 *
 * 2026-06-09 Vikram — only ONE hover card may be visible at any time across
 * the entire app. When a new card opens, the previously-open card is closed.
 *
 * Usage from a hover card component:
 *
 *   import { acquire, release } from '@/lib/hover-card-singleton';
 *   const open = () => { acquire(close); setIsOpen(true); };
 *   const close = () => { release(close); setIsOpen(false); };
 */

let currentClose: (() => void) | null = null;

/** Register `closeFn` as the active card. Closes whatever was active before. */
export function acquire(closeFn: () => void) {
  if (currentClose && currentClose !== closeFn) {
    const prev = currentClose;
    currentClose = closeFn;
    prev();
    return;
  }
  currentClose = closeFn;
}

/** Release the slot if this closeFn currently owns it. */
export function release(closeFn: () => void) {
  if (currentClose === closeFn) {
    currentClose = null;
  }
}
