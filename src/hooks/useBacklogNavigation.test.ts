/**
 * useBacklogNavigation — Navigation hook for backlog page (F1.27)
 *
 * Contract:
 *   - Provides navigation to backlog page
 *   - Supports query params (status, search, groupBy)
 *   - Returns current filters from URL
 *   - Can navigate with filters applied
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useBacklogNavigation } from './useBacklogNavigation';
import React from 'react';

function renderHookWithRouter<T>(hook: () => T) {
  return renderHook(hook, {
    wrapper: ({ children }) => React.createElement(BrowserRouter, {}, children),
  });
}

describe('useBacklogNavigation (F1.27)', () => {
  it('provides navigate function', () => {
    const { result } = renderHookWithRouter(() => useBacklogNavigation());
    expect(typeof result.current.navigateToBacklog).toBe('function');
  });

  it('provides getBacklogUrl function', () => {
    const { result } = renderHookWithRouter(() => useBacklogNavigation());
    expect(typeof result.current.getBacklogUrl).toBe('function');
  });

  it('generates backlog URL', () => {
    const { result } = renderHookWithRouter(() => useBacklogNavigation());
    const url = result.current.getBacklogUrl();
    expect(url).toBe('/workitems');
  });

  it('generates URL with filters', () => {
    const { result } = renderHookWithRouter(() => useBacklogNavigation());
    const url = result.current.getBacklogUrl({ status: 'In Progress', search: 'bug' });
    expect(url).toContain('/workitems');
    expect(url).toContain('status=');
    expect(url).toContain('search=');
    expect(url).toContain('bug');
  });

  it('returns current filters from URL', () => {
    const { result } = renderHookWithRouter(() => useBacklogNavigation());
    const filters = result.current.getCurrentFilters();
    expect(typeof filters).toBe('object');
    expect(filters).toHaveProperty('status');
    expect(filters).toHaveProperty('search');
  });

  it('provides group options', () => {
    const { result } = renderHookWithRouter(() => useBacklogNavigation());
    const groups = result.current.getGroupByOptions();
    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThan(0);
  });
});
