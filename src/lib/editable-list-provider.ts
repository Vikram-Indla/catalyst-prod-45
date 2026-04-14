/**
 * Editable List Data Provider — localStorage-backed, no external APIs.
 * Supports Products + Raw Materials line items with clone/prefill behavior.
 * Mirrors the SubtasksDataProvider pattern from subtasks-provider.ts
 *
 * BAU-5364 spec:
 * - Priority selection: 2024 first, then 2023, approved-only
 * - Clone into new client IDs, no linkage to old request
 * - Audit logging of clone source + timestamp + actor=System
 */

// ── Types ──

export type LineItemKind = 'product' | 'rawMaterial';

export interface LineItem {
  clientId: string;
  kind: LineItemKind;
  name: string;
  quantity?: number;
  unit?: string;
  description?: string;
  sourceRequestId?: string;
  sourceLineItemId?: string;
  isPrefilled: boolean;
  isNew: boolean;
  isDirty: boolean;
  isDeleted: boolean;
}

export type RequestStatus = 'Draft' | 'Approved' | 'Returned' | 'Rejected';

export interface ScanningRequest {
  id: string;
  year: number;
  status: RequestStatus;
  title: string;
  createdAt: string;
  products: Omit<LineItem, 'clientId' | 'isPrefilled' | 'isNew' | 'isDirty' | 'isDeleted'>[];
  rawMaterials: Omit<LineItem, 'clientId' | 'isPrefilled' | 'isNew' | 'isDirty' | 'isDeleted'>[];
}

export interface CloneAuditEntry {
  id: string;
  sourceRequestId: string;
  targetYear: number;
  timestamp: string;
  actor: 'System';
  productsCopied: number;
  rawMaterialsCopied: number;
}

export type PrefillStatus = 'idle' | 'loading' | 'cloned' | 'no-source' | 'error';

export interface PrefillResult {
  status: PrefillStatus;
  sourceRequestId: string | null;
  sourceYear: number | null;
  products: LineItem[];
  rawMaterials: LineItem[];
}

// ── Constants ──

const REQUESTS_STORE_KEY = 'bau.scanning-requests.v1';
const LINE_ITEMS_STORE_KEY = 'bau.line-items.v1';
const AUDIT_LOG_KEY = 'bau.clone-audit-log.v1';

const UNITS = ['kg', 'tons', 'liters', 'units', 'meters', 'pieces', 'barrels'];

// ── Helpers ──

