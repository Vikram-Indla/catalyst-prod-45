/**
 * SupabaseYjsProvider — Yjs transport over Supabase Realtime broadcast
 * (CAT-DOCEX-DB-COEDIT-20260705-001 C1/C4). No relay server: clients
 * exchange binary Y.Doc updates (base64) on channel `docex-collab:{key}`;
 * awareness (cursors/selection) piggybacks on the same channel. On join, a
 * `y-hello` carrying the local state vector lets existing peers reply with
 * exactly the missing diff, so late joiners converge without a server
 * snapshot. y-indexeddb gives the doc a local, durable log — edits made
 * offline (or before the DB hydration read resolves) survive a reload/tab
 * crash, and rejoin naturally resyncs via the same y-hello handshake.
 */
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import { supabase } from '@/integrations/supabase/client';

function u8ToB64(u8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

function b64ToU8(b64: string): Uint8Array {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

export class SupabaseYjsProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  private channel: ReturnType<typeof supabase.channel>;
  private readonly local: IndexeddbPersistence;
  private connected = false;
  private destroyed = false;

  constructor(collabKey: string) {
    this.doc = new Y.Doc();
    this.awareness = new Awareness(this.doc);
    // Local durability first: edits made while offline, or in the window
    // before the DB hydration read resolves, are never lost to a reload or
    // tab crash. Applying an already-known op again is a no-op under Yjs's
    // CRDT semantics, so layering this under the DB-authoritative hydration
    // in WikiPageSurface is safe either order.
    this.local = new IndexeddbPersistence(`docex-collab:${collabKey}`, this.doc);
    this.channel = supabase.channel(`docex-collab:${collabKey}`);

    // Remote → local
    this.channel.on('broadcast', { event: 'y-update' }, ({ payload }) => {
      if (payload?.u) Y.applyUpdate(this.doc, b64ToU8(payload.u as string), 'remote');
    });
    this.channel.on('broadcast', { event: 'y-awareness' }, ({ payload }) => {
      if (payload?.u) applyAwarenessUpdate(this.awareness, b64ToU8(payload.u as string), 'remote');
    });
    // Late-join sync: a peer announces its state vector; we answer with the
    // diff it is missing (every peer answers — Yjs updates are idempotent).
    this.channel.on('broadcast', { event: 'y-hello' }, ({ payload }) => {
      if (!payload?.sv || !this.connected) return;
      const diff = Y.encodeStateAsUpdate(this.doc, b64ToU8(payload.sv as string));
      if (diff.length > 2) {
        void this.channel.send({ type: 'broadcast', event: 'y-update', payload: { u: u8ToB64(diff) } });
      }
    });

    // Local → remote
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || !this.connected || this.destroyed) return;
      void this.channel.send({ type: 'broadcast', event: 'y-update', payload: { u: u8ToB64(update) } });
    });
    this.awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      if (!this.connected || this.destroyed) return;
      const changed = [...added, ...updated, ...removed];
      void this.channel.send({
        type: 'broadcast',
        event: 'y-awareness',
        payload: { u: u8ToB64(encodeAwarenessUpdate(this.awareness, changed)) },
      });
    });

    this.channel.subscribe((status) => {
      if (this.destroyed) return;
      if (status === 'SUBSCRIBED') {
        this.connected = true;
        // Reconnect (network drop, tab background-throttled, etc.) rejoins
        // the SAME handshake a fresh join uses: announce our state vector so
        // any peer who kept editing while we were gone can send the diff.
        void this.channel.send({
          type: 'broadcast',
          event: 'y-hello',
          payload: { sv: u8ToB64(Y.encodeStateVector(this.doc)) },
        });
      } else {
        // CLOSED / TIMED_OUT / CHANNEL_ERROR: stop attempting sends until a
        // fresh SUBSCRIBED arrives. Local edits keep flowing into the
        // Yjs doc (and y-indexeddb) — nothing is lost, just not broadcast
        // until reconnected.
        this.connected = false;
      }
    });
  }

  /** The shared fragment BlockNote binds to. */
  get fragment(): Y.XmlFragment {
    return this.doc.getXmlFragment('blocknote');
  }

  destroy() {
    this.destroyed = true;
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'destroy');
    void this.channel.unsubscribe();
    void this.local.destroy();
    this.doc.destroy();
  }
}

/** Deterministic cursor color from a user id (no DB round-trip). */
export function collabColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash << 5) - hash + userId.charCodeAt(i);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`; /* ads-scanner:ignore-line — collab cursor identity color, derived not designed */
}
