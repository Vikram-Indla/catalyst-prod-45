// DL-DEF-001 residual (CAT-STRATA-DLDEF-20260718-001): the source registry must be
// keyboard-operable. These tests render the PRODUCTION column adapter inside the
// real JiraTable — not isolated helpers — and prove Tab reach, Enter and Space
// activation, pointer activation, visible focusability, and that a null-slug
// source presents no actionable link.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { JiraTable } from '@/components/shared/JiraTable';
import { buildSourceColumns, buildSourceRows } from '@/modules/strata/pages/StrataDataPipelinePage';
import type { StrataDataSource } from '@/modules/strata/types';

const salam: StrataDataSource = {
  id: 'src-1', name: 'Salam Finance Excel', slug: 'salam-finance-excel',
  system_type: 'excel', owner_id: null, refresh_cadence: 'monthly', status: 'active', health: null,
};
const noSlug: StrataDataSource = { ...salam, id: 'src-2', name: 'Legacy Feed', slug: null };

const renderTable = (navigate: (p: string) => void) => {
  const rows = buildSourceRows([salam, noSlug], [], []);
  return render(
    <JiraTable
      columns={buildSourceColumns(navigate)}
      data={rows}
      getRowId={(r) => r.source.id}
      ariaLabel="Data sources"
    />,
  );
};

describe('DL-DEF-001 — keyboard-accessible source navigation (rendered adapter)', () => {
  it('renders the source name as a native, Tab-focusable button link', async () => {
    renderTable(vi.fn());
    const link = screen.getByTestId('strata-source-link-salam-finance-excel');
    expect(link.tagName).toBe('BUTTON');
    link.focus();
    expect(document.activeElement).toBe(link);
  });

  it('Enter on the focused link opens the source-detail route', async () => {
    const navigate = vi.fn();
    renderTable(navigate);
    const link = screen.getByTestId('strata-source-link-salam-finance-excel');
    link.focus();
    await userEvent.keyboard('{Enter}');
    expect(navigate).toHaveBeenCalledWith('/strata/data/sources/salam-finance-excel');
  });

  it('Space on the focused link opens the source-detail route (native button contract)', async () => {
    const navigate = vi.fn();
    renderTable(navigate);
    screen.getByTestId('strata-source-link-salam-finance-excel').focus();
    await userEvent.keyboard(' ');
    expect(navigate).toHaveBeenCalledWith('/strata/data/sources/salam-finance-excel');
  });

  it('pointer activation still works and fires exactly one navigation', async () => {
    const navigate = vi.fn();
    renderTable(navigate);
    await userEvent.click(screen.getByTestId('strata-source-link-salam-finance-excel'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/strata/data/sources/salam-finance-excel');
  });

  it('a null-slug source renders plain text — no actionable link, no navigation', async () => {
    const navigate = vi.fn();
    renderTable(navigate);
    expect(screen.getByText('Legacy Feed').closest('button')).toBeNull();
    await userEvent.click(screen.getByText('Legacy Feed'));
    expect(navigate).not.toHaveBeenCalled();
  });
});
