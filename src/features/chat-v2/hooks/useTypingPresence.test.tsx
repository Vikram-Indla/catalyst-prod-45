import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const subscribers = new Set<(name: string) => void>();
const broadcastTyping = vi.fn();

vi.mock('@/lib/chat/ChatRealtimeManager', () => ({
  chatRealtime: {
    subscribeTyping: (_convId: string, cb: (name: string) => void) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    broadcastTyping: (...args: unknown[]) => broadcastTyping(...args),
  },
}));

import { useTypingPresence } from './useTypingPresence';

function emit(name: string) {
  subscribers.forEach(cb => cb(name));
}

describe('useTypingPresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    subscribers.clear();
    broadcastTyping.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('surfaces a typing user and expires them after the TTL', () => {
    const { result } = renderHook(() => useTypingPresence('conv-1', 'Me'));
    act(() => emit('Aisha'));
    expect(result.current.typingUsers).toEqual(['Aisha']);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.typingUsers).toEqual([]);
  });

  it('throttles outgoing typing broadcasts', () => {
    const { result } = renderHook(() => useTypingPresence('conv-1', 'Me'));
    act(() => {
      result.current.notifyTyping();
      result.current.notifyTyping();
      result.current.notifyTyping();
    });
    expect(broadcastTyping).toHaveBeenCalledTimes(1);
    expect(broadcastTyping).toHaveBeenCalledWith('conv-1', 'Me');
    act(() => {
      vi.advanceTimersByTime(3000);
      result.current.notifyTyping();
    });
    expect(broadcastTyping).toHaveBeenCalledTimes(2);
  });

  it('does not broadcast without a name or conversation', () => {
    const { result } = renderHook(() => useTypingPresence(null, null));
    act(() => result.current.notifyTyping());
    expect(broadcastTyping).not.toHaveBeenCalled();
  });

  it('clears typing state when the conversation changes', () => {
    const { result, rerender } = renderHook(
      ({ convId }: { convId: string }) => useTypingPresence(convId, 'Me'),
      { initialProps: { convId: 'conv-1' } },
    );
    act(() => emit('Aisha'));
    expect(result.current.typingUsers).toEqual(['Aisha']);
    rerender({ convId: 'conv-2' });
    expect(result.current.typingUsers).toEqual([]);
  });
});
