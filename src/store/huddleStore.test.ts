// src/store/huddleStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const startMock = vi.fn(async () => {});
const closeMock = vi.fn();
const setMuteMock = vi.fn();
vi.mock('@/lib/chat/huddle/HuddleConnection', () => ({
  HuddleConnection: vi.fn().mockImplementation(function () {
    return { start: startMock, close: closeMock, setMicMuted: setMuteMock };
  }),
}));

import { useHuddleStore } from './huddleStore';

beforeEach(() => {
  // reset module-level connection ref via the real leave() path, then zero the mocks
  if (useHuddleStore.getState().active) useHuddleStore.getState().leave();
  startMock.mockClear(); closeMock.mockClear(); setMuteMock.mockClear();
  useHuddleStore.setState({ active: null });
});

describe('huddleStore', () => {
  it('enter populates active and starts the connection', async () => {
    await useHuddleStore.getState().enter({
      conversationId: 'cv', huddleId: 'h1', conversationName: 'Vikram', selfId: 'me',
    });
    expect(useHuddleStore.getState().active).toMatchObject({
      conversationId: 'cv', huddleId: 'h1', conversationName: 'Vikram', micMuted: false,
    });
    expect(startMock).toHaveBeenCalledOnce();
  });

  it('toggleMute flips state and calls the controller', async () => {
    await useHuddleStore.getState().enter({ conversationId: 'cv', huddleId: 'h1', conversationName: 'x', selfId: 'me' });
    useHuddleStore.getState().toggleMute();
    expect(useHuddleStore.getState().active?.micMuted).toBe(true);
    expect(setMuteMock).toHaveBeenCalledWith(true);
  });

  it('leave clears active and closes the connection', async () => {
    await useHuddleStore.getState().enter({ conversationId: 'cv', huddleId: 'h1', conversationName: 'x', selfId: 'me' });
    useHuddleStore.getState().leave();
    expect(useHuddleStore.getState().active).toBeNull();
    expect(closeMock).toHaveBeenCalledOnce();
  });
});
