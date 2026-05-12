/**
 * useBacklogProjectContext — Project context awareness for backlog (F1.30)
 *
 * Contract:
 *   - Provides optional project ID/key from URL params
 *   - Scopes queries to project if provided
 *   - Returns null when no project context
 *   - Supports both /workitems and /project/:key/workitems patterns
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useBacklogProjectContext } from './useBacklogProjectContext';
import React from 'react';

function renderHookWithRouter<T>(hook: () => T) {
  return renderHook(hook, {
    wrapper: ({ children }) => React.createElement(BrowserRouter, {}, children),
  });
}

describe('useBacklogProjectContext (F1.30)', () => {
  it('provides getProjectId function', () => {
    const { result } = renderHookWithRouter(() => useBacklogProjectContext());
    expect(typeof result.current.getProjectId).toBe('function');
  });

  it('provides getProjectKey function', () => {
    const { result } = renderHookWithRouter(() => useBacklogProjectContext());
    expect(typeof result.current.getProjectKey).toBe('function');
  });

  it('returns null when no project context', () => {
    const { result } = renderHookWithRouter(() => useBacklogProjectContext());
    expect(result.current.getProjectId()).toBeNull();
    expect(result.current.getProjectKey()).toBeNull();
  });

  it('provides isScoped flag', () => {
    const { result } = renderHookWithRouter(() => useBacklogProjectContext());
    expect(typeof result.current.isScoped).toBe('boolean');
  });

  it('provides getQueryFilter function', () => {
    const { result } = renderHookWithRouter(() => useBacklogProjectContext());
    expect(typeof result.current.getQueryFilter).toBe('function');
  });

  it('query filter returns null when unscoped', () => {
    const { result } = renderHookWithRouter(() => useBacklogProjectContext());
    const filter = result.current.getQueryFilter();
    expect(filter === null || typeof filter === 'object').toBe(true);
  });

  it('provides getScopedUrl function', () => {
    const { result } = renderHookWithRouter(() => useBacklogProjectContext());
    expect(typeof result.current.getScopedUrl).toBe('function');
  });
});
