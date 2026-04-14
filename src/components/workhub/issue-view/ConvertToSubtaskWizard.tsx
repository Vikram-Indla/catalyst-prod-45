/**
 * ConvertToSubtaskWizard — 4-step Jira-parity wizard
 * Step 1: Select Parent and Sub-task Type
 * Step 2: Select New Status (if workflow mismatch)
 * Step 3: Update Fields (review)
 * Step 4: Confirmation
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, X, ChevronRight, Loader2 } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { resolveStatusCategory } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

/** Context-aware sub-task types — varies based on what you're converting FROM */
function getAvailableSubtaskTypes(sourceIssueType: string): string[] {
  const t = (sourceIssueType ?? '').toLowerCase();

  // Never show the source type itself as a conversion target
  const ALL = ['Sub-task', 'Frontend', 'Backend', 'Figma', 'Integration', 'QA Bug', 'API Requirement'];

  if (t.includes('bug') || t.includes('defect') || t === 'qa bug') {
    // Defect → Sub-task, Frontend, Backend (no QA Bug — already a defect, no Figma)
    return ['Sub-task', 'Frontend', 'Backend'];
  }
  if (t.includes('incident')) {
    // Incident → Sub-task, Backend (operational — no Frontend, Figma, QA Bug)
    return ['Sub-task', 'Backend'];
  }
  if (t === 'task') {
    // Task → Sub-task, Frontend, Backend (simpler — no Figma, Integration, QA Bug)
    return ['Sub-task', 'Frontend', 'Backend'];
  }
  if (t.includes('epic')) {
    // Epic → Sub-task, Frontend, Backend, Figma, Integration (no QA Bug, no API Req)
    return ['Sub-task', 'Frontend', 'Backend', 'Figma', 'Integration'];
  }
  if (t.includes('api requirement') || t.includes('api_requirement')) {
    // API Requirement → Sub-task, Backend, Integration (no Frontend, Figma, QA Bug)
    return ['Sub-task', 'Backend', 'Integration'];
  }
  if (t.includes('improvement')) {
    // Improvement → Sub-task, Frontend, Backend, Integration (no QA Bug)
    return ['Sub-task', 'Frontend', 'Backend', 'Integration'];
  }
  // Story, Feature, New Feature → Sub-task, Frontend, Backend, Figma, Integration (no QA Bug — use Defects section)
  return ['Sub-task', 'Frontend', 'Backend', 'Figma', 'Integration'];
}

interface Props {
  issueId: string;
  issueKey: string;
  issueType: string;
  currentStatus: string;
  projectKey: string;
  onClose: () => void;
}

const STEPS = [
  'Select Parent and Sub-task Type',
  'Select New Status',
  'Update Fields',
  'Confirmation',
];

