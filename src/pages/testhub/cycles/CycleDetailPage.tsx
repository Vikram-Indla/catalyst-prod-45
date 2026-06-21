import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useTestCycle,
  useCycleScope,
  useAddCasesToScope,
  useRemoveFromScope,
  useStartCycle,
  useCompleteCycle,
} from '@/hooks/test-management/useTestCycles';
import { useTestCases } from '@/hooks/test-management/useTestCases';
import { useProjects } from '@/hooks/test-management/useProjects';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Textarea from '@atlaskit/textarea';
import Textfield from '@atlaskit/textfield';
import { Play, CheckCircle, Plus, Trash2 } from '@/lib/atlaskit-icons';
import { TMCycleScope, RunStatus } from '@/types/test-management';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export default function CycleDetailPage() {
  const { id: cycleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const projectId = projects[0]?.id;

  const { data: cycle, isLoading: cycleLoading } = useTestCycle(cycleId);
  const { data: scopeItems = [], isLoading: scopeLoading } = useCycleScope(cycleId);

  const addCases = useAddCasesToScope();
  const removeCases = useRemoveFromScope();
  const startCycle = useStartCycle();
  const completeCycle = useCompleteCycle();

  const [showAddCases, setShowAddCases] = useState(false);

  if (cycleLoading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!cycle) {
    return <div style={{ padding: 32, color: 'var(--ds-text-danger, #AE2A19)' }}>Cycle not found</div>;
  }

  const total = cycle.total_cases ?? 0;
  const passed = cycle.passed_count ?? 0;
  const failed = cycle.failed_count ?? 0;
  const blocked = cycle.blocked_count ?? 0;
  const executed = passed + failed + blocked;
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;

  return (
    <div style={{ padding: '24px', maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)' }}>
      <div style={{ marginBottom: 24 }}>
        <PageHeader
          title={cycle.name}
          breadcrumbs={
            <Breadcrumbs items={[
              { key: 'testhub', text: 'Test Hub', onClick: () => navigate('/testhub/dashboard') },
              { key: 'cycles', text: 'Cycles', onClick: () => navigate('/testhub/cycles') },
              { key: 'detail', text: cycle.name, isCurrent: true },
            ]} />
          }
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              {cycle.status === 'PLANNED' && (
                <button
                  onClick={() => startCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}
                  disabled={startCycle.isPending}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--ds-background-brand-bold, #0052CC)',
                    color: 'var(--ds-text-inverse, #FFFFFF)',
                    border: 'none',
                    borderRadius: 4,
                    cursor: startCycle.isPending ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: startCycle.isPending ? 0.7 : 1,
                  }}
                >
                  <Play size={13} />
                  {startCycle.isPending ? 'Starting...' : 'Start cycle'}
                </button>
              )}
              {cycle.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={() => navigate(`/testhub/cycles/${cycle.id}/execute`)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--ds-background-brand-bold, #0052CC)',
                      color: 'var(--ds-text-inverse, #FFFFFF)',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Play size={13} />
                    Execute
                  </button>
                  <button
                    onClick={() => completeCycle.mutate({ id: cycle.id, project_id: cycle.project_id })}
                    disabled={completeCycle.isPending}
                    style={{
                      padding: '8px 16px',
                      background: 'none',
                      border: '1px solid var(--ds-border, #DFE1E6)',
                      borderRadius: 4,
                      cursor: completeCycle.isPending ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      color: 'var(--ds-text, #172B4D)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: completeCycle.isPending ? 0.7 : 1,
                    }}
                  >
                    <CheckCircle size={13} />
                    {completeCycle.isPending ? 'Completing...' : 'Complete'}
                  </button>
                </>
              )}
            </div>
          }
        />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          flex: 1,
          maxWidth: 320,
          height: 8,
          background: 'var(--ds-background-neutral, #F1F2F4)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--ds-background-brand-bold, #0052CC)',
            borderRadius: 4,
          }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
          {pct}% — {executed}/{total} executed
        </span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-success, #006644)' }}>{passed} passed</span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-danger, #AE2A19)' }}>{failed} failed</span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-warning, #974F0C)' }}>{blocked} blocked</span>
      </div>

      {/* Scope section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)', margin: 0 }}>
          Scope ({scopeItems.length} {scopeItems.length === 1 ? 'case' : 'cases'})
        </h2>
        <button
          onClick={() => setShowAddCases(true)}
          style={{
            padding: '6px 12px',
            background: 'none',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--ds-text, #172B4D)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={13} />
          Add cases
        </button>
      </div>

      {scopeLoading ? (
        <Spinner size="medium" />
      ) : scopeItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
          No cases in scope yet. Add cases to start executing.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden', background: 'var(--ds-surface, #FFFFFF)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Assignee</th>
                <th style={{ ...thStyle, width: 96 }}>Actions</th>
                <th style={{ ...thStyle, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {scopeItems.map(item => (
                <ScopeRow
                  key={item.id}
                  item={item}
                  cycleId={cycleId ?? ''}
                  onRemove={() => removeCases.mutate({ cycle_id: cycleId!, scope_ids: [item.id] })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddCases && cycleId && projectId && (
        <AddCasesModal
          cycleId={cycleId}
          projectId={projectId}
          existingCaseIds={scopeItems.map(s => s.case_id)}
          onClose={() => setShowAddCases(false)}
        />
      )}
    </div>
  );
}

type ScopePanel = 'defect' | 'comments' | 'evidence' | null;

function ScopeRow({ item, cycleId, onRemove }: { item: TMCycleScope; cycleId: string; onRemove: () => void }) {
  const [panel, setPanel] = useState<ScopePanel>(null);
  const toggle = (p: ScopePanel) => setPanel(prev => prev === p ? null : p);

  const iconBtn = (label: string, emoji: string, p: ScopePanel) => (
    <button
      onClick={() => toggle(p)}
      title={label}
      style={{
        background: panel === p ? 'var(--ds-background-selected, #E9F2FF)' : 'none',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4, cursor: 'pointer', padding: '2px 6px',
        fontSize: 14, lineHeight: 1, color: panel === p ? 'var(--ds-text-brand, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
      }}
    >
      {emoji}
    </button>
  );

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
        <td style={{ ...tdStyle, fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12 }}>
          {item.test_case?.key ?? '—'}
        </td>
        <td style={{ ...tdStyle, color: 'var(--ds-text, #172B4D)' }}>
          {item.test_case?.title ?? '—'}
        </td>
        <td style={tdStyle}>
          <RunStatusPill status={item.status} />
        </td>
        <td style={{ ...tdStyle, color: 'var(--ds-text-subtle, #42526E)' }}>
          {item.assignee?.full_name ?? (
            <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>Unassigned</span>
          )}
        </td>
        <td style={tdStyle}>
          <div style={{ display: 'flex', gap: 4 }}>
            {iconBtn('Log defect', '🐛', 'defect')}
            {iconBtn('Comments', '📝', 'comments')}
            {iconBtn('Evidence', '📎', 'evidence')}
          </div>
        </td>
        <td style={tdStyle}>
          <button
            onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest, #6B778C)', padding: 4 }}
            title="Remove from scope"
          >
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
      {panel === 'defect' && <DefectPanel item={item} onClose={() => setPanel(null)} />}
      {panel === 'comments' && <CommentsPanel item={item} onClose={() => setPanel(null)} />}
      {panel === 'evidence' && <EvidencePanel item={item} onClose={() => setPanel(null)} />}
    </>
  );
}

// ── Shared panel shell ──────────────────────────────────────────────────────
function RightPanel({ title, subtitle, onClose, children }: {
  title: string; subtitle: string; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
  }, [onClose]);

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(9,30,66,0.25)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', zIndex: 8001,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        boxShadow: '-4px 0 24px rgba(9,30,66,0.2)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ds-text, #172B4D)' }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>{subtitle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ds-text-subtle, #42526E)', padding: '0 4px' }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

const NO_RUN_MSG = (
  <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14, margin: 0 }}>
    No execution run yet. Execute this case first.
  </p>
);

// ── Defect panel ────────────────────────────────────────────────────────────
function DefectPanel({ item, onClose }: { item: TMCycleScope; onClose: () => void }) {
  const qc = useQueryClient();
  const runId = item.last_run_id;

  const { data: defects = [], isLoading } = useQuery({
    queryKey: ['scope-defects', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_defects')
        .select('id, defect_key, title, severity, status, created_at')
        .eq('source_test_run_id', runId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'major' | 'minor' | 'trivial'>('major');
  const [saving, setSaving] = useState(false);

  const handleFile = async () => {
    if (!title.trim() || !runId) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tm_defects').insert({
        title: title.trim(),
        severity,
        status: 'open',
        reporter_id: user.id,
        source_test_run_id: runId,
        source_test_case_id: item.case_id,
        project_id: item.id, // scope as project proxy
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['scope-defects', runId] });
      setTitle('');
      catalystToast.success('Defect filed');
    } catch (e: unknown) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const SEVERITY_COLORS: Record<string, string> = {
    critical: 'var(--ds-text-danger, #AE2A19)',
    major: 'var(--ds-text-warning, #974F0C)',
    minor: 'var(--ds-text-subtle, #42526E)',
    trivial: 'var(--ds-text-subtlest, #6B778C)',
  };

  return (
    <RightPanel title="Defects" subtitle={item.test_case?.title ?? item.case_id} onClose={onClose}>
      {!runId ? NO_RUN_MSG : (
        <>
          {/* Existing defects */}
          {isLoading ? <Spinner size="small" /> : defects.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13 }}>No defects logged.</p>
          ) : (
            <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {defects.map((d: { id: string; defect_key: string; title: string; severity: string; status: string }) => (
                <div key={d.id} style={{
                  padding: '10px 12px', borderRadius: 6,
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  background: 'var(--ds-surface-sunken, #F7F8F9)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--ds-font-family-code)', color: 'var(--ds-text-subtlest, #6B778C)' }}>{d.defect_key}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: SEVERITY_COLORS[d.severity] ?? 'inherit' }}>{d.severity}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', fontWeight: 500 }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>{d.status}</div>
                </div>
              ))}
            </div>
          )}

          {/* New defect form */}
          <div style={{ borderTop: '1px solid var(--ds-border, #DFE1E6)', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 10 }}>Log new defect</div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Title</label>
              <Textfield value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} placeholder="Describe the defect…" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as typeof severity)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '2px solid var(--ds-border, #DFE1E6)', fontSize: 13, fontFamily: 'var(--ds-font-family-body)' }}
              >
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="trivial">Trivial</option>
              </select>
            </div>
            <button
              onClick={handleFile}
              disabled={!title.trim() || saving}
              style={{
                padding: '8px 16px', borderRadius: 4, border: 'none',
                background: 'var(--ds-background-brand-bold, #0052CC)', color: '#fff',
                cursor: (!title.trim() || saving) ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'File defect'}
            </button>
          </div>
        </>
      )}
    </RightPanel>
  );
}

