/**
 * EditableListClonePanel — Jira subtask-style editable list with clone/prefill
 *
 * Renders two collapsible sections:
 *   1. Products (line items)
 *   2. Raw Materials (line items)
 *
 * Each section has:
 *   - Progress indicator (items count)
 *   - Inline-editable table (EditableLineItemsTable)
 *   - Add (+) button
 *   - Clone/prefill banner when data comes from a previous request
 *
 * BAU-5364 clone behavior:
 *   - On mount, runs usePrefillFromLatestApproved (2024 -> 2023 priority)
 *   - Cloned items appear immediately editable
 *   - Audit log recorded automatically
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Package, Layers,
  AlertCircle, Loader2, Info, RefreshCw, FileText,
} from 'lucide-react';
import type { LineItem, LineItemKind } from '@/lib/editable-list-provider';
import {
  LocalStorageListProvider,
  createBlankLineItem,
} from '@/lib/editable-list-provider';
import { usePrefillFromLatestApproved } from '@/hooks/usePrefillFromLatestApproved';
import { EditableLineItemsTable } from './EditableLineItemsTable';
import './EditableListClonePanel.css';

// ── Provider singleton ──

const provider = new LocalStorageListProvider();

// ── Section wrapper ──

interface LineItemsSectionProps {
  kind: LineItemKind;
  items: LineItem[];
  onAddRow: () => void;
  onUpdateRow: (clientId: string, patch: Partial<LineItem>) => void;
  onRemoveRow: (clientId: string) => void;
  defaultExpanded?: boolean;
}

function LineItemsSection({
  kind,
  items,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  defaultExpanded = true,
}: LineItemsSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const visibleCount = items.filter(i => !i.isDeleted).length;
  const prefilledCount = items.filter(i => i.isPrefilled && !i.isDeleted).length;
  const label = kind === 'product' ? 'Products' : 'Raw Materials';
  const Icon = kind === 'product' ? Package : Layers;

  return (
    <div className="elc-section">
      {/* Header */}
      <div className="elc-section-head" onClick={() => setExpanded(e => !e)}>
        <span className="elc-section-label">
          {expanded
            ? <ChevronDown style={{ width: 16, height: 16 }} />
            : <ChevronRight style={{ width: 16, height: 16 }} />
          }
          <Icon size={14} className="elc-section-icon" />
          {label}
          <span className="elc-count">{visibleCount}</span>
          {prefilledCount > 0 && (
            <span className="elc-prefilled-badge" title={`${prefilledCount} cloned from source`}>
              {prefilledCount} cloned
            </span>
          )}
        </span>
        <div className="elc-section-actions" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="elc-icon-btn"
            title={`Add ${kind === 'product' ? 'product' : 'raw material'}`}
            onClick={onAddRow}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="elc-section-body">
          <EditableLineItemsTable
            items={items}
            kind={kind}
            onAddRow={onAddRow}
            onUpdateRow={onUpdateRow}
            onRemoveRow={onRemoveRow}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

interface EditableListClonePanelProps {
  parentKey: string;
}