function generateId(): string {
  return crypto.randomUUID();
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function simLatency() { return delay(150 + Math.random() * 150); }

// ── localStorage helpers ──

function loadRequests(): ScanningRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRequests(items: ScanningRequest[]) {
  localStorage.setItem(REQUESTS_STORE_KEY, JSON.stringify(items));
}

function loadLineItems(): LineItem[] {
  try {
    const raw = localStorage.getItem(LINE_ITEMS_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLineItems(items: LineItem[]) {
  localStorage.setItem(LINE_ITEMS_STORE_KEY, JSON.stringify(items));
}

function loadAuditLog(): CloneAuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAuditLog(entries: CloneAuditEntry[]) {
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(entries));
}

// ── Seed data (Saudi context) ──

function seedIfEmpty() {
  const store = loadRequests();
  if (store.length > 0) return;

  const seeds: ScanningRequest[] = [
    {
      id: 'req-2023-001',
      year: 2023,
      status: 'Approved',
      title: '2023 Industrial Scanning Request',
      createdAt: '2023-06-15T08:00:00.000Z',
      products: [
        { kind: 'product', name: 'Steel Rebar Grade 60', quantity: 5000, unit: 'tons', description: 'Structural reinforcement' },
        { kind: 'product', name: 'Portland Cement Type I', quantity: 12000, unit: 'tons', description: 'General construction' },
        { kind: 'product', name: 'Aluminum Sheets 6061-T6', quantity: 800, unit: 'tons', description: 'Industrial cladding' },
      ],
      rawMaterials: [
        { kind: 'rawMaterial', name: 'Iron Ore (Fe 62%)', quantity: 25000, unit: 'tons', description: 'Primary feedstock' },
        { kind: 'rawMaterial', name: 'Limestoneite', quantity: 15000, unit: 'tons', description: 'Cement production' },
        { kind: 'rawMaterial', name: 'Bauxite Ore', quantity: 3000, unit: 'tons', description: 'Aluminum smelting' },
      ],
    },
    {
      id: 'req-2024-001',
      year: 2024,
      status: 'Approved',
      title: '2024 Industrial Scanning Request',
      createdAt: '2024-03-10T08:00:00.000Z',
      products: [
        { kind: 'product', name: 'Steel Rebar Grade 60', quantity: 6500, unit: 'tons', description: 'Structural reinforcement — expanded' },
        { kind: 'product', name: 'Portland Cement Type I', quantity: 14000, unit: 'tons', description: 'General construction' },
        { kind: 'product', name: 'Aluminum Sheets 6061-T6', quantity: 1200, unit: 'tons', description: 'Industrial cladding' },
        { kind: 'product', name: 'Copper Wire Rod 8mm', quantity: 2000, unit: 'tons', description: 'Electrical infrastructure' },
        { kind: 'product', name: 'PVC Pipes DN200', quantity: 50000, unit: 'meters', description: 'Water distribution network' },
      ],
      rawMaterials: [
        { kind: 'rawMaterial', name: 'Iron Ore (Fe 62%)', quantity: 30000, unit: 'tons', description: 'Primary feedstock' },
        { kind: 'rawMaterial', name: 'Limestone', quantity: 18000, unit: 'tons', description: 'Cement production' },
        { kind: 'rawMaterial', name: 'Bauxite Ore', quantity: 4500, unit: 'tons', description: 'Aluminum smelting' },
        { kind: 'rawMaterial', name: 'Copper Concentrate', quantity: 8000, unit: 'tons', description: 'Copper refining' },
        { kind: 'rawMaterial', name: 'Silica Sand (SiO2 99%)', quantity: 6000, unit: 'tons', description: 'Glass & chemical' },
        { kind: 'rawMaterial', name: 'Gypsum', quantity: 5000, unit: 'tons', description: 'Cement additive' },
      ],
    },
    {
      id: 'req-2024-002',
      year: 2024,
      status: 'Draft',
      title: '2024 Industrial Scanning Request (Draft)',
      createdAt: '2024-05-20T08:00:00.000Z',
      products: [],
      rawMaterials: [],
    },
    {
      id: 'req-2023-002',
      year: 2023,
      status: 'Rejected',
      title: '2023 Industrial Scanning Request (Rejected)',
      createdAt: '2023-09-01T08:00:00.000Z',
      products: [
        { kind: 'product', name: 'Rejected Product A', quantity: 100, unit: 'tons' },
      ],
      rawMaterials: [],
    },
  ];
  saveRequests(seeds);
}

// ── Provider interface ──

export interface EditableListDataProvider {
  /** Find the latest approved scanning request for a given year */
  findLatestApprovedRequest(year: number): Promise<ScanningRequest | null>;

  /** Fetch line items (products + raw materials) for a request */
  fetchRequestLineItems(requestId: string): Promise<{
    products: ScanningRequest['products'];
    rawMaterials: ScanningRequest['rawMaterials'];
  }>;

  /** Log a clone event for audit */
  logCloneEvent(entry: Omit<CloneAuditEntry, 'id'>): Promise<void>;

  /** Get all audit log entries */
  getAuditLog(): Promise<CloneAuditEntry[]>;

  /** Save working line items (current session) */
  saveWorkingItems(items: LineItem[]): Promise<void>;

  /** Load working line items (current session) */
  loadWorkingItems(): Promise<LineItem[]>;
}

// ── Provider implementation ──

export class LocalStorageListProvider implements EditableListDataProvider {
  constructor() { seedIfEmpty(); }

  async findLatestApprovedRequest(year: number): Promise<ScanningRequest | null> {
    await simLatency();
    const requests = loadRequests();
    const approved = requests
      .filter(r => r.year === year && r.status === 'Approved')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return approved[0] ?? null;
  }

  async fetchRequestLineItems(requestId: string): Promise<{
    products: ScanningRequest['products'];
    rawMaterials: ScanningRequest['rawMaterials'];
  }> {
    await simLatency();
    const requests = loadRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return { products: [], rawMaterials: [] };
    return { products: req.products, rawMaterials: req.rawMaterials };
  }

  async logCloneEvent(entry: Omit<CloneAuditEntry, 'id'>): Promise<void> {
    await simLatency();
    const log = loadAuditLog();
    log.push({ ...entry, id: generateId() });
    saveAuditLog(log);
  }

  async getAuditLog(): Promise<CloneAuditEntry[]> {
    return loadAuditLog();
  }

  async saveWorkingItems(items: LineItem[]): Promise<void> {
    saveLineItems(items);
  }

  async loadWorkingItems(): Promise<LineItem[]> {
    return loadLineItems();
  }
}

// ── Helper: create a blank line item ──

export function createBlankLineItem(kind: LineItemKind): LineItem {
  return {
    clientId: generateId(),
    kind,
    name: '',
    quantity: undefined,
    unit: undefined,
    description: undefined,
    isPrefilled: false,
    isNew: true,
    isDirty: true,
    isDeleted: false,
  };
}

// ── Helper: clone source items into new LineItem[] ──

export function cloneToLineItems(
  sourceItems: ScanningRequest['products'] | ScanningRequest['rawMaterials'],
  kind: LineItemKind,
  sourceRequestId: string,
): LineItem[] {
  return sourceItems.map(item => ({
    clientId: generateId(),
    kind,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    description: item.description,
    sourceRequestId,
    sourceLineItemId: undefined,
    isPrefilled: true,
    isNew: true,
    isDirty: false,
    isDeleted: false,
  }));
}

export { UNITS };
