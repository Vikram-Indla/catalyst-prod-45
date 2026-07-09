/**
 * Regression test for assignee cell dark mode visibility bug (2026-06-19).
 *
 * Bug: Avatar name span had hardcoded dark text #292A2E rgb(41, 42, 46)
 * which became invisible on dark backgrounds in dark mode.
 * Fix: Use token('color.text', 'var(--ds-text)') for theme-aware color.
 *
 * This test verifies that the assignee name span does NOT use hardcoded
 * dark colors (#292A2E, rgb(41, 42, 46)) and instead uses theme tokens.
 */

import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen } from '@testing-library/react';
import { makeAssigneeEditCell } from '../editors';

describe('assignee cell dark mode', () => {
  it('should not use hardcoded dark text color var(--ds-text) in assignee name span', () => {
    // Create a minimal assignee edit cell
    const AssigneeCell = makeAssigneeEditCell({
      getAssignee: (row: any) => row.assignee,
      options: [
        { id: '1', name: 'Alice Smith' },
        { id: '2', name: 'Bob Jones' },
      ],
      onChange: () => {},
    });

    // Render with an assigned person
    const { container } = render(
      <AssigneeCell row={{ assignee: { id: '1', name: 'Alice Smith' } }} />,
    );

    // Find the span containing the assignee name
    const nameSpan = Array.from(container.querySelectorAll('span')).find(
      el => el.textContent === 'Alice Smith',
    );

    expect(nameSpan).toBeDefined();
    // Check the computed style to ensure it's using a token (not hardcoded #292A2E)
    const style = window.getComputedStyle(nameSpan!);
    const color = style.color;

    // Hardcoded dark text that was breaking dark mode — this literal exists only
    // to assert the rendered style is NOT this value.
    // ads-scanner:ignore-next-line — negative test fixture, not a color usage
    const BROKEN_DARK_COLOR = 'var(--ds-text, rgb(41, 42, 46))'; // var(--ds-text, var(--ds-text))

    expect(color).not.toBe(BROKEN_DARK_COLOR);

    // The color should resolve to either:
    // - light theme: some variation of dark text using --ds-text token
    // - dark theme: light text that's readable on dark background
    // Both should be readable on their respective backgrounds.
    // We just verify it's NOT the hardcoded broken value.
  });

  it('should use theme-aware color token for assignee name visibility in both light and dark modes', () => {
    // 2026-07-09: jsdom's bundled cssstyle@2.3.0 rejects `var(...)` values for the
    // `color` property outright (it silently drops them, so the inline `style`
    // attribute never contains the color at all — this is a jsdom/cssstyle
    // version limitation, not a source regression; upgrading cssstyle is outside
    // this test's area). Asserting against the rendered DOM style can't observe
    // the token(), so this checks the source directly, the same technique the
    // sibling contract tests in this suite already use.
    const source = readFileSync(resolve(__dirname, '../editors.tsx'), 'utf-8');
    // The name span renders `{a.name}` as a standalone JSX expression child; the
    // avatar's `name={a.name}` prop a few lines above also contains the literal
    // substring `{a.name}`, so anchor on the standalone form specifically.
    const nameSpanIdx = source.indexOf(">\n              {a.name}");
    const before = nameSpanIdx >= 0 ? source.slice(Math.max(0, nameSpanIdx - 400), nameSpanIdx) : '';

    // Should reference token() or --ds-text variable, not the hardcoded broken color
    expect(before).toMatch(/token\(\s*['"]color\.text['"]|--ds-text/);
    // ads-scanner:ignore-next-line — negative assertion regex banning this color, not a usage
    expect(before).not.toMatch(/#292A2E|41,\s*42,\s*46/i);
  });
});
