/**
 * SR-DEF-001 — New cycle date handling. CAT-STRATA-SRDEF-20260717-001.
 *
 * Repro: type Starts on 01/01/2027 and Ends on 31/12/2027, click Create cycle →
 * "Required: Starts on, Ends on" even though both inputs visibly contain the dates.
 *
 * Two root causes, both covered here:
 *  1. @atlaskit/datetime-picker only fires onChange on calendar-select / Enter / clear.
 *     Typing then clicking away left the text in react-select's uncommitted inputValue
 *     while the form model kept its seeded null.
 *  2. The picker defaults to locale 'en-US' (month-first), under which "31/12/2027" is
 *     an Invalid Date — while STRATA renders every other date day-first via format.ts
 *     (`toLocaleDateString('en-GB', …)` → "17 Jul 2026").
 *
 * These tests drive the REAL StrataFormModal with the field spec used by the New cycle
 * dialog (StrataStrategyRoomPage), so they exercise the actual date field, the actual
 * required check, and the actual cross-field rule.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StrataFormModal, parseStrataDateInput } from '@/modules/strata/components/authoring';
import type { StrataFieldSpec } from '@/modules/strata/components/authoring';

type User = ReturnType<typeof userEvent.setup>;

// Each case renders a modal containing two @atlaskit DatePickers and types into them;
// every keystroke re-renders the picker and reopens its calendar, so these run well past
// the 5s default when the suite is under parallel load (observed as flaky timeouts, not
// assertion failures). `delay: null` removes the inter-keystroke wait; this raises the
// ceiling so a loaded machine cannot turn a passing test red.
vi.setConfig({ testTimeout: 60_000 });

/** Mirrors StrataStrategyRoomPage's create-cycle field spec. */
const CYCLE_FIELDS: StrataFieldSpec[] = [
  { key: 'name', label: 'Name', kind: 'text', required: true },
  { key: 'startsOn', label: 'Starts on', kind: 'date', required: true },
  { key: 'endsOn', label: 'Ends on', kind: 'date', required: true },
];

/** Mirrors the modal's `validate` prop at the New cycle call site. */
const cycleValidate = (v: Record<string, unknown>) =>
  typeof v.startsOn === 'string' && typeof v.endsOn === 'string' && v.endsOn <= v.startsOn
    ? 'Ends on must be after Starts on.'
    : null;

function renderCycleModal(onSubmit: (v: Record<string, unknown>) => Promise<void>) {
  return render(
    <StrataFormModal
      open
      onClose={() => {}}
      title="New cycle"
      fields={CYCLE_FIELDS}
      submitLabel="Create cycle"
      validate={cycleValidate as never}
      onSubmit={onSubmit as never}
      testId="strata-create-cycle-modal"
    />,
  );
}

const dateInput = (label: string) => screen.getByLabelText(label, { exact: false });
const submitBtn = () => screen.getByRole('button', { name: 'Create cycle' });

/**
 * Type a date and commit it, then wait for the commit to land.
 *
 * The value commits when focus leaves the picker's CONTAINER, so we click a field
 * outside it. Waiting for the committed day-first label before continuing keeps the
 * test deterministic: without it, a submit click can be dispatched before React has
 * flushed the blur-driven state update, which makes the assertion race under load.
 */
async function enterValidDate(user: User, label: string, text: string) {
  await user.type(dateInput(label), text);
  await user.click(dateInput('Name'));
  await waitFor(() => expect(screen.getAllByText(text).length).toBeGreaterThan(0));
}

describe('SR-DEF-001 — parseStrataDateInput (day-first, timezone-safe)', () => {
  it('parses the reported repro dates day-first', () => {
    expect(parseStrataDateInput('01/01/2027')).toBe('2027-01-01');
    expect(parseStrataDateInput('31/12/2027')).toBe('2027-12-31');
  });

  it('does not shift the date across a timezone boundary', () => {
    // Regression against formatting local midnight with toISOString(), which yields
    // "2026-12-31" for 01/01/2027 in any negative-offset timezone.
    expect(parseStrataDateInput('01/01/2027')).not.toBe('2026-12-31');
  });

  it('returns null for unparseable or empty text rather than guessing a date', () => {
    expect(parseStrataDateInput('')).toBeNull();
    expect(parseStrataDateInput('   ')).toBeNull();
    expect(parseStrataDateInput('not a date')).toBeNull();
    expect(parseStrataDateInput('31/13/2027')).toBeNull(); // month 13
  });
});

