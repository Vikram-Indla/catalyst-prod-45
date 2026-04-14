/**
 * LinkedItemsSection — Jira-parity linked work items feature.
 *
 * FR compliance:
 *   - FR-1/2/3: Source/target/direction/server-driven
 *   - FR-19: Link disabled until both selected
 *   - FR-20: Self excluded from picker
 *   - FR-21: Client-side duplicate prevention
 *   - FR-22: Success toast + refetch
 *   - FR-23: Permission error handling (403)
 *   - FR-24: Transient error retry
 *   - FR-25–27: Full link list with direction labels
 *   - FR-28: Restricted placeholder for inaccessible items
 *   - FR-29–32: Unlink with confirmation, retry, 404 resilience
 *   - FR-38: Double-submit prevention
 *   - FR-44: Focus management
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, X, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { StatusLozenge } from './StatusLozenge';
import { LinkTypeDropdown } from './LinkTypeDropdown';
import { WorkItemPicker } from './WorkItemPicker';
import {
  useLinksForItem,
  useCreateWorkItemLink,
  useDeleteWorkItemLink,
} from '@/hooks/useLinkedWorkItems';
import type { LinkTypeOption, LinkedItemDisplay } from '@/services/linkedWorkItemsService';

// ─── Props ────────────────────────────────────────────────

interface LinkedItemsSectionProps {
  /** UUID or issue_key of the current work item */
  itemId: string;
  /** Project ID for context */
  projectId: string;
  /** Navigate to a linked item */
  onNavigate?: (id: string) => void;
  /** Callback to open Create Linked Work Item modal */
  onCreateLinkedItem?: () => void;
}

// ─── Link direction label mapping for inverse display ─────
const INVERSE_LABELS: Record<string, string> = {
  'blocks': 'is blocked by',
  'is blocked by': 'blocks',
  'clones': 'is cloned by',
  'is cloned by': 'clones',
  'duplicates': 'is duplicated by',
  'is duplicated by': 'duplicates',
  'causes': 'is caused by',
  'is caused by': 'causes',
  'split to': 'is split from',
  'is split from': 'split to',
  'is parent of': 'is child of',
  'is child of': 'is parent of',
  'implements': 'is implemented by',
  'is implemented by': 'implements',
  'BRD': 'is BRD of',
  'is BRD of': 'BRD',
  'relates to': 'relates to',
};

// ─── Component ────────────────────────────────────────────

