/**
 * Stage 2 Group 1 — Parent chip canonical parity
 *
 * Jira DOM probe 2026-05-10:
 *   background: rgba(0,0,0,0)  color: rgb(80,82,88) = #505258
 *   padding: 2px 0px  no border  no border-radius tint
 */

import { describe, it, expect } from 'vitest';
import { PARENT_TOKENS_FOR_TEST } from '../CatalystParentLinker';

describe('CatalystParentLinker — parent chip canonical parity (Jira probe 2026-05-10)', () => {
  it('every PARENT_TOKENS entry uses transparent background', () => {
    for (const [type, tok] of Object.entries(PARENT_TOKENS_FOR_TEST)) {
      expect(
        tok.bg,
        `PARENT_TOKENS["${type}"].bg must be "transparent" — got "${tok.bg}"`,
      ).toBe('transparent');
    }
  });

  it('every PARENT_TOKENS entry uses Jira canonical text color var(--ds-text-subtle, #505258)', () => {
    for (const [type, tok] of Object.entries(PARENT_TOKENS_FOR_TEST)) {
      expect(
        tok.text,
        `PARENT_TOKENS["${type}"].text must be "var(--ds-text-subtle, #505258)" — got "${tok.text}"`,
      ).toBe('var(--ds-text-subtle, #505258)');
    }
  });
});