describe('SR-DEF-001 — New cycle accepts typed dates', () => {
  it('submits typed dates as normalized ISO after blur (the defect repro)', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderCycleModal(onSubmit);

    await user.type(dateInput('Name'), 'J Strategy Test FY2027 C1');
    await user.type(dateInput('Starts on'), '01/01/2027');
    await user.type(dateInput('Ends on'), '31/12/2027');
    // Click the submit button directly from the date field — no calendar click, no
    // Enter, no intermediate blur. This is exactly the flow that used to fail, and it
    // relies on the blur commit flushing before the click handler reads the values.
    await user.click(submitBtn());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'J Strategy Test FY2027 C1',
      startsOn: '2027-01-01',
      endsOn: '2027-12-31',
    });
  });

  it('submits typed dates when the user moves between fields before submitting', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderCycleModal(onSubmit);

    await user.type(dateInput('Name'), 'C1');
    await enterValidDate(user, 'Starts on', '01/01/2027');
    await enterValidDate(user, 'Ends on', '31/12/2027');
    await user.click(submitBtn());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'C1',
      startsOn: '2027-01-01',
      endsOn: '2027-12-31',
    });
  });

  it('renders the committed date back in day-first display format', async () => {
    const user = userEvent.setup({ delay: null });
    renderCycleModal(vi.fn().mockResolvedValue(undefined));

    await user.type(dateInput('Starts on'), '01/01/2027');
    // Focus must leave the picker's CONTAINER to commit. A single Tab only moves to the
    // picker's own calendar button, which is still inside it — so click another field.
    await user.click(dateInput('Name'));

    // Committed as ISO internally, displayed day-first: locale display formatting is
    // preserved without losing the underlying value.
    await waitFor(() => expect(screen.getByText('01/01/2027')).toBeTruthy());
  });
});

describe('SR-DEF-001 — invalid input stays blocked with field-specific messages', () => {
  it('blocks empty dates naming both fields', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn();
    renderCycleModal(onSubmit);

    await user.type(dateInput('Name'), 'No dates');
    // CFG-007 note: date fields deliberately do NOT disable the button (their
    // blur-commit races the click — SR-DEF-001), so the click lands and the
    // required guard blocks with named fields.
    await user.click(submitBtn());

    await waitFor(() => expect(screen.getByText('Required: Starts on, Ends on')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks an unparseable date and names that field (not "Required")', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn();
    renderCycleModal(onSubmit);

    await user.type(dateInput('Name'), 'Bad start');
    await user.type(dateInput('Starts on'), 'garbage');
    await user.click(dateInput('Name')); // blur → the field flags itself invalid
    await waitFor(() => expect(screen.getByText('Enter a date as dd/mm/yyyy.')).toBeTruthy());
    await enterValidDate(user, 'Ends on', '31/12/2027');
    // CFG-007: an unparseable, already-flagged date disables submit outright;
    // the field keeps its own message and nothing reaches the RPC.
    expect(submitBtn()).toBeDisabled();
    await user.click(submitBtn());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks a reversed range naming both ends', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn();
    renderCycleModal(onSubmit);

    await user.type(dateInput('Name'), 'Reversed');
    await enterValidDate(user, 'Starts on', '31/12/2027');
    await enterValidDate(user, 'Ends on', '01/01/2027');
    await user.click(submitBtn());

    await waitFor(() => expect(screen.getByText('Ends on must be after Starts on.')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks equal start and end (the server rule is ends_on > starts_on)', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn();
    renderCycleModal(onSubmit);

    await user.type(dateInput('Name'), 'Equal');
    await enterValidDate(user, 'Starts on', '01/01/2027');
    await enterValidDate(user, 'Ends on', '01/01/2027');
    await user.click(submitBtn());

    await waitFor(() => expect(screen.getByText('Ends on must be after Starts on.')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