export function LinkedItemsSection({
  itemId,
  projectId,
  onNavigate,
  onCreateLinkedItem,
}: LinkedItemsSectionProps) {
  const [showAddRow, setShowAddRow] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const addLinkTriggerRef = useRef<HTMLButtonElement>(null);

  const { data: links = [], isLoading: linksLoading } = useLinksForItem(itemId);
  const deleteMutation = useDeleteWorkItemLink(itemId);

  // Group links by display label
  const grouped = useMemo(() => {
    const map = new Map<string, LinkedItemDisplay[]>();
    for (const link of links) {
      let displayLabel = link.linkType;
      if (link.direction === 'inward') {
        displayLabel = INVERSE_LABELS[link.linkType] || link.linkType;
      }
      const arr = map.get(displayLabel) || [];
      arr.push(link);
      map.set(displayLabel, arr);
    }
    return [...map.entries()];
  }, [links]);

  // IDs already linked — used to exclude from picker (FR-13)
  const linkedIds = useMemo(() => links.map(l => l.targetId), [links]);

  // FR-32: Handle unlink with 404 resilience
  const handleDelete = (linkId: string) => {
    setUnlinkError(null);
    deleteMutation.mutate(linkId, {
      onSuccess: () => {
        setConfirmDeleteId(null);
      },
      onError: (error: Error) => {
        // FR-32: If link already deleted elsewhere, treat as success
        if (error.message?.includes('not found') || error.message?.includes('0 rows')) {
          setConfirmDeleteId(null);
        } else {
          setUnlinkError(error.message || 'Failed to remove link');
        }
      },
    });
  };

  // FR-44: Return focus to trigger when add row closes
  const handleCloseAddRow = () => {
    setShowAddRow(false);
    setTimeout(() => addLinkTriggerRef.current?.focus(), 50);
  };

  return (
    <CollapsibleSection
      title="Linked Work Items"
      count={links.length}
      defaultOpen={links.length > 0}
    >
      {/* Loading state */}
      {linksLoading && (
        <div className="flex items-center justify-center py-4" aria-live="polite">
          <Loader2 size={16} className="animate-spin" color="#6B778C" />
          <span className="sr-only">Loading linked items</span>
        </div>
      )}

      {/* Empty state */}
      {!linksLoading && links.length === 0 && !showAddRow && (
        <div className="flex flex-col items-center py-5 gap-2">
          <span className="text-[12px]" style={{ color: 'var(--fg-4)' }}>
            No linked work items
          </span>
          <span className="text-[11px]" style={{ color: 'var(--fg-4)' }}>
            Link related, blocking, or duplicate items
          </span>
          <button
            ref={addLinkTriggerRef}
            onClick={() => setShowAddRow(true)}
            className="mt-1 flex items-center gap-1 px-3 py-1.5 rounded text-[12px] font-medium hover:bg-[#F4F5F7] transition-colors"
            style={{ color: '#0052CC' }}
          >
            <Plus size={13} /> Link work item
          </button>
        </div>
      )}

      {/* Grouped link display (FR-25, FR-26, FR-27) */}
      {!linksLoading && grouped.map(([type, typeLinks]) => (
        <div key={type} className="mb-2">
          {/* Group header */}
          <div
            className="text-[12px] font-bold py-1"
            style={{ color: '#6B778C', textTransform: 'lowercase' }}
          >
            {type}
          </div>

          {/* Link rows */}
          <div
            className="overflow-hidden"
            style={{ border: '1px solid #DFE1E6', borderRadius: 3 }}
          >
            {typeLinks.map(link => (
              <div
                key={link.linkId}
                className="flex items-center gap-2 px-3 group transition-colors hover:bg-[#FAFBFC]"
                style={{
                  height: 40,
                  borderBottom: '1px solid #F4F5F7',
                  cursor: onNavigate ? 'pointer' : 'default',
                }}
                onClick={() => onNavigate?.(link.targetId)}
              >
                {/* FR-28: If key is missing, show restricted placeholder */}
                {!link.targetKey ? (
                  <>
                    <Lock size={12} color="#A5ADBA" />
                    <span className="flex-1 text-[13px] italic" style={{ color: '#A5ADBA' }}>
                      Restricted — you don't have access to view this item
                    </span>
                  </>
                ) : (
                  <>
                    {/* Type indicator */}
                    <span
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: link.targetTypeColor || '#94A3B8' }}
                    />
                    {/* Key */}
                    <span
                      className="shrink-0"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#0052CC',
                      }}
                    >
                      {link.targetKey}
                    </span>
                    {/* Summary */}
                    <span
                      className="flex-1 text-[13px] truncate"
                      style={{ color: '#172B4D' }}
                    >
                      {link.targetSummary}
                    </span>
                    {/* Status lozenge */}
                    <StatusLozenge
                      name={link.targetStatus}
                      category={link.targetStatusCategory}
                    />
                    {/* Assignee avatar */}
                    {link.targetAssignee ? (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: getAvatarColor(link.targetAssignee) }}
                        title={link.targetAssignee}
                      >
                        {link.targetAssignee.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full shrink-0"
                        style={{ border: '2px dashed #DFE1E6' }}
                      />
                    )}
                  </>
                )}
                {/* Remove button — visible on hover (FR-29) */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setConfirmDeleteId(link.linkId);
                    setUnlinkError(null);
                  }}
                  title="Remove link"
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6 rounded hover:bg-[#FFEDEB] shrink-0"
                  style={{ color: '#6B778C' }}
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Unlink confirmation (FR-29, FR-31, FR-32) */}
      {confirmDeleteId && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded mb-2"
          style={{ background: '#FFF0B3', border: '1px solid #FFAB00' }}
          role="alert"
        >
          <AlertTriangle size={14} color="#974F0C" />
          <span className="flex-1 text-[12px] font-medium" style={{ color: '#974F0C' }}>
            {unlinkError ? unlinkError : 'Remove this link?'}
          </span>
          <button
            onClick={() => handleDelete(confirmDeleteId)}
            disabled={deleteMutation.isPending}
            className="px-2.5 py-1 text-[11px] font-semibold rounded"
            style={{ background: '#DE350B', color: '#fff' }}
          >
            {deleteMutation.isPending ? '...' : unlinkError ? 'Retry' : 'Remove'}
          </button>
          <button
            onClick={() => { setConfirmDeleteId(null); setUnlinkError(null); }}
            className="px-2.5 py-1 text-[11px] font-medium rounded hover:bg-[#FFF0B3]"
            style={{ color: '#974F0C' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add link inline row */}
      {showAddRow && (
        <AddLinkRow
          itemId={itemId}
          links={links}
          linkedIds={linkedIds}
          onClose={handleCloseAddRow}
          onSuccess={handleCloseAddRow}
        />
      )}

      {/* Footer actions */}
      {!showAddRow && links.length > 0 && (
        <div className="flex items-center gap-3 mt-2">
          <button
            ref={addLinkTriggerRef}
            onClick={() => setShowAddRow(true)}
            className="flex items-center gap-1 text-[11px] font-medium hover:bg-[#F4F5F7] px-2 py-1.5 rounded transition-colors"
            style={{ color: 'var(--fg-4)' }}
          >
            <Plus size={13} /> Link work item
          </button>
          {onCreateLinkedItem && (
            <button
              onClick={onCreateLinkedItem}
              className="flex items-center gap-1 text-[11px] font-medium hover:bg-[#F4F5F7] px-2 py-1.5 rounded transition-colors"
              style={{ color: 'var(--fg-4)' }}
            >
              <Plus size={13} /> Create linked work item
            </button>
          )}
        </div>
      )}
    </CollapsibleSection>
  );
}

// ─── Add Link Row (inline, Jira-style) ────────────────────

function AddLinkRow({
  itemId,
  links,
  linkedIds,
  onClose,
  onSuccess,
}: {
  itemId: string;
  links: LinkedItemDisplay[];
  linkedIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedLinkType, setSelectedLinkType] = useState<LinkTypeOption | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const createMutation = useCreateWorkItemLink(itemId);
  const containerRef = useRef<HTMLDivElement>(null);

  // FR-44: Focus into the add row on mount
  useEffect(() => {
    // Focus is handled by WorkItemPicker autoFocus
  }, []);

  // FR-21: Client-side duplicate check
  const isDuplicate = useMemo(() => {
    if (!selectedLinkType || !selectedItem) return false;
    return links.some(
      l =>
        l.targetId === selectedItem.id &&
        l.linkType === selectedLinkType.label
    );
  }, [selectedLinkType, selectedItem, links]);

  const handleLink = () => {
    if (!selectedLinkType || !selectedItem) return;

    // FR-20: Self-link check
    if (selectedItem.id === itemId || selectedItem.item_key === itemId) {
      setClientError('Cannot link an item to itself');
      return;
    }

    // FR-21: Client-side duplicate prevention
    if (isDuplicate) {
      setClientError(`This item is already linked with "${selectedLinkType.label}"`);
      return;
    }

    setClientError(null);

    // FR-38: Double-submit prevented by isPending check
    createMutation.mutate(
      {
        targetId: selectedItem.id,
        linkTypeLabel: selectedLinkType.label,
      },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (error: Error) => {
          // FR-23: Permission error
          if (error.message?.includes('permission') || error.message?.includes('403') || error.message?.includes('denied')) {
            setClientError("You don't have permission to link work items. Contact your project administrator for access.");
          }
          // FR-21 server-side: duplicate
          else if (error.message?.includes('already exists')) {
            setClientError('This link already exists');
          }
          // FR-24: Transient error — mutation error toast already shown, user can retry
          else {
            setClientError(error.message || 'Failed to create link. Please try again.');
          }
        },
      },
    );
  };

  const canLink = !!selectedLinkType && !!selectedItem && !isDuplicate;

  return (
    <div ref={containerRef} className="py-3" style={{ borderTop: '1px solid #DFE1E6' }}>
      {/* Row: Link type dropdown + Issue picker */}
      <div className="flex items-start gap-2 mb-3">
        <LinkTypeDropdown
          value={selectedLinkType}
          onChange={(opt) => { setSelectedLinkType(opt); setClientError(null); }}
        />
        <WorkItemPicker
          excludeSelfId={itemId}
          excludeLinkedIds={linkedIds}
          selected={selectedItem}
          onSelect={(item) => { setSelectedItem(item); setClientError(null); }}
        />
      </div>

      {/* Client-side validation error (FR-21, FR-23, FR-45) */}
      {clientError && (
        <div
          className="flex items-center gap-2 px-3 py-2 mb-2 rounded text-[12px]"
          style={{ background: '#FFEDEB', color: '#DE350B', border: '1px solid #FFBDAD' }}
          role="alert"
        >
          <AlertTriangle size={13} />
          <span>{clientError}</span>
        </div>
      )}

      {/* Duplicate warning (FR-21) */}
      {isDuplicate && !clientError && (
        <div
          className="flex items-center gap-2 px-3 py-2 mb-2 rounded text-[12px]"
          style={{ background: '#FFF0B3', color: '#974F0C', border: '1px solid #FFAB00' }}
          role="alert"
        >
          <AlertTriangle size={13} />
          <span>This item is already linked with "{selectedLinkType?.label}"</span>
        </div>
      )}

      {/* Actions: Link / Cancel — right-aligned */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleLink}
          disabled={!canLink || createMutation.isPending}
          className="flex items-center justify-center rounded transition-colors"
          style={{
            height: 32,
            padding: '0 16px',
            border: 'none',
            borderRadius: 3,
            background: canLink && !createMutation.isPending ? '#0052CC' : '#F4F5F7',
            color: canLink && !createMutation.isPending ? '#fff' : '#A5ADBA',
            fontSize: 14,
            fontWeight: 500,
            cursor: canLink && !createMutation.isPending ? 'pointer' : 'not-allowed',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {createMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            'Link'
          )}
        </button>
        <button
          onClick={onClose}
          className="rounded transition-colors"
          style={{
            height: 32,
            padding: '0 16px',
            border: 'none',
            borderRadius: 3,
            background: 'transparent',
            color: '#6B778C',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A', '#0052CC'];
  return colors[Math.abs(hash) % colors.length];
}
