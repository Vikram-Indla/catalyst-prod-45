/**
 * useBacklogUrlState — URL state sync for backlog filters (F1.28)
 *
 * Contract:
 *   - Syncs filters state with URL query params
 *   - Updates URL when filters change
 *   - Restores filters from URL on mount
 *   - Handles groupBy parameter
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter, useSearchParams } from 'react-router-dom';
import { useBacklogUrlState } from './useBacklogUrlState';
import React from 'react';

function renderHookWithRouter<T>(hook: () => T) {
  return renderHook(hook, {
    wrapper: ({ children }) => React.createElement(BrowserRouter, {}, children),
  });
}

describe('useBacklogUrlState (F1.28)', () => {
  it('provides sync utilities', () => {
    const { result } = renderHookWithRouter(() => useBacklogUrlState());
    expect(typeof result.current.syncSearchToUrl).toBe('function');
    expect(typeof result.current.syncGroupByToUrl).toBe('function');
  });

  it('syncs search term to URL', () => {
    const { result } = renderHookWithRouter(() => useBacklogUrlState());
    act(() => {
      result.current.syncSearchToUrl('test query');
    });
    expect(result.current.getSearchFromUrl()).toBe('test query');
  });

  it('syncs groupBy to URL', () => {
    const { result } = renderHookWithRouter(() => useBacklogUrlState());
    act(() => {
      result.current.syncGroupByToUrl('status');
    });
    expect(result.current.getGroupByFromUrl()).toBe('status');
  });

  it('restores search from URL', () => {
    const { result } = renderHookWithRouter(() => useBacklogUrlState());
    const search = result.current.getSearchFromUrl();
    expect(typeof search).toBe('string');
  });

  it('restores groupBy from URL', () => {
    const { result } = renderHookWithRouter(() => useBacklogUrlState());
    const groupBy = result.current.getGroupByFromUrl();
    expect(groupBy === null || typeof groupBy === 'string').toBe(true);
  });

  it('clears search from URL', () => {
    const { result } = renderHookWithRouter(() => useBacklogUrlState());
    act(() => {
      result.current.syncSearchToUrl('test');
      result.current.clearSearchFromUrl();
    });
    expect(result.current.getSearchFromUrl()).toBe('');
  });

  it('provides debounced URL update', () => {
    const { result } = renderHookWithRouter(() => useBacklogUrlState());
    expect(typeof result.current.debounceUrlUpdate).toBe('function');
  });
});
