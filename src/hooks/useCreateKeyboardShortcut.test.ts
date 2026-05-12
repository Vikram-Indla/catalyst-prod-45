/**
 * useCreateKeyboardShortcut — Keyboard listener for 'C' create shortcut (F1.11)
 *
 * Contract:
 *   - Calls callback when 'C' is pressed
 *   - Does not call callback when typing in input/textarea
 *   - Ignores modifier keys (Ctrl+C, Cmd+C)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateKeyboardShortcut } from './useCreateKeyboardShortcut';

describe('useCreateKeyboardShortcut', () => {
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callback = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls callback when C key is pressed', () => {
    renderHook(() => useCreateKeyboardShortcut(callback));

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('calls callback for uppercase C', () => {
    renderHook(() => useCreateKeyboardShortcut(callback));

    const event = new KeyboardEvent('keydown', {
      key: 'C',
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not call callback when typing in input', () => {
    renderHook(() => useCreateKeyboardShortcut(callback));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      bubbles: true,
    });
    input.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('does not call callback when typing in textarea', () => {
    renderHook(() => useCreateKeyboardShortcut(callback));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      bubbles: true,
    });
    textarea.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('ignores Ctrl+C', () => {
    renderHook(() => useCreateKeyboardShortcut(callback));

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores Cmd+C', () => {
    renderHook(() => useCreateKeyboardShortcut(callback));

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useCreateKeyboardShortcut(callback));

    unmount();

    const event = new KeyboardEvent('keydown', {
      key: 'c',
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });
});
