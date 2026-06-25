# Chat Huddle (Audio) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time, audio-only, two-person voice "huddle" to Catalyst chat, startable from a DM or project channel, with a green active-line indicator and a persistent header call-strip that survives leaving `/chat`.

**Architecture:** Browser-to-browser WebRTC peer connection (audio track only, cap 2). Signaling rides the existing Supabase Realtime broadcast manager. Durable huddle state lives in two new tables (`chat_huddles`, `chat_huddle_participants`) gated by the existing `chat_is_member` SECURITY DEFINER helper. A global zustand store at app-shell scope owns the live `RTCPeerConnection` so the call persists across route changes.

**Tech Stack:** React + TypeScript, Vitest, zustand, Supabase JS (Realtime broadcast + postgres_changes), WebRTC (`RTCPeerConnection`, `getUserMedia`), `@atlaskit/*` for the shell strip, chat-v2 local primitives (`shared/Icon`, `shared/IconButton`, `--cv2-*` / `--ds-*` tokens) inside chat.

## Global Constraints

- **Audio only. No video.** No video tracks, no webcam, anywhere.
- **Cap 2 participants.** App-side guard now; table model supports N later. No SFU.
- **Staging-first (P0):** every migration applied + tested on staging (`cyijbdeuehohvhnsywig`) before any prod (`lmqwtldpfacrrlvdnmld`) promotion.
- **RLS:** all policies route through `public.chat_is_member(convo_id uuid, user_id uuid)` — never inline self-referential subqueries. Qualify every function param as `fn_name.param`. Run the 2-user isolation test before declaring RLS done.
- **ICE:** Google STUN now; TURN read from `import.meta.env.VITE_TURN_URL/USER/CRED`, empty today, zero-code-change to add later.
- **ADS / design audit:** zero hardcoded hex in shell-scope files; green = `var(--ds-icon-success, #22A06B)` / `var(--ds-border-success, #4BCE97)`. Run `node design-governance/cli/index.js audit src/<file>` clean before each UI commit. Inside chat-v2, follow the existing `--cv2-*` token + `shared/Icon`/`shared/IconButton` conventions.
- **Reuse first:** extend `ChatRealtimeManager` (don't fork); `@atlaskit/avatar|button|spinner|tooltip` in shell strip; chat-v2 primitives inside chat.
- **DB access pattern:** chat tables are not in generated types — use `const db = supabase as unknown as { from: (t: string) => any };` exactly as `useConversations.ts` does.
- **Current user:** `const { user } = useAuth();` from `@/hooks/useAuth`, id at `user.id`.
- **Commit discipline:** stage explicit paths only — never `git add -A`/`.`.

---

## File Structure

**Create:**
- `supabase/migrations/<ts>_chat_huddles.sql` — tables, indexes, RLS, realtime publication.
- `src/lib/chat/huddle/HuddleConnection.ts` — WebRTC controller (peer + signaling glue + getUserMedia).
- `src/lib/chat/huddle/iceConfig.ts` — ICE servers (STUN + env TURN slot).
- `src/lib/chat/huddle/signaling.ts` — typed huddle signaling messages + `subscribeHuddleSignal`/`sendHuddleSignal` on `chatRealtime`.
- `src/store/huddleStore.ts` — global zustand store owning the active huddle + controller refs.
- `src/store/huddleStore.test.ts` — store reducer/cap-2/transition tests.
- `src/lib/chat/huddle/HuddleConnection.test.ts` — offer/answer state-machine tests (mocked RTCPeerConnection).
- `src/hooks/chat/useHuddleData.ts` — `useActiveHuddle(conversationId)` + `useActiveHuddleIds()` (sidebar) + start/join/leave mutations.
- `src/features/chat-v2/components/Huddle/HuddlePanel.tsx` — in-conversation strip (avatars, join/leave/mute, full state).
- `src/components/layout/HuddleHeaderStrip.tsx` — persistent global call-strip (shell scope, `@atlaskit`).

**Modify:**
- `src/lib/chat/ChatRealtimeManager.ts` — add `subscribeHuddleSignal` + `sendHuddleSignal` (broadcast channel `huddle-signal:${conversationId}`).
- `src/features/chat-v2/components/MessagePanel/MessagePanelHeader.tsx` — add headphone IconButton → start/join huddle.
- The MessagePanel body (where `MessageList` mounts) — render `<HuddlePanel conversation={...} />` above the list when an active huddle exists.
- `src/features/chat-v2/components/Sidebar/ConversationRow.tsx`, `DmRichRow.tsx`, `ChannelRow.tsx` — green active-line when `activeHuddleIds.has(conversation.id)`.
- `src/features/chat-v2/components/Sidebar/Sidebar.tsx` — call `useActiveHuddleIds()`, pass `hasHuddle` down to rows.
- `src/components/layout/CatalystShell.tsx` — mount `<HuddleHeaderStrip />` once at shell root.

---

## Task 1: Database schema + RLS (staging)

**Files:**
- Create: `supabase/migrations/<timestamp>_chat_huddles.sql`

**Interfaces:**
- Produces tables `chat_huddles(id, conversation_id, started_by, status, created_at, ended_at)` and `chat_huddle_participants(id, huddle_id, user_id, joined_at, left_at, is_connected)`; RLS via `chat_is_member`.

- [ ] **Step 1: Write the migration**

Create the migration file with this exact content (timestamp = run `date +%Y%m%d%H%M%S` or mirror existing naming):

```sql
-- Chat huddle (audio-only, 2-person) — durable state for the green active-line,
-- join affordance, and cross-route persistence. Signaling itself is ephemeral
-- (Supabase broadcast) and is NOT stored here.

CREATE TABLE IF NOT EXISTS public.chat_huddles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  started_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

-- At most one live huddle per conversation.
CREATE UNIQUE INDEX IF NOT EXISTS chat_huddles_one_active_per_conv
  ON public.chat_huddles (conversation_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS chat_huddles_conversation_idx
  ON public.chat_huddles (conversation_id);

CREATE TABLE IF NOT EXISTS public.chat_huddle_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  huddle_id uuid NOT NULL REFERENCES public.chat_huddles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  is_connected boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS chat_huddle_participants_huddle_idx
  ON public.chat_huddle_participants (huddle_id);

ALTER TABLE public.chat_huddles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_huddle_participants ENABLE ROW LEVEL SECURITY;

-- chat_huddles: members of the conversation can read; members can start/end.
CREATE POLICY chat_huddles_select ON public.chat_huddles
  FOR SELECT TO authenticated
  USING (public.chat_is_member(conversation_id, auth.uid()));

CREATE POLICY chat_huddles_insert ON public.chat_huddles
  FOR INSERT TO authenticated
  WITH CHECK (public.chat_is_member(conversation_id, auth.uid()) AND started_by = auth.uid());

CREATE POLICY chat_huddles_update ON public.chat_huddles
  FOR UPDATE TO authenticated
  USING (public.chat_is_member(conversation_id, auth.uid()))
  WITH CHECK (public.chat_is_member(conversation_id, auth.uid()));

-- participants: visible to members of the parent conversation; a user writes
-- only their own participant row (PostgREST v12 INSERT+RETURNING short-circuit).
CREATE POLICY chat_huddle_participants_select ON public.chat_huddle_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_huddles h
      WHERE h.id = chat_huddle_participants.huddle_id
        AND public.chat_is_member(h.conversation_id, auth.uid())
    )
  );

CREATE POLICY chat_huddle_participants_insert ON public.chat_huddle_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_huddles h
      WHERE h.id = chat_huddle_participants.huddle_id
        AND public.chat_is_member(h.conversation_id, auth.uid())
    )
  );

CREATE POLICY chat_huddle_participants_update ON public.chat_huddle_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime: clients subscribe to chat_huddles changes for the green line.
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_huddles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_huddle_participants;
```

- [ ] **Step 2: Apply to staging**

Use the staging Supabase MCP (`apply_migration`) against `cyijbdeuehohvhnsywig`. Confirm both tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('chat_huddles','chat_huddle_participants');
```
Expected: 2 rows.

- [ ] **Step 3: 2-user RLS isolation test (staging)**

Run this via the staging MCP `execute_sql`. Pick two real member user ids of one conversation (`A`, `B`) and one non-member (`C`). Seed an active huddle as A, then verify visibility:

```sql
-- seed (as service role / direct):
INSERT INTO chat_huddles (conversation_id, started_by) VALUES ('<CONV>', '<A>') RETURNING id;
-- simulate member B:
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<B>"}';
SELECT count(*) FROM chat_huddles WHERE conversation_id='<CONV>';  -- expect 1
RESET ROLE;
-- simulate non-member C:
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<C>"}';
SELECT count(*) FROM chat_huddles WHERE conversation_id='<CONV>';  -- expect 0
RESET ROLE;
```
Expected: member sees 1, stranger sees 0. If stranger sees ≥1 → policy leak, STOP and fix before continuing. Clean up the seed row afterward.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/<timestamp>_chat_huddles.sql
git commit -m "feat(huddle): chat_huddles + participants tables with member-gated RLS"
```

---

## Task 2: ICE config

**Files:**
- Create: `src/lib/chat/huddle/iceConfig.ts`
- Test: `src/lib/chat/huddle/iceConfig.test.ts`

**Interfaces:**
- Produces: `export function getIceServers(): RTCIceServer[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/chat/huddle/iceConfig.test.ts
import { describe, it, expect } from 'vitest';
import { getIceServers } from './iceConfig';

describe('getIceServers', () => {
  it('always includes a Google STUN server', () => {
    const servers = getIceServers();
    const urls = servers.flatMap(s => Array.isArray(s.urls) ? s.urls : [s.urls]);
    expect(urls.some(u => u.startsWith('stun:'))).toBe(true);
  });

  it('omits TURN when env is unset', () => {
    const servers = getIceServers();
    const urls = servers.flatMap(s => Array.isArray(s.urls) ? s.urls : [s.urls]);
    expect(urls.some(u => u.startsWith('turn:'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/chat/huddle/iceConfig.test.ts`
Expected: FAIL — cannot find module `./iceConfig`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/chat/huddle/iceConfig.ts
/**
 * ICE servers for huddle WebRTC. STUN-only today (free Google servers).
 * TURN is read from env when present — populate VITE_TURN_URL/USER/CRED to
 * enable relay for restrictive networks with zero code change.
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USER as string | undefined,
      credential: import.meta.env.VITE_TURN_CRED as string | undefined,
    });
  }
  return servers;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/chat/huddle/iceConfig.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/huddle/iceConfig.ts src/lib/chat/huddle/iceConfig.test.ts
git commit -m "feat(huddle): ICE config with STUN + env TURN slot"
```

---

## Task 3: Signaling types + ChatRealtimeManager extension

**Files:**
- Create: `src/lib/chat/huddle/signaling.ts`
- Modify: `src/lib/chat/ChatRealtimeManager.ts`
- Test: `src/lib/chat/huddle/signaling.test.ts`

**Interfaces:**
- Consumes: `chatRealtime` singleton from `ChatRealtimeManager`.
- Produces:
  - `type HuddleSignal = { kind: 'join'|'leave'; from: string } | { kind: 'offer'|'answer'; from: string; sdp: RTCSessionDescriptionInit } | { kind: 'ice-candidate'; from: string; candidate: RTCIceCandidateInit }`
  - On `chatRealtime`: `subscribeHuddleSignal(conversationId: string, cb: (sig: HuddleSignal) => void): UnsubscribeFn` and `sendHuddleSignal(conversationId: string, sig: HuddleSignal): void`.

- [ ] **Step 1: Write the signaling types module**

```ts
// src/lib/chat/huddle/signaling.ts
export type HuddleSignal =
  | { kind: 'join'; from: string }
  | { kind: 'leave'; from: string }
  | { kind: 'offer'; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice-candidate'; from: string; candidate: RTCIceCandidateInit };

export const HUDDLE_SIGNAL_EVENT = 'huddle-signal';
```

- [ ] **Step 2: Add signaling methods to ChatRealtimeManager**

In `src/lib/chat/ChatRealtimeManager.ts`, add an import at top:

```ts
import { HUDDLE_SIGNAL_EVENT, type HuddleSignal } from './huddle/signaling';
```

Add a third channel map field beside the existing two (inside the class, after `typingChannels`):

```ts
  private huddleSignalChannels = new Map<string, ChannelEntry>();
```

Add these two methods inside the class (after `broadcastTyping`):

```ts
  /** Subscribe to ephemeral huddle signaling for a conversation. */
  subscribeHuddleSignal(
    conversationId: string,
    cb: (sig: HuddleSignal) => void,
  ): UnsubscribeFn {
    if (!conversationId) return () => {};

    let entry = this.huddleSignalChannels.get(conversationId);
    if (!entry) {
      const channel = supabase.channel(`huddle-signal:${conversationId}`, {
        config: { broadcast: { self: false } },
      });
      const callbacks = new Set<(arg: unknown) => void>();
      const created: ChannelEntry = { channel, callbacks };

      channel
        .on('broadcast', { event: HUDDLE_SIGNAL_EVENT }, (payload: { payload?: HuddleSignal }) => {
          const sig = payload?.payload;
          if (sig && typeof sig.kind === 'string') {
            created.callbacks.forEach((fn) => fn(sig));
          }
        })
        .subscribe();

      this.huddleSignalChannels.set(conversationId, created);
      entry = created;
    }

    const wrapped = (arg: unknown) => cb(arg as HuddleSignal);
    entry.callbacks.add(wrapped);

    return () => {
      const current = this.huddleSignalChannels.get(conversationId);
      if (!current) return;
      current.callbacks.delete(wrapped);
      if (current.callbacks.size === 0) {
        supabase.removeChannel(current.channel);
        this.huddleSignalChannels.delete(conversationId);
      }
    };
  }

  /** Broadcast a huddle signaling message to the conversation channel. */
  sendHuddleSignal(conversationId: string, sig: HuddleSignal): void {
    if (!conversationId) return;
    const entry = this.huddleSignalChannels.get(conversationId);
    if (!entry) return;
    void entry.channel.send({
      type: 'broadcast',
      event: HUDDLE_SIGNAL_EVENT,
      payload: sig,
    });
  }
```

- [ ] **Step 3: Write a smoke test for the signaling type guard**

```ts
// src/lib/chat/huddle/signaling.test.ts
import { describe, it, expect } from 'vitest';
import { HUDDLE_SIGNAL_EVENT, type HuddleSignal } from './signaling';

describe('huddle signaling', () => {
  it('exposes a stable broadcast event name', () => {
    expect(HUDDLE_SIGNAL_EVENT).toBe('huddle-signal');
  });

  it('models all five message kinds', () => {
    const kinds: HuddleSignal['kind'][] = ['join', 'leave', 'offer', 'answer', 'ice-candidate'];
    expect(kinds).toHaveLength(5);
  });
});
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run src/lib/chat/huddle/signaling.test.ts`
Expected: PASS (2 tests).
Run: `npx tsc --noEmit` — expected: no new errors in `ChatRealtimeManager.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/huddle/signaling.ts src/lib/chat/huddle/signaling.test.ts src/lib/chat/ChatRealtimeManager.ts
git commit -m "feat(huddle): broadcast signaling channel on ChatRealtimeManager"
```

---

## Task 4: HuddleConnection WebRTC controller

**Files:**
- Create: `src/lib/chat/huddle/HuddleConnection.ts`
- Test: `src/lib/chat/huddle/HuddleConnection.test.ts`

**Interfaces:**
- Consumes: `getIceServers` (Task 2), `chatRealtime.subscribeHuddleSignal/sendHuddleSignal` + `HuddleSignal` (Task 3).
- Produces:
  ```ts
  class HuddleConnection {
    constructor(opts: {
      conversationId: string;
      selfId: string;
      onRemoteStream: (stream: MediaStream) => void;
      onConnectionState: (state: RTCPeerConnectionState) => void;
    });
    start(): Promise<void>;          // getUserMedia + announce join
    setMicMuted(muted: boolean): void;
    close(): void;                   // broadcast leave + teardown
  }
  ```
- Behavior contract: the peer that receives a `join` from the other side creates the offer (deterministic by comparing ids — lower id is the offerer) so both sides don't offer simultaneously.

- [ ] **Step 1: Write the failing test (offer-role + mute + teardown)**

```ts
// src/lib/chat/huddle/HuddleConnection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mocks ----
const sent: any[] = [];
let signalCb: ((s: any) => void) | null = null;
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('../ChatRealtimeManager', () => ({
  chatRealtime: {
    subscribeHuddleSignal: (_c: string, cb: (s: any) => void) => { signalCb = cb; return () => {}; },
    sendHuddleSignal: (_c: string, s: any) => { sent.push(s); },
  },
}));

const track = { stop: vi.fn(), enabled: true };
const fakeStream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;

class FakePC {
  connectionState: RTCPeerConnectionState = 'new';
  onicecandidate: any; ontrack: any; onconnectionstatechange: any;
  addTrack = vi.fn();
  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'o' }));
  createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'a' }));
  setLocalDescription = vi.fn(async () => {});
  setRemoteDescription = vi.fn(async () => {});
  addIceCandidate = vi.fn(async () => {});
  close = vi.fn();
}

