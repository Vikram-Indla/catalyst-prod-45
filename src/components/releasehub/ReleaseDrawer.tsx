import React, { useState, useMemo, useEffect } from 'react';
import { X as XIcon, Download, RefreshCw, ExternalLink, CheckCircle2, XCircle, Minus, Activity, Sparkles, FileText, Loader2, AlertCircle, Copy, Pencil, Check, X } from 'lucide-react';
import { RH } from '@/constants/releasehub.design';
import { StatusLozenge } from './StatusLozenge';
import { SourceBadge } from './SourceBadge';
import { CatalystAIChip } from './CatalystAIChip';
import { useUpdateReleaseStatus, useChanges, useReleaseTestCycles, useApproveSignoff, useRejectSignoff, useLinkTestCycle, useUnlinkTestCycle, useUpdateReleaseTargetDate } from '@/hooks/useReleaseHub';
import { getSignoffWaitTime } from '@/utils/releasehub.utils';
import { differenceInHours } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ReleaseStatus } from '@/types/releasehub';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  release: any;
  onClose: () => void;
}

function mapStatus(status: string) {
  if (status === 'todo') return 'planning';
  if (status === 'done') return 'released';
  return status;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TABS = ['Overview', 'Changes', 'Test Cycles', 'Sign-offs', 'Activity'] as const;

export function ReleaseDrawer({ release, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Overview');
  const updateStatus = useUpdateReleaseStatus();
  const updateTargetDate = useUpdateReleaseTargetDate();
  const [editingDate, setEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [savingDate, setSavingDate] = useState(false);
  const { data: allChanges = [] } = useChanges();
  const { data: testCycles = [] } = useReleaseTestCycles(release.id);
  const relChanges = allChanges.filter((c: any) => c.release_id === release.id);

  // Change activity query
  const relChangeIds = relChanges.map((c: any) => c.id).filter(Boolean);
  const { data: changeActivity = [], isLoading: changeActivityLoading } = useQuery({
    queryKey: ['release-hub', 'change-activity', release.id, relChangeIds],
    queryFn: async () => {
      if (relChangeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('rh_change_activity_log')
        .select('*')
        .in('change_id', relChangeIds)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: relChangeIds.length > 0,
  });

  // Release activity query
  const { data: releaseActivity = [], isLoading: releaseActivityLoading } = useQuery({
    queryKey: ['release-hub', 'release-activity', release.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('rh_release_activity_log')
        .select('*')
        .eq('release_id', release.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!release.id,
  });

  const activityLoading = changeActivityLoading || releaseActivityLoading;

  const mergedActivity = useMemo(() => {
    const changeItems = (changeActivity ?? []).map((a: any) => ({
      ...a,
      _source: 'change',
    }));
    const releaseItems = (releaseActivity ?? []).map((a: any) => ({
      ...a,
      _source: 'release',
    }));
    return [...changeItems, ...releaseItems].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );
  }, [changeActivity, releaseActivity]);

  // ── COMPUTED QUALITY GATES ──
  const allSignoffsComplete = (release.pending_signoffs ?? 0) === 0;

  const tcTotalCases = testCycles.reduce((sum: number, tc: any) => sum + (tc.tm_test_cycles?.total_cases ?? 0), 0);
  const tcPassedCases = testCycles.reduce((sum: number, tc: any) => sum + (tc.tm_test_cycles?.pass_count ?? 0), 0);
  const testPassRate = tcTotalCases > 0 ? tcPassedCases / tcTotalCases : null;
  const testPassRateOk = testPassRate !== null && testPassRate >= 0.85;

  const emergencyOpen = relChanges.filter(
    (c: any) => c.risk_level === 'EMERGENCY' && c.status !== 'IN_PRODUCTION'
  ).length;
  const noEmergencyOpen = emergencyOpen === 0;

  const newCount = relChanges.filter((c: any) => c.status === 'NEW').length;
  const allStarted = relChanges.length > 0 && newCount === 0;

  const highRiskPending = relChanges.filter(
    (c: any) => c.risk_level === 'HIGH' && c.status !== 'IN_PRODUCTION'
  ).length;
  const noHighRiskPending = highRiskPending === 0;

  const computedGates = [
    {
      label: 'Sign-offs complete',
      pass: allSignoffsComplete ? true : false,
      unknown: false,
      detail: allSignoffsComplete ? 'All changes approved' : `${release.pending_signoffs} pending`,
    },
    {
      label: 'Test pass rate ≥85%',
      pass: testPassRateOk,
      unknown: testPassRate === null,
      detail: testPassRate !== null
        ? `${Math.round(testPassRate * 100)}% (${tcPassedCases}/${tcTotalCases})`
        : 'No test cycles linked',
    },
    {
      label: 'No emergency items open',
      pass: noEmergencyOpen,
      unknown: false,
      detail: noEmergencyOpen ? 'Clear' : `${emergencyOpen} emergency change${emergencyOpen > 1 ? 's' : ''} open`,
    },
    {
      label: 'All changes progressed',
      pass: allStarted,
      unknown: relChanges.length === 0,
      detail: allStarted
        ? 'All changes past NEW'
        : relChanges.length === 0
          ? 'No changes linked'
          : `${newCount} change${newCount > 1 ? 's' : ''} not yet started`,
    },
    {
      label: 'No high-risk items pending',
      pass: noHighRiskPending,
      unknown: false,
      detail: noHighRiskPending ? 'Clear' : `${highRiskPending} high-risk change${highRiskPending > 1 ? 's' : ''} not deployed`,
    },
  ];

  const gatesPassCount = computedGates.filter(g => g.pass && !g.unknown).length;
  const gatesTotalCount = computedGates.length;

  const handleStatusChange = (status: ReleaseStatus) => {
    updateStatus.mutate({ id: release.id, status }, {
      onSuccess: () => toast.success(`Release status updated to ${status}`),
      onError: (err: any) => toast.error(err.message || 'Failed to update'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[#080E1D]/38 backdrop-blur-[1px]" />
      <div className="relative w-[700px] h-full bg-white dark:bg-[#1A1A1A] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1A1A1A] z-10 border-b border-[rgba(15,23,42,0.12)] dark:border-[#2E2E2E] px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <SourceBadge source={release.source || 'catalyst'} />
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><Download size={14} /></button>
              <button className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><RefreshCw size={14} /></button>
              <button onClick={onClose} aria-label="Close drawer" className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><XIcon size={14} /></button>
            </div>
          </div>
          <h2 className="text-[18px] font-extrabold mb-2" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{release.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusLozenge status={mapStatus(release.status)} />
            {editingDate ? (
              <span className="flex items-center gap-1">
                <input
                  type="date"
                  autoFocus
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  className="text-[12px] border border-[#2563EB] rounded px-1.5 py-0.5 outline-none bg-white text-[#0F172A]"
                  style={{ fontFamily: 'inherit' }}
                />
                <button
                  disabled={savingDate}
                  onClick={async () => {
                    if (!dateInput) { setEditingDate(false); return; }
                    setSavingDate(true);
                    try {
                      await updateTargetDate.mutateAsync({ id: release.id, targetDate: dateInput });
                      release.target_date = dateInput;
                      toast.success('Release date updated');
                    } catch {
                      toast.error('Failed to update date');
                    } finally {
                      setSavingDate(false);
                      setEditingDate(false);
                    }
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded bg-[#2563EB] text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                  title="Save"
                >
                  {savingDate ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                </button>
                <button
                  onClick={() => setEditingDate(false)}
                  className="w-6 h-6 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"
                  title="Cancel"
                >
                  <X size={11} />
                </button>
              </span>
            ) : (
              <button
                onClick={() => {
                  setDateInput(release.target_date ? release.target_date.slice(0, 10) : '');
                  setEditingDate(true);
                }}
                className="group flex items-center gap-1 text-[12px] text-[#64748B] hover:text-[#2563EB] transition-colors"
                title="Edit release date"
              >
                <span>{release.target_date ? new Date(release.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <span className="text-[11px] font-bold text-[#0F172A] bg-[#F1F5F9] px-1.5 py-0.5 rounded">{relChanges.length} CHGs</span>
            <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded">{testCycles.length} cycles</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[rgba(15,23,42,0.12)] px-6 flex gap-0">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#475569]'}`}>
              {tab}
              {tab === 'Changes' && <span className="ml-1 text-[10px] font-bold bg-[#F1F5F9] text-[#475569] px-1 rounded">{relChanges.length}</span>}
              {tab === 'Test Cycles' && <span className="ml-1 text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] px-1 rounded">{testCycles.length}</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'Overview' && (
            <OverviewTab
              release={release}
              changesCount={relChanges.length}
              changes={relChanges}
              computedGates={computedGates}
              gatesPassCount={gatesPassCount}
              gatesTotalCount={gatesTotalCount}
            />
          )}
          {activeTab === 'Changes' && <ChangesTab changes={relChanges} />}
          {activeTab === 'Test Cycles' && <TestCyclesTab testCycles={testCycles} release={release} />}
          {activeTab === 'Sign-offs' && <SignoffsTab releaseId={release.id} changes={relChanges} />}
          {activeTab === 'Activity' && (
            <ActivityFeed entries={mergedActivity} loading={activityLoading} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Gate type ──────────────────────────────────────────
interface ComputedGate {
  label: string;
  pass: boolean;
  unknown: boolean;
  detail: string;
}

// ── Overview Tab ───────────────────────────────────────
function OverviewTab({
  release, changesCount, changes, computedGates, gatesPassCount, gatesTotalCount,
}: {
  release: any;
  changesCount: number;
  changes: any[];
  computedGates: ComputedGate[];
  gatesPassCount: number;
  gatesTotalCount: number;
}) {
  const [notesState, setNotesState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [generatedNotes, setGeneratedNotes] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset when release changes or component unmounts
  useEffect(() => {
    setNotesState('idle');
    setGeneratedNotes(null);
  }, [release.id]);

  const generateReleaseNotes = async () => {
    setNotesState('loading');
    try {
      // Fetch issues for this release
      const { data: issues } = await supabase
        .from('rh_release_issues')
        .select('summary, issue_type')
        .eq('release_id', release.id);
      const issueList = issues ?? [];

      const prompt = `You are a release notes writer for an enterprise government platform used by Saudi Arabia's Ministry of Industry.

Release: ${release.name} v${release.version || '1.0'}
Target date: ${release.target_date || 'TBD'}

Changes included (${changes.length} total):
${changes.map((c: any) =>
  `- [${c.risk_level?.toUpperCase() || 'MEDIUM'} RISK] ${c.title}: ${c.description || 'No description'}`
).join('\n')}

${issueList.length > 0 ? `Issues resolved (${issueList.length}):
${issueList.map((i: any) => `- [${i.issue_type}] ${i.summary}`).join('\n')}` : ''}

Write professional release notes in this exact format:
## What's New
[2-4 bullet points summarising key changes]

## Issues Resolved
[bullet list of issues, or "No issues tracked for this release."]

## Risk Summary
[1-2 sentences on overall risk level and any high-risk items to monitor]

Be concise. Use plain language suitable for ministry stakeholders.
Do not use jargon. Do not hallucinate features not listed above.`;

      const { data, error } = await supabase.functions.invoke('kb-query', {
        body: {
          query: prompt,
          filter_source: undefined,
          context_mode: 'structured',
        },
      });
      if (error) throw error;
      const answer = data?.answer;
      if (!answer) throw new Error('No answer returned');
      setGeneratedNotes(answer);
      setNotesState('success');
    } catch {
      setNotesState('error');
    }
  };

  const handleCopy = () => {
    if (generatedNotes) {
      navigator.clipboard.writeText(generatedNotes);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#F8FAFC] rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Status</p>
          <StatusLozenge status={release.status === 'todo' ? 'planning' : release.status === 'done' ? 'released' : release.status} />
        </div>
        <div className="bg-[#F8FAFC] rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Changes</p>
          <p className="text-[20px] font-extrabold" style={{ fontFamily: RH.fontMono, color: RH.ink1 }}>{changesCount}</p>
        </div>
        <div className="bg-[#F8FAFC] rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Quality Gates</p>
          <p className="text-[20px] font-extrabold" style={{ fontFamily: RH.fontMono, color: RH.ink1 }}>{gatesPassCount}/{gatesTotalCount}</p>
        </div>
      </div>
      <div>
        <h3 className="text-[13px] font-bold mb-3" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Quality Gates</h3>
        <div className="grid grid-cols-2 gap-2">
          {computedGates.map(g => {
            const isUnknown = g.unknown;
            const isPass = !isUnknown && g.pass;
            const isFail = !isUnknown && !g.pass;

            let bgColor: string, borderColor: string, labelColor: string, detailColor: string;
            let Icon: typeof CheckCircle2;

            if (isPass) {
              bgColor = '#E3FCEF'; borderColor = '#36B37E'; labelColor = '#006644'; detailColor = '#0F7B4D';
              Icon = CheckCircle2;
            } else if (isFail) {
              bgColor = '#FFEBE6'; borderColor = '#FF5630'; labelColor = '#BF2600'; detailColor = '#7A2300';
              Icon = XCircle;
            } else {
              bgColor = '#F4F5F7'; borderColor = '#C1C7D0'; labelColor = '#42526E'; detailColor = '#6B778C';
              Icon = Minus;
            }

            return (
              <div
                key={g.label}
                style={{
                  background: bgColor,
                  borderLeft: `3px solid ${borderColor}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                  minHeight: 52,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <Icon size={14} style={{ color: labelColor, marginTop: 1, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: labelColor, lineHeight: '16px' }}>{g.label}</p>
                  <p style={{ fontSize: 11, fontWeight: 400, color: detailColor, lineHeight: '15px', marginTop: 2 }}>{g.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI Release Notes Panel ── */}
      <div className="border border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] rounded-md p-4 bg-white dark:bg-[#1A1A1A]">
        <div className="flex justify-between items-center mb-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
            ✦ Catalyst AI
          </span>
          <button
            onClick={generateReleaseNotes}
            disabled={notesState === 'loading'}
            className="inline-flex items-center gap-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 outline-none"
          >
            <Sparkles size={12} />
            {notesState === 'success' ? 'Regenerate' : 'Generate'}
          </button>
        </div>

        {notesState === 'idle' && (
          <div className="flex items-center gap-2 py-6 justify-center text-[#94A3B8] text-[13px]">
            <FileText size={16} />
            <span>Click Generate to create AI release notes.</span>
          </div>
        )}

        {notesState === 'loading' && (
          <div className="flex items-center gap-2 py-6 justify-center text-[#7C3AED] text-[13px]">
            <Loader2 size={16} className="animate-spin" />
            <span>Generating release notes…</span>
          </div>
        )}

        {notesState === 'success' && generatedNotes && (
          <div>
            <div className="max-h-[300px] overflow-auto text-[13px] text-[#0F172A] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: RH.fontBody }}>
              {generatedNotes}
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F1F5F9]">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-[var(--bd-default, #E2E8F0)] text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 outline-none"
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={generateReleaseNotes}
                className="text-[12px] text-[#64748B] hover:text-[#475569] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 outline-none rounded"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}

        {notesState === 'error' && (
          <div className="flex items-center gap-2 py-6 justify-center text-[13px]">
            <AlertCircle size={16} className="text-[#DC2626]" />
            <span className="text-[#475569]">Could not generate notes.</span>
            <button
              onClick={generateReleaseNotes}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-[var(--bd-default, #E2E8F0)] text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 outline-none"
            >
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Changes Tab ────────────────────────────────────────
function ChangesTab({ changes }: { changes: any[] }) {
  if (changes.length === 0) return <div className="text-center py-10 text-[#94A3B8] text-[13px]">No changes linked to this release</div>;
  return (
    <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
      <thead>
        <tr className="border-b border-[rgba(15,23,42,0.12)]">
          {['KEY', 'TITLE', 'STATUS', 'RISK', 'DATE'].map(h => (
            <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {changes.map((c: any) => (
          <tr key={c.id} className="border-b border-[rgba(15,23,42,0.06)]" style={{ height: 50, background: 'var(--bg-app)' }}>
            <td className="px-3 py-2"><span className="font-medium text-[var(--cp-blue)]" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span></td>
            <td className="px-3 py-2 truncate max-w-[200px]" title={c.title}>{c.title}</td>
            <td className="px-3 py-2"><StatusLozenge status={c.status} /></td>
            <td className="px-3 py-2"><span className="text-[11px] font-bold uppercase text-[#475569]">{c.risk_level}</span></td>
            <td className="px-3 py-2 text-[var(--fg-3)]" style={{ fontFamily: RH.fontMono, fontSize: 12 }}>{c.deployment_date ? new Date(c.deployment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Test Cycles Tab ────────────────────────────────────
function TestCyclesTab({ testCycles, release }: { testCycles: any[]; release: any }) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availableCycles, setAvailableCycles] = useState<any[]>([]);
  const linkMut = useLinkTestCycle();
  const unlinkMut = useUnlinkTestCycle();

  const linkedCycleIds = new Set(testCycles.map((tc: any) => tc.test_cycle_id));

  const openLinkModal = async () => {
    const { data } = await supabase
      .from('tm_test_cycles')
      .select('id, name, status, total_cases, pass_count')
      .eq('project_id', release.project_id)
      .order('created_at', { ascending: false });
    setAvailableCycles(data ?? []);
    setShowLinkModal(true);
  };

  const handleLink = async (cycleId: string) => {
    await linkMut.mutateAsync({ releaseId: release.id, testCycleId: cycleId });
    toast.success('Test cycle linked.');
    setShowLinkModal(false);
  };

  const handleUnlink = async (testCycleId: string) => {
    await unlinkMut.mutateAsync({ releaseId: release.id, testCycleId });
    toast.success('Test cycle unlinked.');
  };

  return (
    <div>
      {testCycles.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[#94A3B8] text-[13px] mb-3">No test cycles linked</p>
          <button onClick={openLinkModal} className="h-9 px-4 rounded-md border border-[#2563EB] text-[#2563EB] text-[13px] font-semibold hover:bg-[#EFF6FF]">Link Test Cycle</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end mb-2">
            <button onClick={openLinkModal} className="h-8 px-3 rounded-md border border-[#2563EB] text-[#2563EB] text-[12px] font-semibold hover:bg-[#EFF6FF]">Link Test Cycle</button>
          </div>
          {testCycles.map((tc: any) => {
            const cycle = tc.tm_test_cycles;
            const passCount = cycle?.pass_count || 0;
            const totalCases = cycle?.total_cases || 1;
            const passRate = Math.round((passCount / totalCases) * 100);
            const daysLeft = release.days_remaining ?? 99;
            const atRisk = cycle?.status === 'running' && daysLeft < 7 && passRate < 50;
            return (
              <div key={tc.id} className="border border-[rgba(15,23,42,0.12)] rounded-lg p-4 group relative">
                <button
                  onClick={() => handleUnlink(tc.test_cycle_id)}
                  className="absolute top-3 right-3 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-opacity"
                  title="Unlink test cycle"
                >
                  <XIcon size={14} />
                </button>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold" style={{ color: RH.ink1 }}>{cycle?.name || 'Cycle'}</span>
                  <a href={`/testhub/cycles/${tc.test_cycle_id}`} className="text-[12px] text-[#2563EB] flex items-center gap-1 hover:underline mr-8">
                    Open in TestHub <ExternalLink size={10} />
                  </a>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusLozenge status={cycle?.status || 'not_started'} />
                  <span className="text-[11px] text-[#64748B]">{passCount}/{totalCases} cases</span>
                </div>
                <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--sem-success)] rounded-full" style={{ width: `${passRate}%` }} />
                </div>
                {atRisk && <CatalystAIChip label="test cycle at risk — recommend pause release" className="mt-2" />}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: RH.fontDisplay }}>Link Test Cycle</DialogTitle>
          </DialogHeader>
          <div className="max-h-[320px] overflow-y-auto space-y-0">
            {availableCycles.length === 0 && (
              <p className="text-center py-6 text-[#94A3B8] text-[13px]">No test cycles found for this project</p>
            )}
            {availableCycles.map((cycle: any) => {
              const alreadyLinked = linkedCycleIds.has(cycle.id);
              return (
                <button
                  key={cycle.id}
                  disabled={alreadyLinked}
                  onClick={() => handleLink(cycle.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-[rgba(15,23,42,0.06)] last:border-0 transition-colors ${
                    alreadyLinked ? 'opacity-50 cursor-default' : 'hover:bg-[rgba(0,0,0,0.04)] cursor-pointer'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium block truncate" style={{ color: RH.ink1 }}>{cycle.name}</span>
                    <span className="text-[11px] text-[#64748B]">{cycle.total_cases ?? 0} cases</span>
                  </div>
                  <StatusLozenge status={cycle.status || 'not_started'} />
                  {alreadyLinked && <span className="text-[11px] text-[#94A3B8] font-medium">Linked</span>}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <button onClick={() => setShowLinkModal(false)} className="h-8 px-4 rounded-md text-[13px] font-medium text-[#64748B] hover:bg-[#F1F5F9]">Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sign-offs Tab ──────────────────────────────────────
function SignoffsTab({ releaseId, changes }: { releaseId: string; changes: any[] }) {
  const changeIds = changes.map((c: any) => c.id);
  const { data: signoffs = [], isLoading } = useQuery({
    queryKey: ['releasehub', 'release-signoffs', releaseId],
    queryFn: async () => {
      if (changeIds.length === 0) return [];
      const { data, error } = await supabase.from('rh_change_signoffs').select('*').in('change_id', changeIds).order('wait_started_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: changeIds.length > 0,
  });
  const approveSignoff = useApproveSignoff();
  const rejectSignoff = useRejectSignoff();

  if (isLoading) return <div className="text-center py-6 text-[#94A3B8] text-[13px]">Loading...</div>;

  const stages = [
    { stage: 'QA', key: 'in_qa' },
    { stage: 'UAT', key: 'in_uat' },
    { stage: 'Product Owner', key: 'in_beta' },
    { stage: 'Deploy Auth', key: 'in_production' },
  ];

  return (
    <div className="space-y-0">
      {stages.map((s, i) => {
        const stageSignoffs = signoffs.filter((so: any) => so.stage === s.key);
        const allApproved = stageSignoffs.length > 0 && stageSignoffs.every((so: any) => so.status === 'approved');
        const hasPending = stageSignoffs.some((so: any) => so.status === 'pending');
        const status = allApproved ? 'approved' : hasPending ? 'pending' : stageSignoffs.length > 0 ? 'pending' : 'locked';

        return (
          <div key={s.stage} className="flex items-center gap-3 py-3 border-b border-[rgba(15,23,42,0.06)] last:border-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
              status === 'approved' ? 'bg-[#1B7F37] text-white' :
              status === 'pending' ? 'bg-[#0C66E4] text-white' :
              'bg-[#F1F5F9] text-[#94A3B8]'
            }`}>
              {status === 'approved' ? '✓' : status === 'pending' ? i + 1 : '🔒'}
            </div>
            <div className="flex-1">
              <span className="text-[13px] font-medium" style={{ color: RH.ink2 }}>{s.stage}</span>
              {stageSignoffs.filter((so: any) => so.status === 'pending').map((so: any) => {
                const waitHours = so.wait_started_at ? differenceInHours(new Date(), new Date(so.wait_started_at)) : 0;
                return (
                  <span key={so.id} className="ml-2 text-[11px] font-bold" style={{ color: waitHours > 48 ? 'var(--sem-danger)' : waitHours > 24 ? 'var(--cp-blue)' : 'var(--fg-4)' }}>
                    {getSignoffWaitTime(so.wait_started_at)}
                  </span>
                );
              })}
            </div>
            {hasPending && stageSignoffs.filter((so: any) => so.status === 'pending').map((so: any) => (
              <div key={so.id} className="flex items-center gap-2">
                <button onClick={() => approveSignoff.mutate(so.id, { onSuccess: () => toast.success('Approved') })}
                  className="h-7 px-3 rounded bg-[#1B7F37] text-white text-[11px] font-bold hover:bg-[#004D33]">Approve</button>
                <button onClick={() => rejectSignoff.mutate({ signoffId: so.id, comment: 'Rejected' }, { onSuccess: () => toast.success('Rejected') })}
                  className="h-7 px-3 rounded border border-[#FCA5A5] text-[#DC2626] text-[11px] font-bold hover:bg-[#FEF2F2]">Reject</button>
              </div>
            ))}
          </div>
        );
      })}
      {signoffs.length === 0 && <div className="text-center py-6 text-[#94A3B8] text-[13px]">No sign-offs configured</div>}
    </div>
  );
}

// ── Activity Feed ──────────────────────────────────────
function ActivityFeed({ entries, loading }: { entries: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-7 h-7 rounded-full bg-[#F1F5F9] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#F1F5F9] rounded w-3/4" />
              <div className="h-2.5 bg-[#F1F5F9] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity size={32} style={{ color: '#C1C7D0', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 500, color: '#42526E', marginBottom: 4 }}>No activity yet</p>
        <p style={{ fontSize: 12, color: '#6B778C' }}>
          Activity will appear here as changes progress through their lifecycle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry: any, idx: number) => {
        const isAI = !!entry.is_ai;
        const avatarBg = isAI ? '#F3E8FF' : '#EFF6FF';
        const avatarColor = isAI ? '#7C3AED' : '#2563EB';
        const initials = isAI ? 'AI' : (entry.actor_initials || '??');

        return (
          <div key={entry.id}>
            <div className="flex gap-3 py-3">
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: 28, height: 28,
                  background: avatarBg, color: avatarColor,
                  fontSize: 11, fontWeight: 600,
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#172B4D' }}>
                    {entry.actor_name || (isAI ? 'Catalyst AI' : 'System')}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#42526E' }}>
                    {entry.action}
                  </span>
                </div>
                {entry.detail && (
                  <p style={{ fontSize: 11, fontWeight: 400, color: '#6B778C', fontStyle: 'italic', marginTop: 2 }}>
                    {entry.detail}
                  </p>
                )}
                <p style={{ fontSize: 11, fontWeight: 400, color: '#97A0AF', marginTop: 2 }}>
                  {relativeTime(entry.created_at)}
                </p>
              </div>
            </div>
            {idx < entries.length - 1 && (
              <div style={{ height: 0.5, background: '#F4F5F7', marginLeft: 40 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}