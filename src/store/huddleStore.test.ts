// src/store/huddleStore.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// huddleStore drives the mesh (N-way) implementation, not the legacy 1:1
// HuddleConnection — mock the module it actually imports.
const startMock = vi.fn(async () => {});
const closeMock = vi.fn();
const setMuteMock = vi.fn();
vi.mock('@/lib/chat/huddle/HuddleMesh', () => ({
  HuddleMesh: vi.fn().mockImplementation(function () {
    return { start: startMock, close: closeMock, setMicMuted: setMuteMock };
  }),
}));

// Chainable supabase db mock — compatible with existing tests (they don't call db)
// and observable by the new leave-persistence test via dbCalls. Also provides a
// minimal realtime `channel()` stub — HuddleMesh itself is mocked above so
// nothing here actually negotiates WebRTC, but ChatRealtimeManager (a
// singleton constructed at import time) still calls supabase.channel(...)
// from other code paths exercised indirectly via huddleStore.
const dbCalls: any[] = [];
vi.mock('@/integrations/supabase/client', () => {
  const chain = () => {
    const c: any = {};
    c.update = (vals: any) => { dbCalls.push({ op: 'update', vals }); return c; };
    c.insert = (vals: any) => { dbCalls.push({ op: 'insert', vals }); return c; };
    c.eq = () => c; c.is = () => c; c.in = () => c; c.filter = () => c; c.select = () => c;
    c.single = async () => ({ data: { id: 'evt1' }, error: null });
    c.maybeSingle = async () => ({ data: null });
    return c;
  };
  const fakeChannel = () => {
    const ch: any = {};
    ch.on = () => ch;
    ch.subscribe = () => ch;
    ch.send = () => ch;
    return ch;
  };
  return {
    supabase: {
      from: () => chain(),
      channel: () => fakeChannel(),
      removeChannel: () => {},
      functions: { invoke: async () => ({ data: null, error: new Error('not mocked') }) },
    },
  };
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

  it('enter sets windowState open and chat panel closed', async () => {
    await useHuddleStore.getState().enter({
      conversationId: 'c1', huddleId: 'h1', conversationName: 'Zulqarnain', selfId: 'me',
    });
    expect(useHuddleStore.getState().windowState).toBe('open');
    expect(useHuddleStore.getState().chatPanelOpen).toBe(false);
  });

  it('enter logs a huddle_live event message at call start', async () => {
    dbCalls.length = 0;
    await useHuddleStore.getState().enter({
      conversationId: 'c1', huddleId: 'h1', conversationName: 'Zulqarnain', selfId: 'me',
    });
    await Promise.resolve(); // let the async insert flush
    const live = dbCalls.find(
      (c) => c.op === 'insert' && c.vals?.event_type === 'huddle_live',
    );
    expect(live).toBeTruthy();
    expect(live.vals.event_meta.huddle_id).toBe('h1');
    expect(live.vals.event_meta.with_name).toBe('Zulqarnain');
    expect(live.vals.body_text).toBe('Huddle is happening');
  });

  it('leave flips the event row to a huddle_summary', async () => {
    await useHuddleStore.getState().enter({
      conversationId: 'c1', huddleId: 'h1', conversationName: 'Zulqarnain', selfId: 'me',
    });
    dbCalls.length = 0;
    useHuddleStore.getState().leave();
    // finalizeHuddleSummary is fire-and-forget from leave() and awaits a
    // Promise.all of two lookups before building the update() call — one
    // microtask tick isn't enough to flush that chain, so wait for the
    // macrotask queue to drain instead of guessing a tick count.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const summary = dbCalls.find(
      (c) => c.op === 'update' && c.vals?.event_type === 'huddle_summary',
    );
    expect(summary).toBeTruthy();
    expect(summary.vals.event_meta.huddle_id).toBe('h1');
    expect(summary.vals.event_meta.with_name).toBe('Zulqarnain');
    expect(summary.vals.body_text).toBe('A huddle happened');
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