beforeEach(() => {
  sent.length = 0; signalCb = null;
  (globalThis as any).RTCPeerConnection = FakePC as any;
  (globalThis as any).navigator = { mediaDevices: { getUserMedia: vi.fn(async () => fakeStream) } };
});

import { HuddleConnection } from './HuddleConnection';

describe('HuddleConnection', () => {
  it('announces join on start and captures mic', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    expect((navigator.mediaDevices.getUserMedia as any)).toHaveBeenCalledWith({ audio: true });
    expect(sent.some(s => s.kind === 'join' && s.from === 'aaa')).toBe(true);
  });

  it('lower id becomes the offerer when the other peer joins', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    sent.length = 0;
    signalCb!({ kind: 'join', from: 'zzz' }); // remote id is higher → we (aaa) offer
    await Promise.resolve(); await Promise.resolve();
    expect(sent.some(s => s.kind === 'offer')).toBe(true);
  });

  it('mute toggles the audio track enabled flag', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    c.setMicMuted(true);
    expect(track.enabled).toBe(false);
    c.setMicMuted(false);
    expect(track.enabled).toBe(true);
  });

  it('close stops tracks, broadcasts leave, closes peer', async () => {
    const c = new HuddleConnection({ conversationId: 'cv', selfId: 'aaa', onRemoteStream: () => {}, onConnectionState: () => {} });
    await c.start();
    c.close();
    expect(track.stop).toHaveBeenCalled();
    expect(sent.some(s => s.kind === 'leave' && s.from === 'aaa')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/chat/huddle/HuddleConnection.test.ts`
Expected: FAIL — cannot find module `./HuddleConnection`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/chat/huddle/HuddleConnection.ts
/**
 * HuddleConnection — a single 2-person, audio-only WebRTC peer connection plus
 * its signaling glue. Separate concern from voice-flow/AudioCaptureService
 * (dictation): this drives a live call, not a recording.
 *
 * Offer-role tiebreak: when both peers are present, the one with the
 * lexicographically smaller user id creates the offer, so the two sides never
 * offer simultaneously (glare avoidance).
 */
import { chatRealtime } from '../ChatRealtimeManager';
import type { HuddleSignal } from './signaling';
import { getIceServers } from './iceConfig';

interface HuddleConnectionOpts {
  conversationId: string;
  selfId: string;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
}

export class HuddleConnection {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private unsub: (() => void) | null = null;
  private remoteId: string | null = null;

  constructor(private opts: HuddleConnectionOpts) {}

  async start(): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.unsub = chatRealtime.subscribeHuddleSignal(this.opts.conversationId, (sig) =>
      this.onSignal(sig),
    );
    // Announce presence; an already-present peer will react and negotiation begins.
    chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'join', from: this.opts.selfId });
  }

  setMicMuted(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  close(): void {
    chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'leave', from: this.opts.selfId });
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    this.unsub?.();
    this.unsub = null;
  }

  private ensurePc(): RTCPeerConnection {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    this.localStream?.getTracks().forEach((t) => pc.addTrack(t, this.localStream as MediaStream));
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (stream) this.opts.onRemoteStream(stream);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        chatRealtime.sendHuddleSignal(this.opts.conversationId, {
          kind: 'ice-candidate',
          from: this.opts.selfId,
          candidate: e.candidate.toJSON(),
        });
      }
    };
    pc.onconnectionstatechange = () => this.opts.onConnectionState(pc.connectionState);
    this.pc = pc;
    return pc;
  }

  private amOfferer(): boolean {
    return this.remoteId !== null && this.opts.selfId < this.remoteId;
  }

  private async onSignal(sig: HuddleSignal): Promise<void> {
    if (sig.from === this.opts.selfId) return;
    switch (sig.kind) {
      case 'join': {
        this.remoteId = sig.from;
        // Re-announce so a peer who joined first also learns about us.
        chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'join', from: this.opts.selfId });
        if (this.amOfferer()) {
          const pc = this.ensurePc();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'offer', from: this.opts.selfId, sdp: offer });
        }
        break;
      }
      case 'offer': {
        this.remoteId = sig.from;
        const pc = this.ensurePc();
        await pc.setRemoteDescription(sig.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        chatRealtime.sendHuddleSignal(this.opts.conversationId, { kind: 'answer', from: this.opts.selfId, sdp: answer });
        break;
      }
      case 'answer': {
        await this.pc?.setRemoteDescription(sig.sdp);
        break;
      }
      case 'ice-candidate': {
        try { await this.pc?.addIceCandidate(sig.candidate); } catch { /* candidate before remote desc — ignore */ }
        break;
      }
      case 'leave': {
        this.opts.onConnectionState('disconnected');
        break;
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/chat/huddle/HuddleConnection.test.ts`
Expected: PASS (4 tests). The re-announce in the `join` handler is guarded against infinite loops by `sig.from === this.opts.selfId` early-return (broadcast uses `self:false` in production; in the test the mock never echoes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/huddle/HuddleConnection.ts src/lib/chat/huddle/HuddleConnection.test.ts
git commit -m "feat(huddle): WebRTC HuddleConnection controller with glare-free offer role"
```

---

## Task 5: Global huddle store (zustand)

**Files:**
- Create: `src/store/huddleStore.ts`
- Test: `src/store/huddleStore.test.ts`

**Interfaces:**
- Consumes: `HuddleConnection` (Task 4).
- Produces:
  ```ts
  interface ActiveHuddle {
    conversationId: string;
    huddleId: string;
    conversationName: string;
    micMuted: boolean;
    connectionState: RTCPeerConnectionState;
  }
  useHuddleStore: zustand store with
    active: ActiveHuddle | null;
    enter(args: { conversationId; huddleId; conversationName; selfId }): Promise<void>;
    leave(): void;
    toggleMute(): void;
    _setConnectionState(s): void;   // internal, used by controller callback
  ```
- The live `HuddleConnection` + remote `<audio>` element are held in module-level refs (NOT in zustand state) so React re-renders don't recreate them.

- [ ] **Step 1: Write the failing test**

```ts
// src/store/huddleStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const startMock = vi.fn(async () => {});
const closeMock = vi.fn();
const setMuteMock = vi.fn();
vi.mock('@/lib/chat/huddle/HuddleConnection', () => ({
  HuddleConnection: vi.fn().mockImplementation(() => ({
    start: startMock, close: closeMock, setMicMuted: setMuteMock,
  })),
}));

import { useHuddleStore } from './huddleStore';

beforeEach(() => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/huddleStore.test.ts`
Expected: FAIL — cannot find module `./huddleStore`.

- [ ] **Step 3: Write the implementation**

```ts
// src/store/huddleStore.ts
import { create } from 'zustand';
import { HuddleConnection } from '@/lib/chat/huddle/HuddleConnection';

export interface ActiveHuddle {
  conversationId: string;
  huddleId: string;
  conversationName: string;
  micMuted: boolean;
  connectionState: RTCPeerConnectionState;
}

interface EnterArgs {
  conversationId: string;
  huddleId: string;
  conversationName: string;
  selfId: string;
}

interface HuddleStore {
  active: ActiveHuddle | null;
  enter: (args: EnterArgs) => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  _setConnectionState: (s: RTCPeerConnectionState) => void;
}

// Non-React module refs — the live peer + remote audio element must NOT live in
// store state (they are not serializable and must survive re-renders).
let connection: HuddleConnection | null = null;
let remoteAudioEl: HTMLAudioElement | null = null;

function attachRemote(stream: MediaStream) {
  if (typeof document === 'undefined') return;
  if (!remoteAudioEl) {
    remoteAudioEl = document.createElement('audio');
    remoteAudioEl.autoplay = true;
    remoteAudioEl.setAttribute('data-huddle-remote-audio', 'true');
    document.body.appendChild(remoteAudioEl);
  }
  remoteAudioEl.srcObject = stream;
}

function detachRemote() {
  if (remoteAudioEl) {
    remoteAudioEl.srcObject = null;
    remoteAudioEl.remove();
    remoteAudioEl = null;
  }
}

export const useHuddleStore = create<HuddleStore>((set, get) => ({
  active: null,

  enter: async ({ conversationId, huddleId, conversationName, selfId }) => {
    // Tear down any existing call first (one huddle at a time).
    if (connection) { connection.close(); connection = null; detachRemote(); }
    connection = new HuddleConnection({
      conversationId,
      selfId,
      onRemoteStream: attachRemote,
      onConnectionState: (s) => get()._setConnectionState(s),
    });
    set({
      active: { conversationId, huddleId, conversationName, micMuted: false, connectionState: 'new' },
    });
    await connection.start();
  },

  leave: () => {
    connection?.close();
    connection = null;
    detachRemote();
    set({ active: null });
  },

  toggleMute: () => {
    const a = get().active;
    if (!a) return;
    const next = !a.micMuted;
    connection?.setMicMuted(next);
    set({ active: { ...a, micMuted: next } });
  },

  _setConnectionState: (s) => {
    const a = get().active;
    if (!a) return;
    set({ active: { ...a, connectionState: s } });
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/huddleStore.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/huddleStore.ts src/store/huddleStore.test.ts
git commit -m "feat(huddle): global zustand huddle store owning the live connection"
```

---

## Task 6: Huddle data hooks (start/join/leave + realtime active set)

**Files:**
- Create: `src/hooks/chat/useHuddleData.ts`

**Interfaces:**
- Consumes: `db` cast pattern, `useAuth`, `useHuddleStore`, `chatRealtime` (for the `chat_huddles` postgres_changes — reuse `subscribeMessages` style but on `chat_huddles`; add a tiny generic subscriber).
- Produces:
  - `useActiveHuddleIds(): Set<string>` — conversation ids that currently have an active huddle (drives the green line).
  - `useActiveHuddle(conversationId): { huddle: { id; participants: {userId}[]; isFull: boolean } | null; refetch: () => void }`
  - `useHuddleActions(): { startOrJoin(conversation): Promise<void>; }` — inserts/upserts the huddle row, enforces cap-2, then calls `useHuddleStore.enter`.

- [ ] **Step 1: Implement the hooks file**

> No standalone unit test for this task: it is thin glue over Supabase + zustand, both already covered. It is verified live in Task 10 (2-browser). Keep logic minimal.

```ts
// src/hooks/chat/useHuddleData.ts
/**
 * Huddle data hooks. chat_huddles / chat_huddle_participants are not in the
 * generated types — use the same `db` cast as useConversations.
 */
import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHuddleStore } from '@/store/huddleStore';
import type { ChatConversation } from '@/types/chat';

const db = supabase as unknown as { from: (t: string) => any };
const HUDDLE_CAP = 2;

interface HuddleRow { id: string; conversation_id: string; status: string }
interface ParticipantRow { huddle_id: string; user_id: string; left_at: string | null }

async function fetchActiveHuddles(): Promise<HuddleRow[]> {
  try {
    const { data, error } = await db.from('chat_huddles').select('id, conversation_id, status').eq('status', 'active');
    if (error || !data) return [];
    return data as HuddleRow[];
  } catch { return []; }
}

/** Conversation ids that currently have an active huddle. Realtime-refreshed. */
export function useActiveHuddleIds(): Set<string> {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['chat', 'huddles', 'active'],
    queryFn: fetchActiveHuddles,
    staleTime: 10 * 1000,
  });
  useEffect(() => {
    const channel = supabase
      .channel('huddles-active-global')
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddles' } as never,
        () => qc.invalidateQueries({ queryKey: ['chat', 'huddles', 'active'] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
  return new Set((data ?? []).map((h) => h.conversation_id));
}

/** The active huddle (if any) for one conversation, with participants + full flag. */
export function useActiveHuddle(conversationId: string | null) {
  const qc = useQueryClient();
  const key = ['chat', 'huddle', conversationId];
  const { data, refetch } = useQuery({
    queryKey: key,
    enabled: !!conversationId,
    queryFn: async () => {
      if (!conversationId) return null;
      const { data: hud } = await db.from('chat_huddles')
        .select('id').eq('conversation_id', conversationId).eq('status', 'active').maybeSingle();
      if (!hud) return null;
      const { data: parts } = await db.from('chat_huddle_participants')
        .select('huddle_id, user_id, left_at').eq('huddle_id', (hud as HuddleRow).id).is('left_at', null);
      const participants = ((parts ?? []) as ParticipantRow[]).map((p) => ({ userId: p.user_id }));
      return { id: (hud as HuddleRow).id, participants, isFull: participants.length >= HUDDLE_CAP };
    },
  });
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`huddle:${conversationId}`)
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddles', filter: `conversation_id=eq.${conversationId}` } as never,
        () => qc.invalidateQueries({ queryKey: key }))
      .on('postgres_changes' as 'system', { event: '*', schema: 'public', table: 'chat_huddle_participants' } as never,
        () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
  return { huddle: data ?? null, refetch };
}

/** Start a new huddle (or join the existing one), enforcing cap-2, then connect. */
export function useHuddleActions() {
  const { user } = useAuth();
  const enter = useHuddleStore((s) => s.enter);

  const startOrJoin = useCallback(async (conversation: ChatConversation) => {
    if (!user) return;
    const conversationId = conversation.id;
    // Find or create the active huddle row.
    let huddleId: string | null = null;
    const { data: existing } = await db.from('chat_huddles')
      .select('id').eq('conversation_id', conversationId).eq('status', 'active').maybeSingle();
    if (existing) {
      huddleId = (existing as HuddleRow).id;
      // cap-2 check on live participants
      const { data: parts } = await db.from('chat_huddle_participants')
        .select('user_id, left_at').eq('huddle_id', huddleId).is('left_at', null);
      const live = (parts ?? []) as ParticipantRow[];
      const alreadyIn = live.some((p) => p.user_id === user.id);
      if (!alreadyIn && live.length >= HUDDLE_CAP) {
        throw new Error('HUDDLE_FULL');
      }
    } else {
      const { data: created, error } = await db.from('chat_huddles')
        .insert({ conversation_id: conversationId, started_by: user.id })
        .select('id').single();
      if (error || !created) throw new Error('HUDDLE_START_FAILED');
      huddleId = (created as HuddleRow).id;
    }
    // Upsert my participant row (left_at = null = live).
    await db.from('chat_huddle_participants')
      .insert({ huddle_id: huddleId, user_id: user.id });
    await enter({
      conversationId,
      huddleId: huddleId as string,
      conversationName: conversation.title,
      selfId: user.id,
    });
  }, [user, enter]);

  return { startOrJoin };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `useHuddleData.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/chat/useHuddleData.ts
git commit -m "feat(huddle): data hooks for active-huddle set, per-conversation state, start/join"
```

---

## Task 7: Leave-on-DB + lifecycle wiring in the store

**Files:**
- Modify: `src/store/huddleStore.ts`
- Modify: `src/store/huddleStore.test.ts`

**Interfaces:**
- `leave()` must also mark the DB participant row `left_at = now()`, and if it was the last live participant, set the huddle `status='ended'`. Add a `selfId`/`huddleId` to the module refs so `leave()` can write. Add a `beforeunload` best-effort leave.

- [ ] **Step 1: Add the failing test**

Append to `src/store/huddleStore.test.ts`:

```ts
import { afterEach } from 'vitest';

// extend the supabase mock with a chainable db
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

afterEach(() => { dbCalls.length = 0; });

describe('huddleStore leave persistence', () => {
  it('leave marks the participant row left_at', async () => {
    await useHuddleStore.getState().enter({ conversationId: 'cv', huddleId: 'h1', conversationName: 'x', selfId: 'me' });
    useHuddleStore.getState().leave();
    // allow the async DB write to flush
    await Promise.resolve(); await Promise.resolve();
    expect(dbCalls.some(c => c.op === 'update' && c.vals.left_at)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/huddleStore.test.ts`
Expected: FAIL — no `update` call recorded (leave currently does not write DB).

- [ ] **Step 3: Update the store implementation**

In `src/store/huddleStore.ts`, add the import and module refs, and extend `enter`/`leave`:

```ts
import { supabase } from '@/integrations/supabase/client';
const db = supabase as unknown as { from: (t: string) => any };

// add beside `connection`/`remoteAudioEl`:
let selfIdRef: string | null = null;
let huddleIdRef: string | null = null;
```

In `enter`, after creating the connection, set the refs:

```ts
    selfIdRef = selfId;
    huddleIdRef = huddleId;
```

Replace `leave` with:

```ts
  leave: () => {
    connection?.close();
    connection = null;
    detachRemote();
    void markLeft(huddleIdRef, selfIdRef);
    selfIdRef = null;
    huddleIdRef = null;
    set({ active: null });
  },
```

Add this helper above `useHuddleStore`:

```ts
async function markLeft(huddleId: string | null, userId: string | null) {
  if (!huddleId || !userId) return;
  try {
    await db.from('chat_huddle_participants')
      .update({ left_at: new Date().toISOString(), is_connected: false })
      .eq('huddle_id', huddleId).eq('user_id', userId);
    // If no live participants remain, end the huddle.
    const { data: live } = await db.from('chat_huddle_participants')
      .select('id').eq('huddle_id', huddleId).is('left_at', null);
    if (!live || (live as unknown[]).length === 0) {
      await db.from('chat_huddles')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', huddleId);
    }
  } catch { /* best-effort */ }
}
```

Add a `beforeunload` best-effort leave once at module load (after the store is created):

```ts
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const a = useHuddleStore.getState().active;
    if (a) {
      // synchronous best-effort: stop tracks + fire the leave signal/DB write
      useHuddleStore.getState().leave();
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/huddleStore.test.ts`
Expected: PASS (all prior + new test).
> Note: the `new Date().toISOString()` call here is allowed (runtime app code, not a workflow script).

- [ ] **Step 5: Commit**

```bash
git add src/store/huddleStore.ts src/store/huddleStore.test.ts
git commit -m "feat(huddle): persist leave (mark participant left, end empty huddle) + beforeunload"
```

---

## Task 8: Start button + in-conversation HuddlePanel

**Files:**
- Create: `src/features/chat-v2/components/Huddle/HuddlePanel.tsx`
- Modify: `src/features/chat-v2/components/MessagePanel/MessagePanelHeader.tsx`
- Modify: the MessagePanel body component that renders `MessageList` (open it first to find the exact insertion point above the list).

**Interfaces:**
- Consumes: `useActiveHuddle`, `useHuddleActions` (Task 6), `useHuddleStore` (Task 5).
- `MessagePanelHeader` gains an optional prop `onStartHuddle?: () => void` and renders a headphone `IconButton` (chat-v2 local primitive) before the bell. The parent (ChatV2Shell / MessagePanel) wires `onStartHuddle` to `useHuddleActions().startOrJoin(conversation)` wrapped in a try/catch that shows an `@atlaskit/flag` on `HUDDLE_FULL` / mic-denied.

- [ ] **Step 1: Add a headphone icon + button to the header**

In `MessagePanelHeader.tsx`: add `onStartHuddle?: () => void;` and `huddleActive?: boolean;` to `MessagePanelHeaderProps`. Add a `HeadphonesIcon` — if `shared/Icon` lacks one, add it there (16px stroke icon, matching the existing icon style). Then render, as the first child of the right-side action group (before the bell `IconButton`):

```tsx
{onStartHuddle && (
  <IconButton
    label={huddleActive ? 'Join huddle' : 'Start huddle'}
    onClick={onStartHuddle}
    size="md"
    active={huddleActive}
  >
    <HeadphonesIcon size={16} />
  </IconButton>
)}
```

(If `huddleActive`, tint via the existing `active` prop; the green active-line on the sidebar + the panel below are the primary indicators.)

- [ ] **Step 2: Build the HuddlePanel**

```tsx
// src/features/chat-v2/components/Huddle/HuddlePanel.tsx
import React from 'react';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import { useActiveHuddle, useHuddleActions } from '@/hooks/chat/useHuddleData';
import { useHuddleStore } from '@/store/huddleStore';
import type { ChatConversation } from '@/types/chat';

/**
 * In-conversation huddle strip. Shows when the open conversation has an active
 * huddle: participant avatars, connection spinner while ICE negotiates, and a
 * Join (or Leave + mute) control. "Huddle full" disables Join at cap 2.
 */
export function HuddlePanel({ conversation }: { conversation: ChatConversation }) {
  const { huddle } = useActiveHuddle(conversation.id);
  const { startOrJoin } = useHuddleActions();
  const active = useHuddleStore((s) => s.active);
  const leave = useHuddleStore((s) => s.leave);
  const toggleMute = useHuddleStore((s) => s.toggleMute);

  if (!huddle) return null;

  const inThisHuddle = active?.conversationId === conversation.id;
  const connecting = inThisHuddle && active?.connectionState !== 'connected';

  return (
    <div
      role="region"
      aria-label="Huddle"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
        borderLeft: '3px solid var(--ds-border-success, #4BCE97)',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
        Huddle
      </span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {huddle.participants.map((p) => (
          <span key={p.userId} style={{ marginLeft: -4 }}>
            <Avatar size="small" />
          </span>
        ))}
      </div>
      {connecting && <Spinner size="small" />}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {inThisHuddle ? (
          <>
            <button type="button" onClick={toggleMute}
              style={btnStyle()}>
              {active?.micMuted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" onClick={leave}
              style={btnStyle('var(--ds-text-danger, #AE2A19)')}>
              Leave
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={huddle.isFull}
            onClick={() => { void startOrJoin(conversation); }}
            style={btnStyle()}
          >
            {huddle.isFull ? 'Huddle in progress (full)' : 'Join huddle'}
          </button>
        )}
      </div>
    </div>
  );
}

function btnStyle(color = 'var(--ds-text, #172B4D)'): React.CSSProperties {
  return {
    border: '1px solid var(--ds-border, #DFE1E6)',
    background: 'var(--ds-surface, #FFFFFF)',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 13,
    cursor: 'pointer',
    color,
  };
}
```

- [ ] **Step 3: Wire start button + panel into the MessagePanel**

Open the MessagePanel body component (the one rendering `MessageList`, found under `src/features/chat-v2/components/MessagePanel/`). Mount `<HuddlePanel conversation={conversation} />` directly above the message list. Wire the header: pass `onStartHuddle` and `huddleActive`:

```tsx
import { useActiveHuddleIds, useHuddleActions } from '@/hooks/chat/useHuddleData';
import { catalystToast } from '@/lib/catalystToast'; // or the chat-v2 flag pattern in use nearby
// ...
const activeHuddleIds = useActiveHuddleIds();
const { startOrJoin } = useHuddleActions();
const onStartHuddle = async () => {
  try { await startOrJoin(conversation); }
  catch (e) {
    const msg = e instanceof Error && e.message === 'HUDDLE_FULL'
      ? 'Huddle is full (2 people).'
      : 'Could not start the huddle — check microphone permission.';
    catalystToast.error?.(msg); // match the existing toast/flag util used in chat-v2
  }
};
// header:
<MessagePanelHeader ... onStartHuddle={() => { void onStartHuddle(); }} huddleActive={activeHuddleIds.has(conversation.id)} />
```

> Before writing the toast line, grep the MessagePanel neighborhood for the existing flag/toast utility (`@atlaskit/flag` usage or a `catalystToast`) and use whatever is already imported in chat-v2 — do not introduce a new toast lib.

- [ ] **Step 4: Typecheck + ADS audit**

Run: `npx tsc --noEmit` — expected clean for touched files.
Run: `node design-governance/cli/index.js audit src/features/chat-v2/components/Huddle/HuddlePanel.tsx`
Expected: 0 violations (uses `var(--ds-*)` tokens with fallbacks).

- [ ] **Step 5: Commit**

```bash
git add src/features/chat-v2/components/Huddle/HuddlePanel.tsx src/features/chat-v2/components/MessagePanel/MessagePanelHeader.tsx src/features/chat-v2/components/MessagePanel/<panel-body>.tsx src/features/chat-v2/components/shared/Icon.tsx
git commit -m "feat(huddle): start button + in-conversation huddle panel"
```

---

## Task 9: Green active-line in sidebar

**Files:**
- Modify: `src/features/chat-v2/components/Sidebar/Sidebar.tsx`
- Modify: `src/features/chat-v2/components/Sidebar/ConversationRow.tsx`
- Modify: `src/features/chat-v2/components/Sidebar/DmRichRow.tsx`
- Modify: `src/features/chat-v2/components/Sidebar/ChannelRow.tsx`

**Interfaces:**
- Consumes: `useActiveHuddleIds()` (Task 6).
- Each row component gains an optional `hasHuddle?: boolean` prop. When true, render a 3px green left rail + a small headphone glyph after the title.

- [ ] **Step 1: Add `hasHuddle` to each row**

In each of `ConversationRow.tsx`, `DmRichRow.tsx`, `ChannelRow.tsx`: add `hasHuddle?: boolean;` to props. On the row's root element add a conditional left border:

```tsx
style={{
  ...existingStyle,
  ...(hasHuddle ? { boxShadow: 'inset 3px 0 0 0 var(--ds-icon-success, #22A06B)' } : null),
}}
```

And after the title text, when `hasHuddle`, render a small headphone glyph:

```tsx
{hasHuddle && (
  <span aria-label="Active huddle" title="Active huddle"
    style={{ marginLeft: 6, color: 'var(--ds-icon-success, #22A06B)', display: 'inline-flex' }}>
    <HeadphonesIcon size={12} />
  </span>
)}
```

(Use the same `HeadphonesIcon` added in Task 8.)

- [ ] **Step 2: Feed `hasHuddle` from the Sidebar**

In `Sidebar.tsx`, call the hook once and pass down:

```tsx
import { useActiveHuddleIds } from '@/hooks/chat/useHuddleData';
// inside component:
const huddleIds = useActiveHuddleIds();
// where each row is rendered:
<ConversationRow ... hasHuddle={huddleIds.has(c.id)} />
// likewise for DmRichRow / ChannelRow
```

- [ ] **Step 3: Typecheck + ADS audit**

Run: `npx tsc --noEmit` — expected clean.
Run: `node design-governance/cli/index.js audit src/features/chat-v2/components/Sidebar/ConversationRow.tsx src/features/chat-v2/components/Sidebar/DmRichRow.tsx src/features/chat-v2/components/Sidebar/ChannelRow.tsx`
Expected: 0 new violations.

- [ ] **Step 4: Commit**

```bash
git add src/features/chat-v2/components/Sidebar/Sidebar.tsx src/features/chat-v2/components/Sidebar/ConversationRow.tsx src/features/chat-v2/components/Sidebar/DmRichRow.tsx src/features/chat-v2/components/Sidebar/ChannelRow.tsx
git commit -m "feat(huddle): green active-line indicator on sidebar conversations"
```

---

## Task 10: Persistent header strip + final verification

**Files:**
- Create: `src/components/layout/HuddleHeaderStrip.tsx`
- Modify: `src/components/layout/CatalystShell.tsx`

**Interfaces:**
- Consumes: `useHuddleStore` (active huddle), `useNavigate` (jump back to `/chat`).
- Mounts once at shell root; renders `null` when `active == null`; otherwise a fixed green bar below the 56px header.

- [ ] **Step 1: Build the strip**

```tsx
// src/components/layout/HuddleHeaderStrip.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import { useHuddleStore } from '@/store/huddleStore';

/**
 * Persistent call-strip docked below the global header. Visible on ANY route
 * while a huddle is active (the store lives at app-shell scope so the call
 * survives navigating away from /chat). Disappears only when the user leaves.
 */
export function HuddleHeaderStrip() {
  const active = useHuddleStore((s) => s.active);
  const leave = useHuddleStore((s) => s.leave);
  const toggleMute = useHuddleStore((s) => s.toggleMute);
  const navigate = useNavigate();

  if (!active) return null;

  const connecting = active.connectionState !== 'connected';

  return (
    <div
      role="region"
      aria-label="Active huddle"
      style={{
        position: 'fixed',
        top: 56,
        left: 0,
        right: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 40,
        padding: '0 16px',
        background: 'var(--ds-background-success, #DCFFF1)',
        borderBottom: '1px solid var(--ds-border-success, #4BCE97)',
      }}
    >
      <span style={{ display: 'inline-flex', width: 8, height: 8, borderRadius: '50%',
        background: 'var(--ds-icon-success, #22A06B)' }} aria-hidden />
      <button
        type="button"
        onClick={() => navigate('/chat')}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}
      >
        Huddle · {active.conversationName}
      </button>
      <Avatar size="xsmall" />
      {connecting && <Spinner size="small" />}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button type="button" onClick={toggleMute}
          style={stripBtn()}>
          {active.micMuted ? 'Unmute' : 'Mute'}
        </button>
        <button type="button" onClick={leave}
          style={stripBtn('var(--ds-text-danger, #AE2A19)')}>
          Leave
        </button>
      </div>
    </div>
  );
}

function stripBtn(color = 'var(--ds-text, #172B4D)'): React.CSSProperties {
  return {
    border: '1px solid var(--ds-border, #DFE1E6)',
    background: 'var(--ds-surface, #FFFFFF)',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 13,
    cursor: 'pointer',
    color,
  };
}
```

- [ ] **Step 2: Mount it in the shell**

In `src/components/layout/CatalystShell.tsx`, add the import near the other layout imports:

```tsx
import { HuddleHeaderStrip } from './HuddleHeaderStrip';
```

Render it once at the shell root — just inside the top-level return wrapper, as a sibling of the main flex row (it is `position: fixed`, so exact placement only needs to be within the authenticated shell tree). Place it immediately after the opening of the outermost shell container element:

```tsx
<HuddleHeaderStrip />
```

> The strip is `position: fixed; top: 56`. If a route's content starts at the very top under the header, that content already accounts for the 56px header; the 40px strip overlays the top of content while a call is live — acceptable (matches Slack). Do NOT add global padding shifts.

- [ ] **Step 3: ADS audit + typecheck**

Run: `node design-governance/cli/index.js audit src/components/layout/HuddleHeaderStrip.tsx`
Expected: 0 violations.
Run: `npx tsc --noEmit`
Expected: clean for touched files.

- [ ] **Step 4: Full unit suite for the feature**

Run: `npx vitest run src/lib/chat/huddle/ src/store/huddleStore.test.ts`
Expected: all PASS.

- [ ] **Step 5: Manual 2-browser verification (the real acceptance gate)**

Pre-req: migrations applied to **staging**, dev server on `http://localhost:8080`, two browser profiles signed in as two members of the same DM (and separately, a project channel).

Verify, observing DOM/behavior (not screenshots-for-function):
1. User A opens the DM → clicks headphone → mic permission prompt → grants → `active` set, strip appears, in-conversation panel shows A as participant. Green line appears on that DM in **both** A's and B's sidebars (realtime).
2. User B opens the DM → sees green line + "Join huddle" → clicks → **two-way audio is audible** both directions.
3. Channel with a 3rd member C: after A+B are in, C sees "Huddle in progress (full)" disabled.
4. A navigates to `/project-hub/...` (leaves `/chat`) → **strip stays in header**, audio continues.
5. A clicks Mute on the strip → B stops hearing A; Unmute restores.
6. A clicks Leave → strip disappears for A, audio stops; B's panel updates; when B also leaves, the green line clears everywhere (huddle `status='ended'`).
7. Refresh A's tab mid-call → A drops cleanly (participant `left_at` set via beforeunload), B sees the change.

- [ ] **Step 6: Commit + promote**

```bash
git add src/components/layout/HuddleHeaderStrip.tsx src/components/layout/CatalystShell.tsx
git commit -m "feat(huddle): persistent header call-strip surviving route changes"
```

After staging verification passes, promote the Task 1 migration to **prod** (`lmqwtldpfacrrlvdnmld`) via `apply_migration`, then re-run the 2-user RLS isolation check against prod.

---

## Self-Review

**Spec coverage:**
- Real WebRTC audio, 2-person P2P → Tasks 2,3,4 (ICE, signaling, HuddleConnection). ✓
- STUN-only + env TURN slot → Task 2. ✓
- 2 tables + helper-based RLS + 2-user isolation test → Task 1. ✓
- Realtime green-line fan-out → Task 6 (`useActiveHuddleIds` + subscription). ✓
- Global store persisting across routes → Task 5. ✓
- Start button → Task 8; green line → Task 9; in-conv panel → Task 8; persistent strip → Task 10. ✓
- Leave / both-gone-ends / mic-denied / full / beforeunload → Tasks 6,7,8. ✓
- Staging-first → Task 1 + Task 10 Step 6. ✓
- Audio only, no video → enforced in HuddleConnection (`getUserMedia({audio:true})`, no video tracks). ✓

**Placeholder scan:** the `<panel-body>.tsx` in Task 8 is the only unresolved path — intentionally, because the exact MessagePanel body filename must be confirmed by opening the directory at implementation time. Flagged in the task. The toast utility line in Task 8 explicitly instructs grepping the local pattern. No other placeholders.

**Type consistency:** `enter()` args, `ActiveHuddle` fields, `HuddleSignal` kinds, `useActiveHuddle` return shape (`{ id, participants:{userId}[], isFull }`) used consistently across Tasks 5–10. `HUDDLE_CAP=2` defined once in Task 6.
