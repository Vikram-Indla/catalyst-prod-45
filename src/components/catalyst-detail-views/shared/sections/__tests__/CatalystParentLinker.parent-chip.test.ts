/**
 * Stage 2 Group 1 — Parent chip canonical parity
 *
 * Jira DOM probe 2026-05-10:
 *   background: rgba(0,0,0,0)  color: rgb(80,82,88) = #505258
 *   padding: 0px 0px  no border  no border-radius tint
 *
 * Jira UX probe 2026-05-10 — crossmark behaviour:
 *   Clicking the parent chip in Jira opens the parent picker (same
 *   dropdown as the empty "+ Add parent" trigger). There is NO
 *   immediate-remove CrossIcon button in the idle chip row.
 *   Removing the parent is done via a "Remove parent" option INSIDE
 *   the picker. An unguarded CrossIcon is a destructive single-click
 *   with no confirmation — non-canonical.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PARENT_TOKENS_FOR_TEST } from '../CatalystParentLinker';

const src = readFileSync(resolve(__dirname, '../CatalystParentLinker.tsx'), 'utf-8');

describe('CatalystParentLinker — parent chip canonical parity (Jira probe 2026-05-10)', () => {
  // 2026-07-09: the flat "transparent bg + var(--ds-text-subtle) for every
  // type" contract below was the state right after the 2026-05-10 probe
  // (eadca308a). It was deliberately superseded twice since: 97e4426e6
  // ("Match parent linking of catalyst with Jira", 2026-05-21) reintroduced
  // per-type accent colors, then Vikram's a68171a3e (2026-06-27,
  // "fix(ads): parent lozenge uses subtle accent tokens, not bold slab")
  // corrected those to theme-aware ADS `*-subtler` backgrounds + matching
  // `*-accent-*` text tokens specifically because flat grey didn't
  // distinguish parent types and a bold slab didn't adapt to dark mode.
  // That is the current intended contract — asserted here by token shape
  // (still per-type-agnostic) rather than the old flat literal values.
  it('every PARENT_TOKENS entry uses a theme-aware ADS *-subtler background token', () => {
    for (const [type, tok] of Object.entries(PARENT_TOKENS_FOR_TEST)) {
      expect(
        tok.bg,
        `PARENT_TOKENS["${type}"].bg must be a var(--ds-background-*-subtler) token — got "${tok.bg}"`,
      ).toMatch(/^var\(--ds-background-(accent-[a-z]+-subtler|surface-sunken)\)$/);
    }
  });

  it('every PARENT_TOKENS entry uses a matching ADS accent text token', () => {
    for (const [type, tok] of Object.entries(PARENT_TOKENS_FOR_TEST)) {
      expect(
        tok.text,
        `PARENT_TOKENS["${type}"].text must be a var(--ds-text-accent-*) token — got "${tok.text}"`,
      ).toMatch(/^var\(--ds-text-accent-[a-z]+\)$/);
    }
  });

  it('no immediate-remove CrossIcon button in idle parent chip row', () => {
    // Jira: clicking the parent chip opens the picker — there is no single-click
    // destroy button next to the chip. An unguarded title="Remove parent" button
    // is non-canonical and destructive with no confirmation.
    expect(
      src.includes('title="Remove parent"'),
      'CatalystParentLinker must NOT render a title="Remove parent" button in the idle ' +
      'chip row. Move parent removal into the picker dropdown ("Remove parent" option ' +
      'inside the already-open picker). Single-click destroy is non-canonical.',
    ).toBe(false);
  });

  it('parent lozenge chip click opens picker, not navigates directly', () => {
    // Jira: clicking the parent chip opens the parent-change picker.
    // Navigation (onOpenItem) must only be triggered by an explicit "Open" link
    // INSIDE the picker, never from the idle chip click.
    expect(
      src.includes('onClick={() => onOpenItem?.(currentParent.issue_key)}'),
      'ParentLozenge onClick must NOT call onOpenItem directly. ' +
      'Chip click must open the picker (setShowPicker). ' +
      'Add an "Open" link inside the picker for navigation.',
    ).toBe(false);
  });
});
