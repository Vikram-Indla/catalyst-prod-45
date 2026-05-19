/**
 * Minimal vitest stub for @atlaskit/dynamic-table.
 * The real package injects CSS via compiled.css imports that fail in jsdom.
 */
import React from 'react';
import { vi } from 'vitest';

const DynamicTableMock = vi.fn(function DynamicTable(props: any) {
  const { head, rows, isLoading, page = 1, rowsPerPage = 50, onSetPage, onSort, label, emptyView } = props;
  const pageRows = (rows ?? []).slice((page - 1) * rowsPerPage, page * rowsPerPage);

  if (isLoading) {
    return React.createElement('div', { role: 'status', 'aria-label': 'Loading table' },
      React.createElement('span', {}, 'Loading...')
    );
  }

  if (pageRows.length === 0 && emptyView) {
    return emptyView as React.ReactElement;
  }

  return React.createElement(
    'div',
    { className: 'atlaskit-dynamic-table', 'aria-label': label },
    React.createElement(
      'table',
      {},
      head && React.createElement(
        'thead',
        {},
        React.createElement(
          'tr',
          {},
          ...(head.cells ?? []).map((cell: any, i: number) =>
            React.createElement(
              'th',
              {
                key: cell.key ?? i,
                onClick: cell.isSortable && onSort
                  ? () => onSort({ key: String(cell.key), sortOrder: 'ASC' })
                  : undefined,
              },
              cell.content
            )
          )
        )
      ),
      React.createElement(
        'tbody',
        {},
        ...(pageRows).map((row: any, ri: number) =>
          React.createElement(
            'tr',
            { key: row.key ?? ri, 'data-testid': row.testId },
            ...(row.cells ?? []).map((cell: any, ci: number) =>
              React.createElement('td', { key: cell.key ?? ci }, cell.content)
            )
          )
        )
      )
    ),
    (rows ?? []).length > rowsPerPage && React.createElement(
      'nav',
      { 'aria-label': 'pagination' },
      React.createElement(
        'button',
        { onClick: () => onSetPage?.(2), 'aria-label': 'page 2' },
        '2'
      )
    )
  );
}) as unknown as React.ComponentType<any>;

export default DynamicTableMock;
export const DynamicTableStateless = DynamicTableMock;
