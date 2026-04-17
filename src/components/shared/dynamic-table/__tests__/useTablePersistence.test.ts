import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTablePersistence } from '../useTablePersistence';

describe('useTablePersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds from defaults when nothing is stored', () => {
    const { result } = renderHook(() =>
      useTablePersistence('unit.empty', {
        visibility: { status: true },
        sizing: { key: 120 },
      })
    );
    expect(result.current.visibility).toEqual({ status: true });
    expect(result.current.sizing).toEqual({ key: 120 });
  });

  it('persists visibility changes to localStorage', () => {
    const { result } = renderHook(() => useTablePersistence('unit.visibility'));
    act(() => result.current.onVisibilityChange({ assignee: false }));
    const raw = localStorage.getItem('catalyst.dynamic-table.unit.visibility');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ v: { assignee: false }, s: {} });
  });

  it('persists sizing changes to localStorage', () => {
    const { result } = renderHook(() => useTablePersistence('unit.sizing'));
    act(() => result.current.onSizingChange({ summary: 420 }));
    const raw = localStorage.getItem('catalyst.dynamic-table.unit.sizing');
    expect(JSON.parse(raw!)).toEqual({ v: {}, s: { summary: 420 } });
  });

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem(
      'catalyst.dynamic-table.unit.hydrate',
      JSON.stringify({ v: { created: false }, s: { key: 200 } })
    );
    const { result } = renderHook(() => useTablePersistence('unit.hydrate'));
    expect(result.current.visibility).toEqual({ created: false });
    expect(result.current.sizing).toEqual({ key: 200 });
  });

  it('supports updater functions', () => {
    const { result } = renderHook(() => useTablePersistence('unit.updater'));
    act(() => result.current.onVisibilityChange({ status: true }));
    act(() => result.current.onVisibilityChange((prev) => ({ ...prev, assignee: false })));
    expect(result.current.visibility).toEqual({ status: true, assignee: false });
  });

  it('isolates persistence per tableId', () => {
    const { result: a } = renderHook(() => useTablePersistence('unit.a'));
    const { result: b } = renderHook(() => useTablePersistence('unit.b'));
    act(() => a.current.onVisibilityChange({ only: false }));
    expect(b.current.visibility).toEqual({});
  });

  it('tolerates corrupt localStorage payloads without throwing', () => {
    localStorage.setItem('catalyst.dynamic-table.unit.corrupt', '{not-json');
    expect(() => renderHook(() => useTablePersistence('unit.corrupt'))).not.toThrow();
  });
});