export function ConvertToSubtaskWizard({ issueId, issueKey, issueType, currentStatus, projectKey, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [parentKey, setParentKey] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedParentIssue, setSelectedParentIssue] = useState<any>(null);
  const [subtaskType, setSubtaskType] = useState('Sub-task');
  const [newStatus, setNewStatus] = useState(currentStatus);

  // Child types that cannot be parents — filtered client-side (Supabase not.in is unreliable)
  const CHILD_TYPES_SET = new Set(['sub-task', 'frontend', 'backend', 'figma', 'integration']);
  const filterParents = (rows: any[]) => rows.filter(r => !CHILD_TYPES_SET.has((r.issue_type ?? '').toLowerCase()));

  // Recent issues (shown on focus before typing — Jira parity)
  const { data: recentIssues = [] } = useQuery({
    queryKey: ['convert-recent-issues', projectKey, issueId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .ilike('issue_key', `${projectKey}-%`)
        .neq('id', issueId)
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(30);
      if (error) { console.error('Recent issues query error:', error); return []; }
      return filterParents(data ?? []).slice(0, 10);
    },
    enabled: !!projectKey,
    staleTime: 30_000,
  });

  // Search parent issues (1+ char, same project)
  const { data: searchResults = [], isFetching: searchingParents } = useQuery({
    queryKey: ['convert-parent-search', projectKey, parentSearch],
    queryFn: async () => {
      const q = parentSearch.trim();
      const { data, error } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .ilike('issue_key', `${projectKey}-%`)
        .neq('id', issueId)
        .is('deleted_at', null)
        .or(`issue_key.ilike.%${q}%,summary.ilike.%${q}%`)
        .order('jira_updated_at', { ascending: false })
        .limit(30);
      if (error) { console.error('Search query error:', error); return []; }
      return filterParents(data ?? []).slice(0, 15);
    },
    enabled: parentSearch.trim().length >= 1,
    staleTime: 10_000,
  });

  // Show search results if typing, otherwise show recent issues
  const parentCandidates = parentSearch.trim().length >= 1 ? searchResults : recentIssues;
  const [inputFocused, setInputFocused] = useState(true);
  const showDropdown = !selectedParentId && inputFocused;

  // All statuses from the STATUS_OPTION_GROUPS
  const allStatuses = useMemo(() => STATUS_OPTION_GROUPS.flatMap(g => g.statuses), []);
  const statusNeedsMapping = !allStatuses.some(s => s.toLowerCase() === currentStatus.toLowerCase());

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParentId) throw new Error('No parent selected');
      const { error } = await supabase.from('ph_issues').update({
        issue_type: subtaskType,
        parent_key: selectedParentIssue?.issue_key ?? parentKey,
        status: newStatus,
        status_category: resolveStatusCategory(newStatus),
      } as any).eq('id', issueId);
      if (error) throw error;
      // Write back to Jira queue
      await supabase.from('jira_write_back_queue').insert({
        ph_issue_id: issueId,
        field_name: 'issue_type',
        new_value: subtaskType,
        status: 'approved',
      } as any);
    },
    onSuccess: () => {
      toast.success(`${issueKey} converted to ${subtaskType}`);
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
      onClose();
    },
    onError: () => toast.error('Conversion failed'),
  });

  const canProceedStep0 = !!selectedParentId && !!subtaskType;
  const canProceedStep1 = !!newStatus;

  const selectParent = (p: any) => {
    setSelectedParentId(p.id);
    setSelectedParentIssue(p);
    setParentKey(p.issue_key);
    setParentSearch('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.54)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, width: 720, maxWidth: '95vw', maxHeight: '85vh', overflow: 'hidden', display: 'flex', boxShadow: '0 12px 40px rgba(9,30,66,.35)' }}>
        {/* Left stepper rail */}
        <div style={{ width: 220, background: '#FAFBFC', borderRight: '1px solid #EBECF0', padding: '24px 16px', flexShrink: 0 }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                background: i < step ? '#B3D4FF' : i === step ? '#0C66E4' : '#DFE1E6',
              }} />
              <div>
                <div style={{
                  fontSize: 13, fontWeight: i === step ? 700 : i < step ? 500 : 400,
                  color: i === step ? '#0C66E4' : i < step ? '#0C66E4' : '#6B778C',
                  cursor: i < step ? 'pointer' : 'default',
                }} onClick={() => { if (i < step) setStep(i); }}>
                  {label}
                </div>
                {i === 0 && selectedParentIssue && (
                  <div style={{ fontSize: 12, color: '#172B4D', marginTop: 4 }}>
                    Parent Issue: <strong>{selectedParentIssue.issue_key}</strong><br />
                    Sub-task Type: <strong>{subtaskType}</strong>
                  </div>
                )}
                {i === 1 && step > 1 && (
                  <div style={{ fontSize: 12, color: '#172B4D', marginTop: 4 }}>
                    Status: <strong>{newStatus}</strong>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#172B4D', margin: 0 }}>
              Convert Issue to Sub-task: {issueKey}
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={18} color="#6B778C" />
            </button>
          </div>

          <p style={{ fontSize: 13, color: '#6B778C', marginBottom: 20 }}>
            <strong>Step {step + 1} of {STEPS.length}</strong>: {
              step === 0 ? 'Select the parent issue and sub-task type ...' :
              step === 1 ? 'Select the status of the issue ...' :
              step === 2 ? 'Update the fields of the issue to relate to the new issue type ...' :
              'Confirm the conversion with all of the details you have just configured.'
            }
          </p>

          {/* Step 0: Select Parent & Type */}
          {step === 0 && (
            <div style={{ flex: 1 }}>
              {/* Parent search */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#172B4D', display: 'block', marginBottom: 6 }}>Parent Issue</label>
                {selectedParentIssue ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 4, border: '1px solid #DFE1E6', background: '#F4F5F7' }}>
                    <JiraIssueTypeIcon type={selectedParentIssue.issue_type} size={16} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0C66E4' }}>{selectedParentIssue.issue_key}</span>
                    <span style={{ fontSize: 13, color: '#172B4D', flex: 1 }}>{selectedParentIssue.summary}</span>
                    <button onClick={() => { setSelectedParentId(null); setSelectedParentIssue(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={14} color="#6B778C" />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 36, border: '2px solid #4C9AFF', borderRadius: 4 }}>
                      <Search size={14} color="#6B778C" />
                      <input
                        autoFocus
                        value={parentSearch}
                        onChange={e => setParentSearch(e.target.value)}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setTimeout(() => setInputFocused(false), 200)}
                        placeholder="Search by key or summary..."
                        style={{ flex: 1, border: 'none', outline: 'none', boxShadow: 'none', fontSize: 13, background: 'transparent' }}
                      />
                      {searchingParents && <Loader2 size={14} className="animate-spin" style={{ color: '#6B778C' }} />}
                    </div>
                    {showDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2, background: '#fff', border: '1px solid #DFE1E6', borderRadius: 4, boxShadow: '0 8px 16px rgba(9,30,66,.15), 0 0 1px rgba(9,30,66,.31)', zIndex: 10, maxHeight: 280, overflowY: 'auto' }}>
                        {/* Section label */}
                        {parentSearch.trim().length === 0 && parentCandidates.length > 0 && (
                          <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Recent issues</div>
                        )}
                        {parentCandidates.length > 0 ? parentCandidates.map((p: any) => {
                          const cat = (p.status_category ?? '').toLowerCase();
                          const lozBg = cat.includes('done') ? '#E3FCEF' : cat.includes('progress') ? '#DEEBFF' : '#DFE1E6';
                          const lozColor = cat.includes('done') ? '#006644' : cat.includes('progress') ? '#0747A6' : '#253858';
                          return (
                            <button key={p.id} onClick={() => selectParent(p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #F4F5F7' }}
                              onMouseOver={e => (e.currentTarget.style.background = '#F4F5F7')}
                              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <JiraIssueTypeIcon type={p.issue_type} size={16} />
                              <span style={{ fontWeight: 600, color: '#0C66E4', flexShrink: 0 }}>{p.issue_key}</span>
                              <span style={{ color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.summary}</span>
                              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '2px 6px', borderRadius: 3, background: lozBg, color: lozColor, flexShrink: 0, whiteSpace: 'nowrap' }}>{p.status}</span>
                            </button>
                          );
                        }) : (
                          <div style={{ padding: '16px 12px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>
                            {searchingParents ? 'Searching...' : 'No matching issues found'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sub-task type */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#172B4D', display: 'block', marginBottom: 6 }}>Sub-task Type</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {getAvailableSubtaskTypes(issueType).map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, cursor: 'pointer', background: subtaskType === t ? '#E9F2FF' : 'transparent' }}
                      onMouseOver={e => { if (subtaskType !== t) e.currentTarget.style.background = '#F4F5F7'; }}
                      onMouseOut={e => { if (subtaskType !== t) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <input type="radio" name="subtask-type" checked={subtaskType === t} onChange={() => setSubtaskType(t)} style={{ accentColor: '#0C66E4' }} />
                      <JiraIssueTypeIcon type={t} size={16} />
                      <span style={{ fontSize: 13, color: '#172B4D' }}>{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Status mapping */}
          {step === 1 && (
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#172B4D', minWidth: 160 }}>Select New Status:</div>
                <div style={{ padding: '4px 10px', borderRadius: 3, background: '#FFFAE6', border: '1px solid #FFE380', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const }}>{currentStatus}</div>
                <span style={{ color: '#6B778C', fontSize: 16 }}>→</span>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #DFE1E6', borderRadius: 4, fontSize: 13 }}>
                  {STATUS_OPTION_GROUPS.map(g => (
                    <optgroup key={g.groupLabel} label={g.groupLabel}>
                      {g.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: 12, color: '#6B778C' }}>
                (Workflow: Revamp Defect workflow 6.0)
              </p>
            </div>
          )}

          {/* Step 2: Review fields */}
          {step === 2 && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: '#6B778C', marginBottom: 16 }}>All fields will be updated automatically.</p>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, color: '#6B778C', marginBottom: 8 }}>
                Original Value (before conversion)
              </div>
              <div style={{ borderTop: '1px solid #EBECF0' }}>
                <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #EBECF0' }}>
                  <span style={{ width: 140, fontSize: 13, fontWeight: 700, color: '#172B4D' }}>Type</span>
                  <span style={{ fontSize: 13, color: '#DE350B' }}>{issueType}</span>
                </div>
                <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #EBECF0' }}>
                  <span style={{ width: 140, fontSize: 13, fontWeight: 700, color: '#172B4D' }}>Status (Workflow)</span>
                  <span style={{ padding: '2px 8px', borderRadius: 3, background: '#FFFAE6', border: '1px solid #FFE380', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const }}>{currentStatus}</span>
                </div>
                <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #EBECF0' }}>
                  <span style={{ width: 140, fontSize: 13, fontWeight: 700, color: '#172B4D' }}>New Type</span>
                  <span style={{ fontSize: 13, color: '#0C66E4' }}>{subtaskType}</span>
                </div>
                <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #EBECF0' }}>
                  <span style={{ width: 140, fontSize: 13, fontWeight: 700, color: '#172B4D' }}>New Parent</span>
                  <span style={{ fontSize: 13, color: '#0C66E4' }}>{selectedParentIssue?.issue_key}</span>
                </div>
                <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #EBECF0' }}>
                  <span style={{ width: 140, fontSize: 13, fontWeight: 700, color: '#172B4D' }}>New Status</span>
                  <span style={{ fontSize: 13, color: '#172B4D' }}>{newStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid #EBECF0', paddingTop: 16 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{ padding: '7px 16px', borderRadius: 4, background: '#F4F5F7', border: '1px solid #DFE1E6', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#172B4D' }}>
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 0 ? !canProceedStep0 : step === 1 ? !canProceedStep1 : false}
                style={{
                  padding: '7px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: (step === 0 ? canProceedStep0 : true) ? '#0C66E4' : '#A5ADBA',
                  color: '#fff', opacity: (step === 0 && !canProceedStep0) ? 0.6 : 1,
                }}
              >
                Next &gt;&gt;
              </button>
            ) : (
              <button
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
                style={{ padding: '7px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#0C66E4', color: '#fff' }}
              >
                {convertMutation.isPending ? 'Converting...' : 'Finish'}
              </button>
            )}
            <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 4, background: 'transparent', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#0C66E4' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
