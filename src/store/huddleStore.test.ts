// src/store/huddleStore.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const startMock = vi.fn(async () => {});
const closeMock = vi.fn();
const setMuteMock = vi.fn();
vi.mock('@/lib/chat/huddle/HuddleConnection', () => ({
  HuddleConnection: vi.fn().mockImplementation(function () {
    return { start: startMock, close: closeMock, setMicMuted: setMuteMock };
  }),
}));

// Chainable supabase db mock — compatible with existing tests (they don't call db)
// and observable by the new leave-persistence test via dbCalls.
const dbCalls: any[] = [];
vi.mock('@/integrations/supabase/client', () => {
  const chain = () => {
    const c: any = {};
    c.update = (vals: any) => { dbCalls.push({ op: 'update', vals }); return c; };
    c.insert = (vals: any) => { dbCalls.push({ op: 'insert', vals }); return c; };
    c.eq = () => c; c.is = () => c; c.select = () => c; c.maybeSingle = async () => ({ data: null });
    return c;
  };
  return { supabase: { from: () => chain() } };
});

import { useHuddleStore } from './huddleStore';

beforeEach(() => {
  // reset module-level connection ref via the real leave() path, then zero the mocks
  if (useHuddleStore.getState().active) useHuddleStore.getState().leave();
  startMock.mockClear(); closeMock.mockClear(); setMuteMock.mockClear();
  useHuddleStore.setState({ active: null });
});

afterEach(() => { dbCalls.length = 0; });

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

describe('huddleStore leave persistence', () => {
  it('leave marks the participant row left_at', async () => {
    await useHuddleStore.getState().enter({ conversationId: 'cv', huddleId: 'h1', conversationName: 'x', selfId: 'me' });
    useHuddleStore.getState().leave();
    // allow the async DB write to flush
    await Promise.resolve(); await Promise.resolve();
    expect(dbCalls.some(c => c.op === 'update' && c.vals.left_at)).toBe(true);
  });
});
