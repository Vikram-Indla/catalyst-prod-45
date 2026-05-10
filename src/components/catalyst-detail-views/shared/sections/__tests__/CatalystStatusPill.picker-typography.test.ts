/**
 * Stage 2 Group 5 — CatalystStatusPill picker open-state typography
 *
 * The picker option buttons (role="menuitem" with height:36 — the status rows)
 * must have explicit fontSize:14 and color:text token so the dropdown text is
 * not "washed-off" (relying on inherited muted parent colors).
 * The "View workflow" footer buttons already have this correct — the status
 * option buttons were missing it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../CatalystStatusPill.tsx'),
  'utf-8',
);

describe('CatalystStatusPill — picker option button typography', () => {
  it('picker option button style must not rely on fontFamily:inherit alone — fontSize:14 required alongside it', () => {
    // The picker option buttons have `fontFamily: 'inherit'` but used to be missing
    // fontSize. Check the specific pattern: fontFamily:'inherit' must be followed
    // (within ~50 chars) by fontSize:14 in the same style block.
    // We check that every `fontFamily: 'inherit'` in the file is within 50 chars
    // of a `fontSize:` declaration (i.e. no orphaned fontFamily without fontSize).
    const orphanPattern = /fontFamily: 'inherit',(?:(?!fontSize).){0,80}\n\s*\}/;
    expect(
      orphanPattern.test(src),
      'A fontFamily:inherit in a button style lacks an explicit fontSize. ' +
      'Picker option buttons must specify fontSize:14 alongside fontFamily:inherit.',
    ).toBe(false);
  });

  it('picker option buttons must set color:text (not inherited/muted color)', () => {
    // Every style block containing `height: 36` (picker row height) must also
    // contain a color: token('color.text' call.
    // Extract blocks around height:36 and verify each has a color.text reference.
    const heightBlocks = src.split("height: 36,");
    // Skip first segment (before any height:36) and check each one that follows
    const blocksWithIssue = heightBlocks.slice(1).filter(block => {
      // Take up to 300 chars after "height: 36," to stay within the style object
      const context = block.slice(0, 500);
      return !context.includes("color: token('color.text'");
    });
    expect(
      blocksWithIssue.length,
      `${blocksWithIssue.length} button block(s) with height:36 lack color:token('color.text',...). ` +
      "All picker row buttons must have explicit text color.",
    ).toBe(0);
  });
});
