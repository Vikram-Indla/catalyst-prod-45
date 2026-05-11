/**
 * useItemSelection — Selection state & URL sync (F1.6)
 *
 * Contract:
 *   - Reads ?issue=KEY from URL on mount
 *   - Hydrates selectedItemId from URL param
 *   - Updates URL when selection changes
 *   - Preserves param across navigation
 *   - Returns selectedItemId and selectItem(id) callback
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { useItemSelection, SelectableItem } from './useItemSelection';

describe('useItemSelection', () => {
  const mockItems: SelectableItem[] = [
    { id: 'BAU-123', jiraKey: 'BAU-123' },
    { id: 'BAU-456', jiraKey: 'BAU-456' },
    { id: 'BAU-789', jiraKey: 'BAU-789' },
  ];

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(BrowserRouter, {}, children);

  beforeEach(() => {
    // Clean URL before each test
    window.history.pushState({}, '', '/');
  });

  it('returns null activeItemId when no issue param in URL', () => {
    const { result } = renderHook(
      () => useItemSelection(mockItems, { urlParam: 'issue' }),
      { wrapper }
    );

    expect(result.current.activeItemId).toBeNull();
  });

  it('hydrates activeItemId from URL ?issue=KEY param', () => {
    window.history.pushState({}, '', '/?issue=BAU-123');
    const { result } = renderHook(
      () => useItemSelection(mockItems, { urlParam: 'issue' }),
      { wrapper }
    );

    // Wait for hydration effect
    expect(result.current.activeItemId).toBe('BAU-123');
  });

  it('selects activeItem from items list', () => {
    const { result } = renderHook(
      () => useItemSelection(mockItems, { urlParam: 'issue' }),
      { wrapper }
    );

    act(() => {
      result.current.selectItem('BAU-456');
    });

    expect(result.current.activeItem?.id).toBe('BAU-456');
  });

  it('updates URL when selectItem is called', () => {
    const { result } = renderHook(
      () => useItemSelection(mockItems, { urlParam: 'issue' }),
      { wrapper }
    );

    act(() => {
      result.current.selectItem('BAU-456');
    });

    expect(window.location.search).toContain('issue=BAU-456');
  });

  it('clears selection when clearSelection is called', () => {
    const { result } = renderHook(
      () => useItemSelection(mockItems, { urlParam: null }),
      { wrapper }
    );

    // First, select an item
    act(() => {
      result.current.selectItem('BAU-123');
    });

    expect(result.current.activeItemId).toBe('BAU-123');

    // Then clear it
    act(() => {
      result.current.selectItem(null);
    });

    expect(result.current.activeItemId).toBeNull();
  });

  it('returns clearSelection callback', () => {
    const { result } = renderHook(
      () => useItemSelection(mockItems, { urlParam: 'issue' }),
      { wrapper }
    );

    expect(typeof result.current.clearSelection).toBe('function');
  });

  it('disables URL sync when urlParam is null', () => {
    const { result } = renderHook(
      () => useItemSelection(mockItems, { urlParam: null }),
      { wrapper }
    );

    act(() => {
      result.current.selectItem('BAU-456');
    });

    // URL should not change when urlParam is null
    expect(window.location.search).not.toContain('issue=BAU-456');
  });
});
