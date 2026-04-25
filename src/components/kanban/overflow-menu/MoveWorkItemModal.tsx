/**
 * MoveWorkItemModal — Move a work item to a different project.
 * Uses real Catalyst data: ph_projects for destinations, ph_issues for the item.
 * Handles project_key update + status mapping.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { KanbanThemeTokens } from '../kanban-tokens';
import type { BoardIssue } from '../kanban-types';

interface MoveWorkItemModalProps {
  issue: BoardIssue;
  currentProjectKey: string;
  tk: KanbanThemeTokens;
  onClose: () => void;
  onMoved: (issueId: string, newProjectKey: string) => void;
}

export function MoveWorkItemModal({ issue, currentProjectKey, tk, onClose, onMoved }: MoveWorkItemModalProps) {
  const [selectedProject, setSelectedProject] = useState<{ key: string; name: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  // Fetch available projects
  const { data: projects = [] } = useQuery({
    queryKey: ['ph-all-projects-move'],
    queryFn: async () => {
      const { data } = await supabase.from('ph_projects')
        .select('id, key, name')
        .order('key');
      return (data || []).filter((p: any) => p.key !== currentProjectKey.toUpperCase());
    },
    staleTime: 60000,
  });

  // Fetch statuses of the target project (unique statuses from its issues)
  const { data: targetStatuses = [] } = useQuery({
    queryKey: ['ph-target-statuses', selectedProject?.key],
    enabled: !!selectedProject,
    queryFn: async () => {
      if (!selectedProject) return [];
      const { data } = await supabase.from('ph_issues')
        .select('status')
        .eq('project_key', selectedProject.key)
        .is('deleted_at', null)
        .limit(500);
      const set = new Set<string>();
      (data || []).forEach((r: any) => { if (r.status) set.add(r.status); });
      return Array.from(set).sort();
    },
    staleTime: 30000,
  });

  // Auto-select matching status when target project changes
  useEffect(() => {
    if (!selectedProject || targetStatuses.length === 0) return;
    const match = targetStatuses.find(s => s.toLowerCase() === issue.status.toLowerCase());
    setSelectedStatus(match || targetStatuses[0]);
  }, [selectedProject, targetStatuses, issue.status]);

  const q = search.trim().toLowerCase();
  const filteredProjects = q
    ? projects.filter((p: any) => p.key.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
    : projects;

  const statusMismatch = selectedProject && selectedStatus &&
    selectedStatus.toLowerCase() !== issue.status.toLowerCase();

  const handleMove = async () => {
    if (!selectedProject || !selectedStatus) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update ph_issues: project_key + status
      const { error: updateErr } = await supabase.from('ph_issues')
        .update({
          project_key: selectedProject.key,
          status: selectedStatus,
        } as any)
        .eq('id', issue.id);
      if (updateErr) throw updateErr;

      // Update catalyst_issues project if exists
      const { data: catProject } = await supabase.from('projects')
        .select('id')
        .eq('key', selectedProject.key)
        .maybeSingle();
      if (catProject) {
        await supabase.from('catalyst_issues')
          .update({ project_id: catProject.id, status: selectedStatus } as any)
          .eq('issue_key', issue.issueKey);
      }

      onMoved(issue.id, selectedProject.key);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move work item');
    } finally {
      setSaving(false);
    }
  };

  const modalBg = tk.surfaceBg;
  const textP = tk.textPrimary;
  const textS = tk.textSecondary;
  const textM = tk.textMuted;
  const border = tk.border;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 520, maxHeight: '80vh', background: modalBg,
        borderRadius: 8, border: `1px solid ${border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <JiraIssueTypeIcon type={issue.issueType} size={16} />
            <span style={{ fontSize: 15, fontWeight: 600, color: textP, fontFamily: 'var(--cp-font-heading)' }}>
              Move {issue.issueKey}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: textM, padding: 4, display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {/* Current location */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: textM, letterSpacing: '0.03em', marginBottom: 4 }}>
              Current project
            </div>
            <div style={{
              padding: '8px 12px', background: tk.chipBg, borderRadius: 4,
              fontSize: 13, color: textP, fontWeight: 500,
            }}>
              {currentProjectKey.toUpperCase()} — {issue.summary.substring(0, 60)}{issue.summary.length > 60 ? '…' : ''}
            </div>
          </div>

          {/* Destination project */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: textM, letterSpacing: '0.03em', marginBottom: 4 }}>
              Move to project
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={12} color={tk.textDisabled} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects"
                style={{
                  width: '100%', height: 32, paddingLeft: 28, paddingRight: 10,
                  border: `1px solid ${tk.inputBorder}`, borderRadius: 4,
                  fontSize: 13, color: textP, background: tk.inputBg,
                  outline: 'none', fontFamily: 'var(--cp-font-body)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${border}`, borderRadius: 4 }}>
              {filteredProjects.length === 0 && (
                <div style={{ padding: 12, fontSize: 12, color: textM }}>No other projects found</div>
              )}
              {filteredProjects.map((p: any) => {
                const isSelected = selectedProject?.key === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setSelectedProject({ key: p.key, name: p.name })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 12px', border: 'none',
                      background: isSelected ? tk.dropHighlight : 'transparent',
                      cursor: 'pointer', fontSize: 13, color: textP,
                      fontFamily: 'var(--cp-font-body)', textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = tk.surfaceHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? tk.dropHighlight : 'transparent'; }}
                  >
                    <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: textM, fontWeight: 600, flexShrink: 0 }}>
                      {p.key}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    {isSelected && (
                      <span style={{ color: tk.selectedAccent, fontSize: 11, fontWeight: 600 }}>Selected</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status mapping */}
          {selectedProject && targetStatuses.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: textM, letterSpacing: '0.03em', marginBottom: 4 }}>
                Status in {selectedProject.key}
              </div>
              {statusMismatch && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                  background: '#FFF3CD', borderRadius: 4, marginBottom: 8,
                  fontSize: 12, color: '#856404',
                }}>
                  <AlertTriangle size={14} />
                  <span>"{issue.status}" not found in {selectedProject.key}. Mapped to "{selectedStatus}".</span>
                </div>
              )}
              <select
                value={selectedStatus || ''}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{
                  width: '100%', height: 32, padding: '0 10px',
                  border: `1px solid ${tk.inputBorder}`, borderRadius: 4,
                  fontSize: 13, color: textP, background: tk.inputBg,
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                {targetStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 12px', background: '#FFEBE6', borderRadius: 4,
              fontSize: 12, color: '#DE350B', marginBottom: 8,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              height: 32, padding: '0 16px', border: `1px solid ${border}`,
              borderRadius: 4, background: 'transparent', cursor: 'pointer',
              fontSize: 13, color: textS, fontFamily: 'var(--cp-font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedProject || !selectedStatus || saving}
            style={{
              height: 32, padding: '0 16px', border: 'none',
              borderRadius: 4, background: selectedProject ? '#2563EB' : tk.chipBg,
              cursor: selectedProject ? 'pointer' : 'not-allowed',
              fontSize: 13, color: '#FFFFFF', fontWeight: 600,
              fontFamily: 'var(--cp-font-body)',
              opacity: saving ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <ArrowRight size={14} />
            {saving ? 'Moving…' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  );
}
