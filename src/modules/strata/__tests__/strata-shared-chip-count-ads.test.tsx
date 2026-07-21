/**
 * STRATA shared components — ADS remediation of the two deferred findings
 * (CAT-STRATA-STRATEGY-ADS-20260720-001, shared-component slice).
 *
 *   DI-04  StrataChipMenu trigger is the canonical ADS Button — exactly one
 *          interactive element, no bespoke native button, aria-label preserved,
 *          opens the ads DropdownMenu and selects options.
 *   DI-05  StrataPanel count renders as subdued text, never a status-like pill
 *          (no background / border-radius).
 *
 * These are shared components (~26-30 STRATA consumers); the guards below lock
 * the contract that the visual change must not regress behavior.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrataChipMenu, StrataPanel } from '@/modules/strata/components/shared';

describe('DI-05 — StrataPanel count is subdued text, not a pill', () => {
  it('renders the count with no background or border-radius', () => {
    const { getByText } = render(
      <StrataPanel title="Strategic structure" count={21}>
        <div>body</div>
      </StrataPanel>,
    );
    const count = getByText('21');
    const style = count.getAttribute('style') ?? '';
    expect(style).not.toMatch(/background/);
    expect(style).not.toMatch(/border-radius/);
    // still tabular for numeric alignment
    expect(style).toMatch(/tabular-nums/);
  });

  it('omits the count node entirely when count is null', () => {
    const { queryByText } = render(
      <StrataPanel title="Empty" count={null}>
        <div>body</div>
      </StrataPanel>,
    );
    expect(queryByText('0')).toBeNull();
  });
});

describe('DI-04 — StrataChipMenu trigger is the canonical ADS Button', () => {
  it('exposes exactly one interactive trigger element (no nested buttons)', () => {
    const { getByRole } = render(
      <StrataChipMenu
        label="Type"
        value="All"
        aria-label="Filter by type"
        options={[
          { key: 'all', label: 'All', isSelected: true, onClick: vi.fn() },
          { key: 'obj', label: 'Objective', onClick: vi.fn() },
        ]}
      />,
    );
    // exactly one button in the trigger, and it carries the accessible name
    const trigger = getByRole('button', { name: 'Filter by type' });
    expect(trigger).toBeTruthy();
    expect(trigger.tagName).toBe('BUTTON');
    // no button nested inside the button (single interactive element)
    expect(trigger.querySelectorAll('button').length).toBe(0);
    // label + value are both rendered in the trigger content
    expect(within(trigger).getByText('Type')).toBeTruthy();
    expect(within(trigger).getByText('All')).toBeTruthy();
  });

  it('opens the menu and fires the option handler', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(
      <StrataChipMenu
        label="Type"
        value="All"
        aria-label="Filter by type"
        options={[
          { key: 'all', label: 'All', isSelected: true, onClick: vi.fn() },
          { key: 'obj', label: 'Objective', onClick: onPick },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Filter by type' }));
    const option = await screen.findByText('Objective');
    await user.click(option);
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});
