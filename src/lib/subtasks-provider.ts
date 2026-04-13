/**
 * Subtasks Data Provider — localStorage-backed, no Jira API.
 * Full CRUD with simulated latency, key generation, and seed data.
 */

// ── Types ──

export type IssueKey = string;

export interface IssueType {
  id: string;
  name: string;
  icon?: string;
}

export interface SubtaskStatus {
  id: string;
  name: string;
  category: 'todo' | 'in_progress' | 'done';
}

export interface SubtaskUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Subtask {
  id: string;
  key: IssueKey;
  parentKey: IssueKey;
  summary: string;
  issueType: IssueType;
  assignee: SubtaskUser | null;
  status: SubtaskStatus;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubtaskInput {
  parentKey: IssueKey;
  summary: string;
  issueTypeId?: string;
  assigneeId?: string | null;
}

export type UpdateSubtaskPatch = Partial<Pick<Subtask, 'summary' | 'assignee' | 'status' | 'updatedAt'>>;

// ── Column system ──

export type SubtasksColumnId = 'type' | 'key' | 'summary' | 'assignee' | 'status' | 'priority' | 'created' | 'updated';

// ── Provider interface ──

export interface SubtasksDataProvider {
  listSubtasks(parentKey: IssueKey): Promise<Subtask[]>;
  createSubtask(input: CreateSubtaskInput): Promise<Subtask>;
  updateSubtask(subtaskId: string, patch: UpdateSubtaskPatch): Promise<Subtask>;
  deleteSubtask(subtaskId: string): Promise<void>;
}

// ── Constants ──

const STORE_KEY = 'bau.subtasks.store.v1';
const COLUMNS_KEY = 'subtasks.columns.visible.v1';

const DEFAULT_ISSUE_TYPE: IssueType = { id: 'subtask', name: 'Sub-task', icon: 'subtask' };

const DEFAULT_STATUSES: SubtaskStatus[] = [
  { id: 'backlog', name: 'BACKLOG', category: 'todo' },
  { id: 'todo', name: 'TO DO', category: 'todo' },
  { id: 'in-progress', name: 'IN PROGRESS', category: 'in_progress' },
  { id: 'in-review', name: 'IN REVIEW', category: 'in_progress' },
  { id: 'done', name: 'DONE', category: 'done' },
];

const SAMPLE_USERS: SubtaskUser[] = [
  { id: 'u1', name: 'Imran Ahmed' },
  { id: 'u2', name: 'Muhammad Raza' },
  { id: 'u3', name: 'Fatima Al-Harbi' },
];

// ── Helpers ──

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function simLatency() { return delay(200 + Math.random() * 200); }

function loadStore(): Subtask[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveStore(items: Subtask[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

function nextKey(parentKey: string, existing: Subtask[]): string {
  const siblings = existing.filter(s => s.parentKey === parentKey);
  const maxNum = siblings.reduce((max, s) => {
    const m = s.key.match(/-ST(\d+)$/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `${parentKey}-ST${maxNum + 1}`;
}

// ── Seed data ──

function seedIfEmpty() {
  const store = loadStore();
  if (store.length > 0) return;

  const now = new Date().toISOString();
  const seeds: Subtask[] = [
    {
      id: 'seed-1',
      key: 'BAU-5335-ST1',
      parentKey: 'BAU-5335',
      summary: 'NDS - Iron & Cement',
      issueType: DEFAULT_ISSUE_TYPE,
      assignee: SAMPLE_USERS[0],
      status: DEFAULT_STATUSES[4], // DONE
      priority: 'Medium',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: now,
    },
    {
      id: 'seed-2',
      key: 'BAU-5335-ST2',
      parentKey: 'BAU-5335',
      summary: 'NDS - Iron & Cement',
      issueType: DEFAULT_ISSUE_TYPE,
      assignee: SAMPLE_USERS[1],
      status: DEFAULT_STATUSES[4], // DONE
      priority: 'Medium',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: now,
    },
    {
      id: 'seed-3',
      key: 'BAU-5335-ST3',
      parentKey: 'BAU-5335',
      summary: 'NDS - Iron & Cement',
      issueType: { id: 'task', name: 'Task', icon: 'task' },
      assignee: null,
      status: DEFAULT_STATUSES[0], // BACKLOG
      priority: 'Medium',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: now,
    },
  ];
  saveStore(seeds);
}

// ── Provider implementation ──

export class LocalStorageBackedProvider implements SubtasksDataProvider {
  constructor() { seedIfEmpty(); }

  async listSubtasks(parentKey: IssueKey): Promise<Subtask[]> {
    await simLatency();
    return loadStore()
      .filter(s => s.parentKey === parentKey)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createSubtask(input: CreateSubtaskInput): Promise<Subtask> {
    await simLatency();
    const store = loadStore();
    const now = new Date().toISOString();
    const subtask: Subtask = {
      id: crypto.randomUUID(),
      key: nextKey(input.parentKey, store),
      parentKey: input.parentKey,
      summary: input.summary,
      issueType: DEFAULT_ISSUE_TYPE,
      assignee: input.assigneeId ? SAMPLE_USERS.find(u => u.id === input.assigneeId) ?? null : null,
      status: DEFAULT_STATUSES[1], // TO DO
      priority: 'Medium',
      createdAt: now,
      updatedAt: now,
    };
    store.push(subtask);
    saveStore(store);
    return subtask;
  }

  async updateSubtask(subtaskId: string, patch: UpdateSubtaskPatch): Promise<Subtask> {
    await simLatency();
    const store = loadStore();
    const idx = store.findIndex(s => s.id === subtaskId);
    if (idx === -1) throw new Error('Subtask not found');
    store[idx] = { ...store[idx], ...patch, updatedAt: new Date().toISOString() };
    saveStore(store);
    return store[idx];
  }

  async deleteSubtask(subtaskId: string): Promise<void> {
    await simLatency();
    const store = loadStore().filter(s => s.id !== subtaskId);
    saveStore(store);
  }
}

// ── Column visibility persistence ──

const DEFAULT_VISIBLE: SubtasksColumnId[] = ['key', 'summary', 'priority', 'assignee', 'status'];

export function loadVisibleColumns(): SubtasksColumnId[] {
  try {
    const raw = localStorage.getItem(COLUMNS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_VISIBLE;
}

export function saveVisibleColumns(cols: SubtasksColumnId[]) {
  localStorage.setItem(COLUMNS_KEY, JSON.stringify(cols));
}

export { DEFAULT_STATUSES, DEFAULT_ISSUE_TYPE, SAMPLE_USERS };
