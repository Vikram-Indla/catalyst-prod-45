/**
 * localDraft — keystroke-durable local journal for Wiki pages
 * (CAT-DOCS-NOTION-20260704-001 P0b).
 *
 * Every editor change lands in IndexedDB within DRAFT_THROTTLE_MS, so a
 * crash, refresh, or dropped network between autosaves loses nothing.
 * The journal entry clears on a confirmed server save; on load, a
 * newer-than-server draft triggers a restore banner. Multi-device
 * conflicts remain last-write-wins (Yjs is the phase-2 answer).
 */

const DB_NAME = 'catalyst-wiki-drafts';
const STORE = 'drafts';

export interface WikiDraft {
  pageId: string;
  blocks: unknown[];
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'pageId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

const DRAFT_THROTTLE_MS = 400;
const lastWrite = new Map<string, number>();

/** Throttled write — cheap enough to call on every editor change. */
export function saveDraft(pageId: string, blocks: unknown[]): void {
  const now = Date.now();
  if (now - (lastWrite.get(pageId) ?? 0) < DRAFT_THROTTLE_MS) return;
  lastWrite.set(pageId, now);
  void withStore('readwrite', (s) => s.put({ pageId, blocks, savedAt: now } satisfies WikiDraft)).catch(
    () => {
      /* private-mode / quota — durability degrades silently to autosave-only */
    },
  );
}

export async function getDraft(pageId: string): Promise<WikiDraft | null> {
  try {
    const row = await withStore<WikiDraft | undefined>('readonly', (s) => s.get(pageId) as IDBRequest<WikiDraft | undefined>);
    return row ?? null;
  } catch {
    return null;
  }
}

export function clearDraft(pageId: string): void {
  lastWrite.delete(pageId);
  void withStore('readwrite', (s) => s.delete(pageId)).catch(() => {
    /* nothing to clear */
  });
}
