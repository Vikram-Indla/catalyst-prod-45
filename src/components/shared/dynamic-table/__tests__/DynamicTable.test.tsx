/**
 * Unit + a11y assertions for DynamicTable.
 * Virtualizer is disabled (rows < threshold) so rows render synchronously.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { DynamicTable, type DynamicTableColumn, type DynamicTableRowGroup } from '../index';

interface Row {
  id: string;
  key: string;
  summary: string;
  status: string;
}

const columns: DynamicTableColumn<Row>[] = [
  { id: 'key', accessorKey: 'key', header: 'Key', label: 'Key', alwaysVisible: true, cell: ({ row }) => <span>{row.original.key}</span> },
  { id: 'summary', accessorKey: 'summary', header: 'Summary', label: 'Summary', alwaysVisible: true, cell: ({ row }) => <span>{row.original.summary}</span> },
  { id: 'status', accessorKey: 'status', header: 'Status', label: 'Status', cell: ({ row }) => <span>{row.original.status}</span> },
];

const rows: Row[] = [
  { id: '1', key: 'BAU-1', summary: 'Alpha', status: 'Backlog' },
  { id: '2', key: 'BAU-2', summary: 'Bravo', status: 'In Progress' },
  { id: '3', key: 'BAU-3', summary: 'Charlie', status: 'Done' },
];

describe('DynamicTable', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders every data row in flat mode', () => {
    render(
      <DynamicTable<Row>
        tableId="t.flat"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
      />
    );
    expect(screen.getByText('BAU-1')).toBeInTheDocument();
    expect(screen.getByText('BAU-2')).toBeInTheDocument();
    expect(screen.getByText('BAU-3')).toBeInTheDocument();
  });

  it('renders columnheaders with aria-sort="none" when not sorted', () => {
    render(
      <DynamicTable<Row>
        tableId="t.aria"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        sortable
      />
    );
    const headers = screen.getAllByRole('columnheader');
    headers.forEach((h) => expect(h).toHaveAttribute('aria-sort', 'none'));
  });

  it('renders group headers with count and collapses on click', () => {
    const groups: DynamicTableRowGroup<Row>[] = [
      { id: 'grp.a', label: 'GROUP A', rows: [rows[0]] },
      { id: 'grp.b', label: 'GROUP B', rows: [rows[1], rows[2]] },
    ];
    render(
      <DynamicTable<Row>
        tableId="t.group"
        columns={columns}
        groups={groups}
        getRowId={(r) => r.id}
      />
    );
    expect(screen.getByText('GROUP A')).toBeInTheDocument();
    expect(screen.getByText('GROUP B')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // Rows inside GROUP B are visible initially
    expect(screen.getByText('BAU-2')).toBeInTheDocument();
    // Collapse group B
    act(() => {
      fireEvent.click(screen.getByText('GROUP B'));
    });
    expect(screen.queryByText('BAU-2')).not.toBeInTheDocument();
  });

  it('fires onRowClick when a row is activated by click', () => {
    const onRowClick = vi.fn();
    render(
      <DynamicTable<Row>
        tableId="t.click"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
      />
    );
    fireEvent.click(screen.getByText('BAU-2'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ key: 'BAU-2' }));
  });

  it('fires onRowClick on Enter key (keyboard a11y)', () => {
    const onRowClick = vi.fn();
    render(
      <DynamicTable<Row>
        tableId="t.enter"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
      />
    );
    const rowNodes = screen.getAllByRole('row').filter((r) => r.getAttribute('tabindex') === '0');
    expect(rowNodes.length).toBeGreaterThan(0);
    fireEvent.keyDown(rowNodes[0], { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when there are no rows', () => {
    render(
      <DynamicTable<Row>
        tableId="t.empty"
        columns={columns}
        data={[]}
        getRowId={(r) => r.id}
        emptyState={<span>No items</span>}
      />
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders an alert with the error message when error is provided', () => {
    render(
      <DynamicTable<Row>
        tableId="t.error"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        error={new Error('Boom')}
      />
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Boom');
  });

  it('renders skeleton rows when isLoading', () => {
    const { container } = render(
      <DynamicTable<Row>
        tableId="t.loading"
        columns={columns}
        data={[]}
        getRowId={(r) => r.id}
        isLoading
        loadingSkeletonRows={4}
      />
    );
    const body = container.querySelector('[aria-busy="true"]');
    expect(body).not.toBeNull();
  });

  it('exposes selection checkboxes with accessible names when selectable', () => {
    render(
      <DynamicTable<Row>
        tableId="t.select"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        selectable
      />
    );
    expect(screen.getByLabelText('Select all rows')).toBeInTheDocument();
    expect(screen.getByLabelText('Select row 1')).toBeInTheDocument();
  });
});
