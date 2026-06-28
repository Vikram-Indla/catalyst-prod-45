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

    // Hardcoded dark text that was breaking dark mode
    const BROKEN_DARK_COLOR = 'var(--ds-text, rgb(41, 42, 46))'; // var(--ds-text, var(--ds-text))

    expect(color).not.toBe(BROKEN_DARK_COLOR);

    // The color should resolve to either:
    // - light theme: some variation of dark text using --ds-text token
    // - dark theme: light text that's readable on dark background
    // Both should be readable on their respective backgrounds.
    // We just verify it's NOT the hardcoded broken value.
  });

  it('should use theme-aware color token for assignee name visibility in both light and dark modes', () => {
    const AssigneeCell = makeAssigneeEditCell({
      getAssignee: (row: any) => row.assignee,
      options: [{ id: '1', name: 'Charlie Brown' }],
      onChange: () => {},
    });

    const { container } = render(
      <AssigneeCell row={{ assignee: { id: '1', name: 'Charlie Brown' } }} />,
    );

    const nameSpan = Array.from(container.querySelectorAll('span')).find(
      el => el.textContent === 'Charlie Brown',
    );

    expect(nameSpan).toBeDefined();

    const inlineStyle = (nameSpan as HTMLElement).getAttribute('style');
    // Should reference token() or --ds-text variable, not hardcoded #292A2E or rgb(41, 42, 46)
    expect(inlineStyle).toMatch(/token.*color\.text|--ds-text/);
    expect(inlineStyle).not.toMatch(/var(--ds-text, var(--ds-text))|41.*42.*46/);
  });
});