export function EditableListClonePanel({ parentKey }: EditableListClonePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [products, setProducts] = useState<LineItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<LineItem[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Prefill from latest approved request
  const prefill = usePrefillFromLatestApproved({
    targetYear: 2026,
    requestType: 'industrial-scanning',
    enabled: true,
    provider,
  });

  // Apply prefilled data when clone completes
  useEffect(() => {
    if (prefill.status === 'cloned') {
      setProducts(prefill.products);
      setRawMaterials(prefill.rawMaterials);
    }
  }, [prefill.status, prefill.products, prefill.rawMaterials]);

  // ── Product CRUD ──

  const addProduct = useCallback(() => {
    setProducts(prev => [...prev, createBlankLineItem('product')]);
  }, []);

  const updateProduct = useCallback((clientId: string, patch: Partial<LineItem>) => {
    setProducts(prev => prev.map(p =>
      p.clientId === clientId ? { ...p, ...patch } : p
    ));
  }, []);

  const removeProduct = useCallback((clientId: string) => {
    setProducts(prev => prev.map(p =>
      p.clientId === clientId ? { ...p, isDeleted: true } : p
    ));
  }, []);

  // ── Raw Material CRUD ──

  const addRawMaterial = useCallback(() => {
    setRawMaterials(prev => [...prev, createBlankLineItem('rawMaterial')]);
  }, []);

  const updateRawMaterial = useCallback((clientId: string, patch: Partial<LineItem>) => {
    setRawMaterials(prev => prev.map(r =>
      r.clientId === clientId ? { ...r, ...patch } : r
    ));
  }, []);

  const removeRawMaterial = useCallback((clientId: string) => {
    setRawMaterials(prev => prev.map(r =>
      r.clientId === clientId ? { ...r, isDeleted: true } : r
    ));
  }, []);

  // ── Stats ──

  const totalProducts = products.filter(p => !p.isDeleted).length;
  const totalRawMaterials = rawMaterials.filter(r => !r.isDeleted).length;
  const totalItems = totalProducts + totalRawMaterials;

  return (
    <div className="awSection elc-panel">
      {/* ── Panel Header ── */}
      <div className="awSectionHead" onClick={() => setCollapsed(c => !c)}>
        <span className="awSectionLabel">
          {collapsed
            ? <ChevronRight style={{ width: 16, height: 16 }} />
            : <ChevronDown style={{ width: 16, height: 16 }} />
          }
          Line Items
          <span className="awCount">{totalItems}</span>
        </span>
        <div className="awSectionActions" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="awPill stIconBtn"
            title="Audit log"
            onClick={() => setShowAuditLog(o => !o)}
          >
            <FileText style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="awSectionBody">
          {/* ── Status Banner ── */}
          {prefill.status === 'loading' && (
            <div className="elc-banner elc-banner--loading">
              <Loader2 size={14} className="animate-spin" />
              <span>Checking for approved scanning requests to clone from...</span>
            </div>
          )}

          {prefill.status === 'cloned' && (
            <div className="elc-banner elc-banner--success">
              <Info size={14} />
              <span>
                Prefilled from <strong>{prefill.sourceYear}</strong> approved request
                <span className="elc-banner-id">({prefill.sourceRequestId})</span>
                &mdash; {totalProducts} products, {totalRawMaterials} raw materials cloned.
                All rows are editable.
              </span>
            </div>
          )}

          {prefill.status === 'no-source' && (
            <div className="elc-banner elc-banner--info">
              <AlertCircle size={14} />
              <span>No approved 2024/2023 scanning request found. Start from scratch.</span>
            </div>
          )}

          {prefill.status === 'error' && (
            <div className="elc-banner elc-banner--error">
              <AlertCircle size={14} />
              <span>Failed to load source request.</span>
              <button type="button" className="elc-retry-btn" onClick={prefill.retry}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {/* ── Audit Log (collapsible) ── */}
          {showAuditLog && (
            <AuditLogPanel />
          )}

          {/* ── Products Section ── */}
          <LineItemsSection
            kind="product"
            items={products}
            onAddRow={addProduct}
            onUpdateRow={updateProduct}
            onRemoveRow={removeProduct}
          />

          {/* ── Raw Materials Section ── */}
          <LineItemsSection
            kind="rawMaterial"
            items={rawMaterials}
            onAddRow={addRawMaterial}
            onUpdateRow={updateRawMaterial}
            onRemoveRow={removeRawMaterial}
          />
        </div>
      )}
    </div>
  );
}

// ── Audit Log Sub-panel ──

function AuditLogPanel() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const log = await provider.getAuditLog();
        setEntries(log);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="elc-audit">
      <div className="elc-audit-title">Clone Audit Log</div>
      {loading ? (
        <div className="elc-audit-loading"><Loader2 size={14} className="animate-spin" /> Loading...</div>
      ) : entries.length === 0 ? (
        <div className="elc-audit-empty">No clone events recorded</div>
      ) : (
        <table className="elc-audit-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Year</th>
              <th>Products</th>
              <th>Raw Materials</th>
              <th>Actor</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td><code>{entry.sourceRequestId}</code></td>
                <td>{entry.targetYear}</td>
                <td>{entry.productsCopied}</td>
                <td>{entry.rawMaterialsCopied}</td>
                <td>{entry.actor}</td>
                <td>{new Date(entry.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
