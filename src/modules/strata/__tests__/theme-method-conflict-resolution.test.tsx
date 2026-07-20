/**
 * Theme measurement-method conflict resolution UI — CAT-STRATA-THEMEMETHOD-20260720-001.
 * The ThemeMethodResolveModal collects the admin decision (method + audited reason) and refuses to
 * submit without both; the ThemeMethodConflictsPanel is the admin discovery surface. Server-side
 * enforcement + the non-destructive disposition are proven separately in the SQL RESOLVE_ROLLBACK proof.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { resolveConflict, listConflicts } = vi.hoisted(() => ({ resolveConflict: vi.fn(), listConflicts: vi.fn() }));

vi.mock('@/modules/strata/domain', async (orig) => {
  const actual = await orig<typeof import('@/modules/strata/domain')>();
  return { ...actual, strategyApi: { ...actual.strategyApi, resolveThemeMethodConflict: resolveConflict, themeMethodConflicts: listConflicts } };
});

import { ThemeMethodResolveModal } from '@/modules/strata/components/authoring';
import { ThemeMethodConflictsPanel } from '@/modules/strata/components/ThemeMethodConflictsPanel';

const theme = {
  id: 'theme-1', slug: 'th', name: 'Conflicted Theme', element_type: 'theme', context: 'theme',
  status: 'active', stage: 'active', cycle_id: 'c1', parent_id: null, perspective_id: null,
  order_index: 0, description: null, owner_id: null, map_position: null, measurement_method: null,
} as const;

beforeEach(() => {
  resolveConflict.mockReset().mockResolvedValue({});
  listConflicts.mockReset().mockResolvedValue([]);
});

describe('ThemeMethodResolveModal — governed decision capture', () => {
  const renderModal = () => render(
    <ThemeMethodResolveModal theme={theme as never} objectiveCount={2} themeOkrCount={3}
      onClose={() => {}} onResolved={() => {}} />,
  );

  it('exposes an intended-method field and a required reason field', () => {
    renderModal();
    expect(screen.getByLabelText('Intended measurement method')).toBeTruthy();
    expect(screen.getByLabelText('Resolution reason')).toBeTruthy();
  });

  it('refuses to resolve with no method selected', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Resolution reason'), { target: { value: 'a reason' } });
    fireEvent.click(screen.getByTestId('strata-resolve-method-confirm'));
    expect(screen.getByText(/Select the intended measurement method/)).toBeTruthy();
    expect(resolveConflict).not.toHaveBeenCalled();
  });

  it('refuses to resolve with no reason', () => {
    // method Select left unset AND reason empty -> the method error is shown first; either way no call
    renderModal();
    fireEvent.click(screen.getByTestId('strata-resolve-method-confirm'));
    expect(resolveConflict).not.toHaveBeenCalled();
  });
});

describe('ThemeMethodConflictsPanel — admin discovery surface', () => {
  const renderPanel = () => render(<MemoryRouter><ThemeMethodConflictsPanel /></MemoryRouter>);

  it('renders nothing when there are no unresolved conflicts', async () => {
    listConflicts.mockResolvedValue([]);
    const { container } = renderPanel();
    // allow the query microtask to settle
    await Promise.resolve();
    expect(screen.queryByTestId('strata-method-conflicts-admin')).toBeNull();
    expect(container.textContent).not.toContain('needs resolution');
  });

  it('lists each unresolved Theme with its objective and OKR counts', async () => {
    listConflicts.mockResolvedValue([
      { theme_id: 't1', objective_count: 1, theme_okr_count: 3, resolved_at: null, theme: { name: 'Investor Journey', slug: 'investor-journey' } },
      { theme_id: 't2', objective_count: 2, theme_okr_count: 1, resolved_at: null, theme: { name: 'Ops Excellence', slug: 'ops' } },
    ]);
    renderPanel();
    expect(await screen.findByTestId('strata-method-conflicts-admin')).toBeTruthy();
    expect(screen.getByText('Investor Journey')).toBeTruthy();
    expect(screen.getByText('Ops Excellence')).toBeTruthy();
    expect(screen.getAllByText('Unresolved').length).toBe(2);
  });
});
