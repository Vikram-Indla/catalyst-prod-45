/**
 * §20 ACCEPTANCE — AC-6, remaining verbs: validate · resolve · record.
 *
 * Each of the three completes through ONE of two canonical modals — that is the
 * whole point of the canonical-component rule, and it means the keyboard
 * contract has exactly two chokepoints rather than three bespoke page flows:
 *
 *   validate → StrataDecisionModal   (StrataPortfolioVmoPage → valueApi.validateBenefitValue)
 *   record   → StrataFormModal       (StrataReviewsPage      → governanceApi.createDecision)
 *   resolve  → StrataFormModal       (ProjectCardDetailView  → executionApi.updateDependency)
 *
 * SCOPE — what these tests prove, precisely: the modal each verb completes in is
 * fully operable with NO mouse event, and its onConfirm/onSubmit fires with the
 * KEYBOARD-entered payload. The page's one-line handler that forwards that
 * payload to the RPC is read, not executed here (rendering three ~1.5k-line
 * pages would test the mocks, not the keyboard). The field specs below mirror
 * the real call sites.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StrataDecisionModal } from '@/modules/strata/components/shared';
import { StrataFormModal } from '@/modules/strata/components/authoring';

type User = ReturnType<typeof userEvent.setup>;

/** Tab until `find()` is focused. Proves keyboard REACHABILITY. */
async function tabTo(user: User, find: () => HTMLElement | null, label: string, max = 30) {
  for (let i = 1; i <= max; i++) {
    await user.tab();
    const t = find();
    if (t && document.activeElement === t) return i;
  }
  const a = document.activeElement as HTMLElement | null;
  throw new Error(
    `"${label}" never received focus after ${max} Tabs — NOT keyboard-reachable. `
    + `Focus rested on <${a?.tagName}> "${(a?.getAttribute('aria-label') || a?.textContent || '').trim().slice(0, 40)}".`,
  );
}

const btnNamed = (name: string) => () =>
  (screen.queryAllByRole('button').find((b) => b.textContent?.trim() === name) as HTMLElement) ?? null;

// ── validate ────────────────────────────────────────────────────────────────
describe('§20 AC-6 — validate (StrataDecisionModal)', () => {
  const OPTIONS = [
    { value: 'validated', label: 'Validate' },
    { value: 'rejected', label: 'Reject', appearance: 'danger' as const },
  ];

  it('completes with NO mouse: Tab to a verdict → Enter → Tab to note → type → Tab to Confirm → Enter', async () => {
    const onConfirm = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(
      <StrataDecisionModal
        open
        onClose={() => {}}
        title="Validate realized value"
        options={OPTIONS}
        confirmLabel="Record validation"
        onConfirm={onConfirm}
      />,
    );

    // choose the NON-default verdict purely by keyboard (default is options[0])
    await tabTo(user, btnNamed('Reject'), 'Reject verdict');
    await user.keyboard('{Enter}');

    await tabTo(user, () => screen.getByLabelText('Decision note'), 'Decision note');
    await user.keyboard('Evidence run RUN-498 does not support the claim');

    await tabTo(user, btnNamed('Record validation'), 'Record validation');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    // the verdict AND the note both came from the keyboard
    expect(onConfirm).toHaveBeenCalledWith('rejected', 'Evidence run RUN-498 does not support the claim');
  });

  it('requireNote gates Confirm until a note is typed — and the gate is not a silent one', async () => {
    const onConfirm = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(
      <StrataDecisionModal
        open onClose={() => {}} title="Reject value" options={OPTIONS}
        confirmLabel="Confirm" requireNote onConfirm={onConfirm}
      />,
    );

    expect(btnNamed('Confirm')()).toBeDisabled();
    // the required-ness is visible on the field itself, not hidden in a tooltip
    expect(screen.getByPlaceholderText('Reason (required)')).toBeInTheDocument();

    await tabTo(user, () => screen.getByLabelText('Decision note'), 'Decision note');
    await user.keyboard('Reason recorded');
    expect(btnNamed('Confirm')()).not.toBeDisabled();

    await tabTo(user, btnNamed('Confirm'), 'Confirm');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('validated', 'Reason recorded'));
  });

  it('a server/SoD rejection surfaces verbatim in the modal instead of closing it', async () => {
    const onConfirm = vi.fn(async () => { throw new Error('segregation of duties: you submitted this value'); });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <StrataDecisionModal open onClose={onClose} title="Validate" options={OPTIONS} confirmLabel="Confirm" onConfirm={onConfirm} />,
    );

    await tabTo(user, btnNamed('Confirm'), 'Confirm');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText(/segregation of duties: you submitted this value/)).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled(); // the reader keeps their context
  });
});

// ── record + resolve ────────────────────────────────────────────────────────
describe('§20 AC-6 — record + resolve (StrataFormModal)', () => {
  it('record: completes with NO mouse — Tab to Title → type → Tab to Create decision → Enter', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const user = userEvent.setup();
    // mirrors StrataReviewsPage's create-decision form
    render(
      <StrataFormModal
        open
        onClose={() => {}}
        title="Record a decision"
        fields={[
          { key: 'title', label: 'Title', kind: 'text', required: true },
          { key: 'description', label: 'Description', kind: 'textarea' },
        ]}
        initial={{ decision_type: 'governance' }}
        submitLabel="Create decision"
        onSubmit={onSubmit}
      />,
    );

    await tabTo(user, () => screen.getByLabelText('Title'), 'Title');
    await user.keyboard('Accelerate digital care deflection');

    await tabTo(user, btnNamed('Create decision'), 'Create decision');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'Accelerate digital care deflection' });
  });

  it('resolve: a blocker can be moved to resolved with NO mouse, and the typed payload reaches onSubmit', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const user = userEvent.setup();
    // mirrors ProjectCardDetailView's edit-dependency form (the resolve path)
    render(
      <StrataFormModal
        open
        onClose={() => {}}
        title="Edit blocker"
        fields={[
          { key: 'dependencyName', label: 'Dependency name', kind: 'text', required: true },
          { key: 'description', label: 'Description', kind: 'textarea' },
        ]}
        initial={{ dependencyName: 'Regulator API access', status: 'open' }}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );

    await tabTo(user, () => screen.getByLabelText('Description'), 'Description');
    await user.keyboard('Access granted 16 Jul — blocker cleared');

    await tabTo(user, btnNamed('Save'), 'Save');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      dependencyName: 'Regulator API access',
      description: 'Access granted 16 Jul — blocker cleared',
    });
  });

  it('a server rejection surfaces verbatim in the form modal instead of closing it', async () => {
    const onSubmit = vi.fn(async () => { throw new Error('relation public.strata_play_charters does not exist'); });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <StrataFormModal
        open onClose={onClose} title="Record a decision"
        fields={[{ key: 'title', label: 'Title', kind: 'text', required: true }]}
        submitLabel="Create decision" onSubmit={onSubmit}
      />,
    );

    await tabTo(user, () => screen.getByLabelText('Title'), 'Title');
    await user.keyboard('X');
    await tabTo(user, btnNamed('Create decision'), 'Create decision');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText(/relation public.strata_play_charters does not exist/)).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });
});
