import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useReleases } from '@/hooks/test-management/useReleases';
import { useTestCases } from '@/hooks/test-management/useTestCases';
import {
  useTestCycles, useCreateCycle, useDeleteCycle, useAddCasesToScope,
  useCloneCycle, useArchiveCycle, useBulkArchiveCycles, useBulkDeleteCycles,
} from '@/hooks/test-management/useTestCycles';
import { useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/standard-button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { Plus, Trash2, X, Copy, MoreHorizontal, Search } from '@/lib/atlaskit-icons';
import { TMCycle, CycleStatus } from '@/types/test-management';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
import { supabase } from '@/integrations/supabase/client';

export default function CyclesPage() {
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;
  const { data: cycles = [], isLoading } = useTestCycles(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const bulkArchive = useBulkArchiveCycles();
  const bulkDelete = useBulkDeleteCycles();

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelectedIds(
    selectedIds.size === cycles.length && cycles.length > 0 ? new Set() : new Set(cycles.map(c => c.id))
  );

  return (
    <div style={{ padding: '24px', maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)' }}>
      <div style={{ marginBottom: 24 }}>
        <PageHeader
          title="Test Cycles"
          breadcrumbs={
            <Breadcrumbs items={[
              { key: 'testhub', text: 'Test Hub', onClick: () => navigate('/testhub/dashboard') },
              { key: 'cycles', text: 'Test Cycles', isCurrent: true },
            ]} />
          }
          actions={
            <Button appearance="primary" onClick={() => setShowCreate(true)} iconBefore={<Plus size={14} label="" />}>
              Create cycle
            </Button>
          }
        />
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          padding: '8px 0 12px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-information, #0747A6)' }}>
            {selectedIds.size} selected
          </span>
          <button
            ref={bulkBtnRef}
            onClick={() => setBulkMenuOpen(o => !o)}
            style={{
              padding: '5px 12px', fontSize: 13, fontWeight: 500, borderRadius: 4,
              border: '1px solid var(--ds-border, #DFE1E6)',
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #172B4D)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            Bulk <MoreHorizontal size={13} />
          </button>
          {bulkMenuOpen && bulkBtnRef.current && createPortal(
            <BulkCycleMenu
              triggerRef={bulkBtnRef}
              onArchive={() => {
                if (projectId) bulkArchive.mutate({ ids: Array.from(selectedIds), project_id: projectId },
                  { onSuccess: () => setSelectedIds(new Set()) });
                setBulkMenuOpen(false);
              }}
              onDelete={() => {
                if (projectId) bulkDelete.mutate({ ids: Array.from(selectedIds), project_id: projectId },
                  { onSuccess: () => setSelectedIds(new Set()) });
                setBulkMenuOpen(false);
              }}
              onClose={() => setBulkMenuOpen(false)}
            />,
            document.body
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13,
            }}
          >
            Clear
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" />
        </div>
      ) : cycles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
          No test cycles yet. Create your first cycle to start executing tests.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden', background: 'var(--ds-surface, #FFFFFF)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                <th style={{ ...thStyle, width: 40 }}>
                  <input type="checkbox"
                    checked={selectedIds.size === cycles.length && cycles.length > 0}
                    onChange={toggleAll} style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Progress</th>
                <th style={thStyle}>Cases</th>
                <th style={thStyle}>Date range</th>
                <th style={{ ...thStyle, width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {cycles.map(cycle => (
                <CycleRow
                  key={cycle.id}
                  cycle={cycle}
                  selected={selectedIds.has(cycle.id)}
                  onToggleSelect={() => toggleSelect(cycle.id)}
                  onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && projectId && (
        <CreateCyclePanel projectId={projectId} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

// ── Bulk cycle menu (portal) ──────────────────────────────────────────────────
function BulkCycleMenu({ triggerRef, onArchive, onDelete, onClose }: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true); };
  }, [onClose, triggerRef]);

  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  const item: React.CSSProperties = {
    display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left',
    border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
    color: 'var(--ds-text, #172B4D)',
  };
  return createPortal(
    <div ref={menuRef} role="menu" style={{
      position: 'fixed', top: rect.bottom + 4, left: rect.left,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 6, boxShadow: '0 8px 28px rgba(9,30,66,0.25)',
      padding: '4px 0', minWidth: 160, zIndex: 9999,
    }}>
      <button role="menuitem" style={{ ...item, color: 'var(--ds-text-warning, #974F0C)' }}
        onClick={onArchive}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(9,30,66,0.04)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
        Archive selected
      </button>
      <button role="menuitem" style={{ ...item, color: 'var(--ds-text-danger, #AE2A19)' }}
        onClick={onDelete}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(9,30,66,0.04)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
        Delete selected
      </button>
    </div>,
    document.body
  );
}

// ── Per-row ⋯ menu ─────────────────────────────────────────────────────────────
function CycleRowMenu({ cycle, onClose }: { cycle: TMCycle; onClose: () => void }) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const trigRef = React.useRef<HTMLButtonElement | null>(null);
  const deleteCycle = useDeleteCycle();
  const archiveCycle = useArchiveCycle();
  const cloneCycle = useCloneCycle();

  React.useEffect(() => {
    if (trigRef.current) {
      const r = trigRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right - 160 });
    }
    const down = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !trigRef.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true); };
  }, [onClose]);

  return (
    <>
      <button ref={trigRef} onClick={e => { e.stopPropagation(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--ds-text-subtlest, #6B778C)' }}>
        <MoreHorizontal size={14} />
      </button>
      {pos && createPortal(
        <div ref={menuRef} role="menu" style={{
          position: 'fixed', top: pos.top, left: pos.left,
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 6, boxShadow: '0 8px 28px rgba(9,30,66,0.25)',
          padding: '4px 0', minWidth: 160, zIndex: 9999,
        }}>
          {(['Copy', 'Archive', 'Delete'] as const).map(action => (
            <button
              key={action}
              role="menuitem"
              onClick={e => {
                e.stopPropagation();
                if (action === 'Copy') cloneCycle.mutate({ id: cycle.id, project_id: cycle.project_id });
                if (action === 'Archive') archiveCycle.mutate({ id: cycle.id, project_id: cycle.project_id });
                if (action === 'Delete') deleteCycle.mutate({ id: cycle.id, project_id: cycle.project_id });
                onClose();
              }}
              style={{
                display: 'block', width: '100%', padding: '8px 16px',
                textAlign: 'left', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: 13,
                color: action === 'Delete' ? 'var(--ds-text-danger, #AE2A19)' :
                       action === 'Archive' ? 'var(--ds-text-warning, #974F0C)' :
                       'var(--ds-text, #172B4D)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(9,30,66,0.04)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
              {action === 'Copy' ? 'Copy cycle' : action === 'Archive' ? 'Archive cycle' : 'Delete cycle'}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function CycleRow({ cycle, selected, onToggleSelect, onClick }: {
  cycle: TMCycle; selected: boolean; onToggleSelect: () => void; onClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const total = cycle.total_cases ?? 0;
  const executed = (cycle.passed_count ?? 0) + (cycle.failed_count ?? 0) + (cycle.blocked_count ?? 0);
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;

  return (
    <tr
      style={{
        borderBottom: '1px solid var(--ds-border, #DFE1E6)', cursor: 'pointer',
        background: selected ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
      }}
      onClick={onClick}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <td style={{ ...tdStyle, width: 40 }} onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} style={{ cursor: 'pointer' }} />
      </td>
      <td style={{ ...tdStyle, fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12, whiteSpace: 'nowrap' }}>
        {cycle.key}
      </td>
      <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>{cycle.name}</td>
      <td style={tdStyle}><CycleStatusPill status={cycle.status} /></td>
      <td style={{ ...tdStyle, minWidth: 120 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--ds-background-neutral, #F1F2F4)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ds-background-brand-bold, #0052CC)', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', whiteSpace: 'nowrap' }}>{pct}%</span>
        </div>
      </td>
      <td style={{ ...tdStyle, color: 'var(--ds-text-subtle, #42526E)' }}>{total}</td>
      <td style={{ ...tdStyle, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12 }}>
        {cycle.planned_start_date ? new Date(cycle.planned_start_date).toLocaleDateString() : '—'}
        {cycle.planned_start_date && cycle.planned_end_date ? ' – ' : ''}
        {cycle.planned_end_date ? new Date(cycle.planned_end_date).toLocaleDateString() : ''}
      </td>
      <td style={{ ...tdStyle, width: 80 }} onClick={e => e.stopPropagation()}>
        {menuOpen
          ? <CycleRowMenu cycle={cycle} onClose={() => setMenuOpen(false)} />
          : <button
              onClick={e => { e.stopPropagation(); setMenuOpen(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--ds-text-subtlest, #6B778C)' }}
              title="Actions"
            >
              <MoreHorizontal size={14} />
            </button>
        }
      </td>
    </tr>
  );
}

// ── Create Cycle Modal (3-tab: Details | Cases | Assignees) ─────────────────
type CreateTab = 'details' | 'cases' | 'assignees';

function CreateCyclePanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<CreateTab>('details');
  // Details fields
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [ownerId, setOwnerId] = useState('');
  // Cases tab
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  // Assignees tab
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  // Pending new cycle id (after "Create Cycle" to then add cases)
  const [createdCycleId, setCreatedCycleId] = useState<string | null>(null);

  const createCycle = useCreateCycle();
  const addCases = useAddCasesToScope();
  const { data: releases = [] } = useReleases();
  const { data: casesResult } = useTestCases(projectId, { per_page: 200 });
  const allCases = casesResult?.cases ?? [];
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, avatar_url').order('full_name').limit(100);
      return data ?? [];
    },
    staleTime: 300000,
  });

  const filteredCases = allCases.filter(c =>
    !caseSearch || c.title?.toLowerCase().includes(caseSearch.toLowerCase()) || c.key?.toLowerCase().includes(caseSearch.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose]);

  const handleCreateCycle = async () => {
    if (!name.trim()) return;
    const cycle = await createCycle.mutateAsync({
      project_id: projectId,
      name: name.trim(),
      description: objective || undefined,
      planned_start_date: startDate || undefined,
      planned_end_date: endDate || undefined,
    });
    setCreatedCycleId(cycle.id);
    if (selectedCaseIds.size > 0) {
      await addCases.mutateAsync({ cycle_id: cycle.id, case_ids: Array.from(selectedCaseIds) });
    }
    onClose();
  };

  const handleAddCases = () => setActiveTab('cases');

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--ds-text-subtle, #42526E)', marginBottom: 4,
  };
  const dateStyle: React.CSSProperties = {
    width: '100%', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 4,
    padding: '6px 10px', fontSize: 14, fontFamily: 'var(--ds-font-family-body)',
    color: 'var(--ds-text, #172B4D)', background: 'var(--ds-surface, #FFFFFF)', boxSizing: 'border-box',
  };
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400,
    background: 'none', borderBottom: active ? '2px solid var(--ds-link, #0052CC)' : '2px solid transparent',
    color: active ? 'var(--ds-link, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
  });

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,0.32)', zIndex: 399 }} />
      <div role="dialog" aria-modal="true" aria-label="Create cycle" style={{
        position: 'fixed', top: '5vh', left: '50%', transform: 'translateX(-50%)',
        width: 760, maxHeight: '90vh', background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderRadius: 8, boxShadow: '0 8px 32px rgba(9,30,66,0.32)',
        zIndex: 400, display: 'flex', flexDirection: 'column', fontFamily: 'var(--ds-font-family-body)',
      }}>
        {/* Header */}
        <div style={{
          padding: '0 24px', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <h2 style={{ margin: '16px 0', fontSize: 18, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
            Create Cycle
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button appearance="subtle" onClick={handleAddCases}>Add Cases</Button>
            <Button
              appearance="primary"
              isDisabled={!name.trim() || createCycle.isPending || addCases.isPending}
              onClick={handleCreateCycle}
            >
              {createCycle.isPending ? 'Creating…' : 'Create Cycle'}
            </Button>
            <button onClick={onClose} aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', padding: 4, display: 'flex', marginLeft: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--ds-border, #DFE1E6)', flexShrink: 0, paddingLeft: 8 }}>
          {(['details', 'cases', 'assignees'] as CreateTab[]).map(tab => (
            <button key={tab} style={tabBtnStyle(activeTab === tab)} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'cases' && selectedCaseIds.size > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--ds-background-brand-bold, #0052CC)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                  {selectedCaseIds.size}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Left column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <Textfield
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder="Provide a value for this field"
                    autoFocus
                    isRequired
                  />
                </div>
                <div>
                  <label style={labelStyle}>Objective</label>
                  <TextArea
                    value={objective}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObjective(e.target.value)}
                    placeholder="Describe the goal of this test cycle"
                    minimumRows={3}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Release</label>
                    <select value={releaseId} onChange={e => setReleaseId(e.target.value)} style={{ ...dateStyle }}>
                      <option value="">— None —</option>
                      {releases.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Owner</label>
                    <select value={ownerId} onChange={e => setOwnerId(e.target.value)} style={{ ...dateStyle }}>
                      <option value="">— Unassigned —</option>
                      {(profiles as Array<{ id: string; full_name: string | null; email: string | null }>).map(p => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email || p.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Start date</label>
                    <input type="date" value={startDate}
                      onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
                      max={endDate || undefined} style={dateStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>End date</label>
                    <input type="date" value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      min={startDate || undefined} style={dateStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Tags</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    {tags.map(tag => (
                      <span key={tag} style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 12,
                        background: 'var(--ds-background-neutral, #F1F2F4)', color: 'var(--ds-text, #172B4D)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {tag}
                        <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Type tag and press Enter"
                    style={{ ...dateStyle, width: 'calc(100% - 20px)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── CASES TAB ── */}
          {activeTab === 'cases' && (
            <div>
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ds-text-subtlest, #6B778C)', display: 'flex' }}>
                  <Search size={14} />
                </span>
                <input
                  value={caseSearch}
                  onChange={e => setCaseSearch(e.target.value)}
                  placeholder="Search by case title or key…"
                  style={{ ...dateStyle, paddingLeft: 32 }}
                />
              </div>

              {/* Bulk select header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ds-border, #DFE1E6)', marginBottom: 4 }}>
                <input type="checkbox"
                  checked={filteredCases.length > 0 && filteredCases.every(c => selectedCaseIds.has(c.id))}
                  onChange={() => {
                    if (filteredCases.every(c => selectedCaseIds.has(c.id))) {
                      setSelectedCaseIds(new Set());
                    } else {
                      setSelectedCaseIds(new Set(filteredCases.map(c => c.id)));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)' }}>
                  Select all ({filteredCases.length} cases)
                </span>
                {selectedCaseIds.size > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--ds-link, #0052CC)', marginLeft: 'auto' }}>
                    {selectedCaseIds.size} selected
                  </span>
                )}
              </div>

              {/* Case list */}
              {filteredCases.length === 0 ? (
                <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14, padding: '16px 0' }}>
                  No published cases found.
                </p>
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {filteredCases.map(c => (
                    <label key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                      borderBottom: '1px solid var(--ds-border, #DFE1E6)', cursor: 'pointer',
                    }}>
                      <input type="checkbox"
                        checked={selectedCaseIds.has(c.id)}
                        onChange={() => {
                          setSelectedCaseIds(prev => {
                            const next = new Set(prev);
                            next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                            return next;
                          });
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'var(--ds-font-family-code)', minWidth: 70 }}>
                        {c.key}
                      </span>
                      <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)', flex: 1 }}>{c.title}</span>
                      <span style={{
                        fontSize: 11, padding: '1px 6px', borderRadius: 10,
                        background: 'var(--ds-background-neutral, #F1F2F4)',
                        color: 'var(--ds-text-subtlest, #6B778C)',
                      }}>
                        v{c.current_version ?? 1}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ASSIGNEES TAB ── */}
          {activeTab === 'assignees' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)', marginTop: 0, marginBottom: 12 }}>
                Select team members to assign to this cycle.
              </p>
              {(profiles as Array<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }>).length === 0 ? (
                <Spinner size="small" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(profiles as Array<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }>).map(p => (
                    <label key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                      borderBottom: '1px solid var(--ds-border, #DFE1E6)', cursor: 'pointer',
                    }}>
                      <input type="checkbox"
                        checked={assigneeIds.has(p.id)}
                        onChange={() => {
                          setAssigneeIds(prev => {
                            const next = new Set(prev);
                            next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                            return next;
                          });
                        }}
                      />
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        : <span style={{
                            width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--ds-background-neutral, #DFE1E6)', color: 'var(--ds-text, #172B4D)',
                          }}>
                            {(p.full_name || p.email || '?').charAt(0).toUpperCase()}
                          </span>
                      }
                      <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>
                        {p.full_name || p.email}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: '1px solid var(--ds-border, #DFE1E6)',
          display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button
            appearance="primary"
            isDisabled={!name.trim() || createCycle.isPending || addCases.isPending}
            onClick={handleCreateCycle}
          >
            {createCycle.isPending || addCases.isPending ? 'Creating…' : 'Create Cycle'}
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}

function CycleStatusPill({ status }: { status: CycleStatus }) {
  const map: Record<CycleStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    IN_PROGRESS: { appearance: 'inprogress', label: 'In progress' },
    COMPLETED:   { appearance: 'success',    label: 'Completed' },
    PLANNED:     { appearance: 'default',    label: 'Planned' },
    CANCELLED:   { appearance: 'removed',    label: 'Cancelled' },
  };
  const { appearance, label } = map[status] ?? { appearance: 'default' as const, label: status };
  return <Lozenge appearance={appearance}>{label}</Lozenge>;
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ds-text-subtle, #42526E)',
};

const tdStyle: React.CSSProperties = { padding: '10px 12px' };