// ── Comments panel ──────────────────────────────────────────────────────────
function CommentsPanel({ item, onClose }: { item: TMCycleScope; onClose: () => void }) {
  const qc = useQueryClient();
  const runId = item.last_run_id;

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['scope-comments', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_comments')
        .select('id, content, created_at, author:profiles!tm_comments_author_id_fkey(full_name)')
        .eq('entity_type', 'run')
        .eq('entity_id', runId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim() || !runId) return;
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('tm_comments').insert({
        entity_type: 'run',
        entity_id: runId,
        content: text.trim(),
        author_id: user.id,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['scope-comments', runId] });
      setText('');
    } catch (e: unknown) {
      catalystToast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPosting(false);
    }
  };

  return (
    <RightPanel title="Comments" subtitle={item.test_case?.title ?? item.case_id} onClose={onClose}>
      {!runId ? NO_RUN_MSG : (
        <>
          {isLoading ? <Spinner size="small" /> : comments.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13 }}>No comments yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {comments.map((c: { id: string; content: string; created_at: string; author: { full_name: string } | null }) => (
                <div key={c.id} style={{ borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)', paddingBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
                      {c.author?.full_name ?? 'Unknown'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text, #172B4D)', lineHeight: 1.5 }}>{c.content}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--ds-border, #DFE1E6)', paddingTop: 16 }}>
            <Textarea
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              placeholder="Add a comment…"
              minimumRows={3}
            />
            <button
              onClick={handlePost}
              disabled={!text.trim() || posting}
              style={{
                marginTop: 8, padding: '7px 14px', borderRadius: 4, border: 'none',
                background: 'var(--ds-background-brand-bold, #0052CC)', color: '#fff',
                cursor: (!text.trim() || posting) ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 500, opacity: posting ? 0.7 : 1,
              }}
            >
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </>
      )}
    </RightPanel>
  );
}

// ── Evidence panel ──────────────────────────────────────────────────────────
function EvidencePanel({ item, onClose }: { item: TMCycleScope; onClose: () => void }) {
  const qc = useQueryClient();
  const runId = item.last_run_id;

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['scope-evidence', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_attachments')
        .select('id, file_name, file_path, file_size, mime_type, created_at')
        .eq('entity_type', 'run')
        .eq('entity_id', runId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !runId) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const path = `run/${runId}/${Date.now()}_${file.name}`;
      const { error: storageErr } = await supabase.storage.from('tm-attachments').upload(path, file);
      if (storageErr) throw storageErr;
      const { error: dbErr } = await supabase.from('tm_attachments').insert({
        entity_type: 'run',
        entity_id: runId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      });
      if (dbErr) throw dbErr;
      qc.invalidateQueries({ queryKey: ['scope-evidence', runId] });
      catalystToast.success('Uploaded');
    } catch (err: unknown) {
      catalystToast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const fmtSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

  return (
    <RightPanel title="Evidence" subtitle={item.test_case?.title ?? item.case_id} onClose={onClose}>
      {!runId ? NO_RUN_MSG : (
        <>
          {/* Upload button */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
              border: '1px solid var(--ds-border, #DFE1E6)', color: 'var(--ds-text, #172B4D)',
              background: uploading ? 'var(--ds-background-neutral, #F1F2F4)' : 'var(--ds-surface, #FFFFFF)',
            }}>
              {uploading ? <Spinner size="small" /> : '📎'}
              {uploading ? 'Uploading…' : 'Attach file'}
              <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={handleUpload} />
            </label>
          </div>

          {isLoading ? <Spinner size="small" /> : attachments.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13 }}>No evidence attached.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map((a: { id: string; file_name: string; file_path: string; file_size: number; mime_type: string; created_at: string }) => (
                <div key={a.id} style={{
                  padding: '10px 12px', borderRadius: 6,
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  background: 'var(--ds-surface-sunken, #F7F8F9)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>{a.file_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>
                      {fmtSize(a.file_size)} · {a.mime_type}
                    </div>
                  </div>
                  <a
                    href={supabase.storage.from('tm-attachments').getPublicUrl(a.file_path).data.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--ds-link, #0052CC)', textDecoration: 'none' }}
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </RightPanel>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--ds-text-subtle, #42526E)', marginBottom: 4,
};

function AddCasesModal({
  cycleId,
  projectId,
  existingCaseIds,
  onClose,
}: {
  cycleId: string;
  projectId: string;
  existingCaseIds: string[];
  onClose: () => void;
}) {
  const { data: casesResult } = useTestCases(projectId, { per_page: 100 });
  const allCases = casesResult?.cases ?? [];
  const available = allCases.filter(c => !existingCaseIds.includes(c.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addCases = useAddCasesToScope();

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    await addCases.mutateAsync({ cycle_id: cycleId, case_ids: Array.from(selected) });
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,0.32)', zIndex: 300 }}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 560,
        maxHeight: '80vh',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(9,30,66,0.32)',
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--ds-font-family-body)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
            Add cases to scope
          </h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {available.length === 0 ? (
            <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>
              No cases available to add
            </p>
          ) : (
            available.map(c => (
              <label
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 0',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                }}
              >
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: 'var(--ds-font-family-code)' }}>
                  {c.key}
                </span>
                <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>{c.title}</span>
              </label>
            ))
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--ds-border, #DFE1E6)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
              color: 'var(--ds-text, #172B4D)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || addCases.isPending}
            style={{
              padding: '8px 20px',
              background: 'var(--ds-background-brand-bold, #0052CC)',
              color: 'var(--ds-text-inverse, #FFFFFF)',
              border: 'none',
              borderRadius: 4,
              cursor: selected.size === 0 || addCases.isPending ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              opacity: selected.size === 0 ? 0.7 : 1,
            }}
          >
            {addCases.isPending
              ? 'Adding...'
              : selected.size > 0
                ? `Add ${selected.size} case${selected.size > 1 ? 's' : ''}`
                : 'Add cases'}
          </button>
        </div>
      </div>
    </>
  );
}

function RunStatusPill({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { appearance: 'success' | 'moved' | 'removed' | 'inprogress' | 'default'; label: string }> = {
    PASSED:      { appearance: 'success',    label: 'Passed' },
    FAILED:      { appearance: 'removed',    label: 'Failed' },
    BLOCKED:     { appearance: 'moved',      label: 'Blocked' },
    IN_PROGRESS: { appearance: 'inprogress', label: 'In progress' },
    NOT_RUN:     { appearance: 'default',    label: 'Not run' },
    SKIPPED:     { appearance: 'default',    label: 'Skipped' },
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
