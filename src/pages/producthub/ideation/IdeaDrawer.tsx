/**
 * IdeaDrawer — Single scrollable drawer, ALWAYS in edit mode.
 * NO tabs. NO Edit button. Fields always editable via shadcn Select.
 * Sections: Header → Fields → Description → Impact → Convert → Footer
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, Copy, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import { useIdeaByKey, useUpdateIdea, useProfiles, type IdeaRow } from '@/hooks/useIdeasHub';
import { QUARTER_BADGE, STATUS_LOZENGE_COLORS } from './ideation-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const THEMES = [
  'Provide Services for SBC', 'Digital Maturity 2026', 'Marketplace', 'UX',
  'اتاحة خدمات', 'استعلام تحققي', 'المسح الصناعي', 'تحسين إجراء قائم',
  'تحسين خدمة الشركاء', 'تضمين خدمة قطاعية', 'تقارير ومؤشرات', 'رقمنة إجراء جديد',
  'كفاءة الموقع', 'مهام داخلية',
];
const STATUSES = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'];
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const TYPES = ['Feature Request', 'Enhancement', 'Bug Fix', 'Opportunity', 'Solution', 'Improvement', 'Problem'];
const SOURCES = ['Internal', 'External', 'Customer'];
const TEAMS = ['Senaie BAU', 'Integration Team', 'Mobile App Team'];
const RELEASES = ['Mar 2026', 'Jun 2026', 'Sep 2026', 'Dec 2026'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function StatusLoz({ status }: { status: string }) {
  const s = STATUS_LOZENGE_COLORS[status] ?? { bg: '#DFE1E6', text: '#42526E' };
  const label = status === 'Converted to Request' ? 'CONVERTED' : status.toUpperCase();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '4px',
      backgroundColor: s.bg, color: s.text,
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
      lineHeight: '16px', whiteSpace: 'nowrap', height: 20,
    }}>{label}</span>
  );
}

interface Props {
  ideaKey: string | null;
  onClose: () => void;
  onConvert?: (idea: IdeaRow) => void;
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function IdeaDrawer({ ideaKey, onClose, onConvert }: Props) {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;
  const { data: rawIdea, isLoading } = useIdeaByKey(ideaKey);
  const { data: profiles = [] } = useProfiles();
  const updateIdea = useUpdateIdea();
  const isSaving = useRef(false);

  const [localStatus, setLocalStatus] = useState('');
  const [localPriority, setLocalPriority] = useState('');
  const [localType, setLocalType] = useState('');
  const [localSource, setLocalSource] = useState('');
  const [localTheme, setLocalTheme] = useState('');
  const [localTeam, setLocalTeam] = useState('');
  const [localRelease, setLocalRelease] = useState('');
  const [localQuarter, setLocalQuarter] = useState('');
  const [localAssigneeId, setLocalAssigneeId] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [investorFit, setInvestorFit] = useState(0);
  const [marketSize, setMarketSize] = useState(0);
  const [problemSeverity, setProblemSeverity] = useState(0);
  const [userBenefit, setUserBenefit] = useState(0);
  const [complexityInv, setComplexityInv] = useState(0);
  const [timeToValue, setTimeToValue] = useState(0);

  const composite = (investorFit * 0.25) + (marketSize * 0.20) + (problemSeverity * 0.20) +
    (userBenefit * 0.15) + (complexityInv * 0.10) + (timeToValue * 0.10);

  const isConverted = rawIdea?.status === 'Converted to Request' || rawIdea?.status === 'Converted';

  useEffect(() => {
    if (rawIdea) {
      setLocalStatus(rawIdea.status || 'Draft');
      setLocalPriority(rawIdea.priority || 'P2');
      setLocalType(rawIdea.idea_type || 'Feature Request');
      setLocalSource(rawIdea.source || 'Internal');
      setLocalTheme(rawIdea.theme || '');
      setLocalTeam(rawIdea.assigned_team || '');
      setLocalRelease(rawIdea.target_release_date || '');
      setLocalQuarter(rawIdea.roadmap_quarter || '');
      setLocalAssigneeId(rawIdea.assignee_id || '');
      setLocalDescription(rawIdea.description || '');
      setInvestorFit(rawIdea.impact_investor_fit || 0);
      setMarketSize(rawIdea.impact_market_size || 0);
      setProblemSeverity(rawIdea.impact_problem_severity || 0);
      setUserBenefit(rawIdea.impact_user_benefit || 0);
      setComplexityInv(rawIdea.impact_complexity_inv || 0);
      setTimeToValue(rawIdea.impact_time_to_value || 0);
    }
  }, [rawIdea?.id]);

  const resetLocal = () => {
    if (!rawIdea) return;
    setLocalStatus(rawIdea.status || 'Draft');
    setLocalPriority(rawIdea.priority || 'P2');
    setLocalType(rawIdea.idea_type || 'Feature Request');
    setLocalSource(rawIdea.source || 'Internal');
    setLocalTheme(rawIdea.theme || '');
    setLocalTeam(rawIdea.assigned_team || '');
    setLocalRelease(rawIdea.target_release_date || '');
    setLocalQuarter(rawIdea.roadmap_quarter || '');
    setLocalAssigneeId(rawIdea.assignee_id || '');
    setLocalDescription(rawIdea.description || '');
    setInvestorFit(rawIdea.impact_investor_fit || 0);
    setMarketSize(rawIdea.impact_market_size || 0);
    setProblemSeverity(rawIdea.impact_problem_severity || 0);
    setUserBenefit(rawIdea.impact_user_benefit || 0);
    setComplexityInv(rawIdea.impact_complexity_inv || 0);
    setTimeToValue(rawIdea.impact_time_to_value || 0);
  };

  const handleSave = async () => {
    if (!rawIdea?.id || isSaving.current) return;
    isSaving.current = true;
    try {
      await updateIdea.mutateAsync({
        id: rawIdea.id,
        updates: {
          status: localStatus,
          priority: localPriority,
          idea_type: localType || null,
          source: localSource || null,
          theme: localTheme || null,
          assigned_team: localTeam || null,
          target_release_date: localRelease || null,
          roadmap_quarter: localQuarter || null,
          assigned_to: localAssigneeId || null,
          description: localDescription || null,
          impact_investor_fit: investorFit,
          impact_market_size: marketSize,
          impact_problem_severity: problemSeverity,
          impact_user_benefit: userBenefit,
          impact_complexity_inv: complexityInv,
          impact_time_to_value: timeToValue,
        },
      });
    } catch {} finally {
      isSaving.current = false;
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (ideaKey) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [ideaKey, onClose]);

  if (!ideaKey) return null;
  if (isLoading) return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '560px', background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: dk.t3, fontSize: '14px' }}>Loading...</span>
      </div>
    </>
  );
  if (!rawIdea) return null;

  const assigneeName = rawIdea.assigned_to_name || profiles.find(p => p.id === localAssigneeId)?.full_name || null;
  const updatedAgo = rawIdea.updated_at ? getRelativeTime(rawIdea.updated_at) : '';
  const canEdit = !isConverted;

  const impactLevel = composite >= 3.51 ? 'CRITICAL' : composite >= 2.51 ? 'HIGH' : composite >= 0.01 ? 'MEDIUM' : 'LOW';
  const levelColors = composite >= 3.51
    ? { bg: '#1B7F37', text: '#FFFFFF' }
    : composite >= 0.01 ? { bg: '#0C66E4', text: '#FFFFFF' } : { bg: '#DFE1E6', text: '#42526E' };

  const dimensions = [
    { letter: 'I', name: 'Investor Fit', weight: '25%', value: investorFit, set: setInvestorFit },
    { letter: 'M', name: 'Market Size', weight: '20%', value: marketSize, set: setMarketSize },
    { letter: 'P', name: 'Problem Severity', weight: '20%', value: problemSeverity, set: setProblemSeverity },
    { letter: 'A', name: 'User Benefit', weight: '15%', value: userBenefit, set: setUserBenefit },
    { letter: 'C', name: 'Complexity (inv.)', weight: '10%', value: complexityInv, set: setComplexityInv },
    { letter: 'T', name: 'Time to Value', weight: '10%', value: timeToValue, set: setTimeToValue },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '560px',
        background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', zIndex: 201, boxShadow: isDark ? 'none' : '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease forwards',
      }}>
        {/* HEADER */}
        <div style={{
          padding: '12px 20px', borderBottom: `0.75px solid ${dk.border}`,
          display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
        }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: dk.t2, display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: '13px', fontWeight: 700, color: dk.blueKey }}>
            {rawIdea.idea_key}
          </span>
          <button
            onClick={() => { navigator.clipboard.writeText(rawIdea.idea_key || ''); toast.success('Key copied'); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: dk.t3, display: 'flex' }}
          >
            <Copy size={14} />
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: dk.t3, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* TITLE + STATUS */}
        <div style={{ padding: '16px 20px 12px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 650, color: dk.t1, margin: 0, lineHeight: 1.3, fontFamily: 'var(--cp-font-heading)' }}>
            {rawIdea.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <StatusLoz status={localStatus} />
            {rawIdea.theme && <span style={{ fontSize: '13px', color: dk.t2, fontWeight: 500 }}>{rawIdea.theme}</span>}
            {updatedAgo && (
              <>
                <span style={{ color: dk.t4 }}>·</span>
                <span style={{ fontSize: '12px', color: dk.t3 }}>Updated {updatedAgo}</span>
              </>
            )}
          </div>
        </div>

        {/* SCROLLABLE CONTENT — single scroll, no tabs */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>

          {/* Converted: Linked Request Card */}
          {isConverted && rawIdea.linked_initiative_key && (
            <div style={{ padding: '0 20px 16px' }}>
              <div style={{ background: isDark ? 'rgba(22,163,74,0.08)' : '#F0FDF4', border: `0.75px solid ${isDark ? 'rgba(22,163,74,0.20)' : '#BBF7D0'}`, borderRadius: '6px', padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#86EFAC' : '#11853D', marginBottom: '8px' }}>CONVERTED TO INITIATIVE</div>
                <div style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', border: `0.75px solid ${isDark ? 'rgba(22,163,74,0.20)' : '#BBF7D0'}`, borderRadius: '4px', padding: '10px 12px' }}>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: '13px', fontWeight: 700, color: '#11853D' }}>
                    {rawIdea.linked_initiative_key}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <StatusLoz status="Under Review" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FIELDS — 2-column grid, always inline edit */}
          <div style={{ padding: '0 20px 16px', borderBottom: `0.75px solid ${dk.divider}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FieldBlock label="STATUS">
                {canEdit ? (
                  <Select value={localStatus} onValueChange={setLocalStatus}>
                    <SelectTrigger className="h-8 bg-white dark:bg-transparent dark:border-gray-700 dark:text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1A1A] dark:border-gray-700 dark:text-white">{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <StatusLoz status={localStatus} />}
              </FieldBlock>
              <FieldBlock label="PRIORITY">
                {canEdit ? (
                  <Select value={localPriority} onValueChange={setLocalPriority}>
                    <SelectTrigger className="h-8 bg-white dark:bg-transparent dark:border-gray-700 dark:text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1A1A] dark:border-gray-700 dark:text-white">{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <span style={{ fontSize: '13px', fontWeight: 650, color: dk.t2 }}>{localPriority}</span>}
              </FieldBlock>
              <FieldBlock label="TYPE">
                {canEdit ? (
                  <Select value={localType} onValueChange={setLocalType}>
                    <SelectTrigger className="h-8 bg-white dark:bg-transparent dark:border-gray-700 dark:text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1A1A] dark:border-gray-700 dark:text-white">{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <span style={{ fontSize: '13px', color: dk.t1 }}>{localType || '—'}</span>}
              </FieldBlock>
              <FieldBlock label="SOURCE">
                {canEdit ? (
                  <Select value={localSource} onValueChange={setLocalSource}>
                    <SelectTrigger className="h-8 bg-white dark:bg-transparent dark:border-gray-700 dark:text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1A1A] dark:border-gray-700 dark:text-white">{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <span style={{ fontSize: '13px', color: dk.t1 }}>{localSource || '—'}</span>}
              </FieldBlock>
              <FieldBlock label="IDEAS THEME">
                {canEdit ? (
                  <Select value={localTheme || '__none__'} onValueChange={(v: string) => setLocalTheme(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white dark:bg-transparent dark:border-gray-700 dark:text-white"><SelectValue placeholder="Select theme" /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1A1A] dark:border-gray-700 dark:text-white">
                      <SelectItem value="__none__">— None —</SelectItem>
                      {THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <span style={{ fontSize: '13px', color: localTheme ? dk.t1 : dk.t3 }}>{localTheme || '—'}</span>}
              </FieldBlock>
              <FieldBlock label="ASSIGNED TEAM">
                {canEdit ? (
                  <Select value={localTeam || '__none__'} onValueChange={(v: string) => setLocalTeam(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white dark:bg-transparent dark:border-gray-700 dark:text-white"><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1A1A] dark:border-gray-700 dark:text-white">
                      <SelectItem value="__none__">— None —</SelectItem>
                      {TEAMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <span style={{ fontSize: '13px', color: localTeam ? dk.t1 : dk.t3 }}>{localTeam || '—'}</span>}
              </FieldBlock>
              <FieldBlock label="TARGET RELEASE">
                {canEdit ? (
                  <Select value={localRelease || '__none__'} onValueChange={(v: string) => setLocalRelease(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white dark:bg-transparent dark:border-gray-700 dark:text-white"><SelectValue placeholder="Select release" /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1A1A] dark:border-gray-700 dark:text-white">
                      <SelectItem value="__none__">— None —</SelectItem>
                      {RELEASES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <span style={{ fontSize: '13px', color: localRelease ? dk.t1 : dk.t3 }}>{localRelease || '—'}</span>}
              </FieldBlock>
              <FieldBlock label="QUARTER">
                {canEdit ? (
                  <Select value={localQuarter || '__none__'} onValueChange={(v: string) => setLocalQuarter(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white dark:bg-transparent dark:border-gray-700 dark:text-white"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1A1A] dark:border-gray-700 dark:text-white">
                      <SelectItem value="__none__">— Unassigned —</SelectItem>
                      {QUARTERS.map(q => <SelectItem key={q} value={q}>{q} 2026</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : localQuarter ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    height: 20, padding: '0 6px', borderRadius: 4, fontSize: '11px', fontWeight: 700,
                    background: QUARTER_BADGE[localQuarter]?.bg || '#E2E8F0',
                    color: QUARTER_BADGE[localQuarter]?.text || '#94A3B8',
                  }}>{localQuarter} 2026</span>
                ) : <span style={{ fontSize: '13px', color: dk.t3 }}>—</span>}
              </FieldBlock>
              <FieldBlock label="ASSIGNEE">
                {canEdit ? (
                  <Select value={localAssigneeId || '__none__'} onValueChange={(v: string) => setLocalAssigneeId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white dark:bg-transparent dark:border-gray-700 dark:text-white"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#1A1A1A] dark:border-gray-700 dark:text-white max-h-[200px]">
                      <SelectItem value="__none__">— Unassigned —</SelectItem>
                      {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <span style={{ fontSize: '13px', color: assigneeName ? dk.t1 : dk.t3 }}>{assigneeName || 'Unassigned'}</span>}
              </FieldBlock>
              <FieldBlock label="CREATED">
                <span style={{ fontSize: '13px', fontWeight: 500, color: dk.t1 }}>
                  {rawIdea.created_at ? new Date(rawIdea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              </FieldBlock>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div style={{ padding: '16px 20px', borderBottom: `0.75px solid ${dk.divider}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, marginBottom: '8px' }}>DESCRIPTION</div>
            {canEdit ? (
              <textarea value={localDescription} onChange={(e) => setLocalDescription(e.target.value)} rows={4}
                placeholder="Add a description..."
                style={{ width: '100%', borderRadius: '4px', border: `0.75px solid ${isDark ? '#454545' : 'rgba(15,23,42,0.14)'}`, padding: '8px 12px', fontSize: '13px', color: dk.t1, resize: 'vertical', fontFamily: 'var(--cp-font-body)', outline: 'none', background: isDark ? 'transparent' : '#FFFFFF' }}
              />
            ) : (
              <p style={{ fontSize: '13px', color: rawIdea.description ? dk.t1 : dk.t3, lineHeight: 1.6, margin: 0 }}>
                {rawIdea.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* IMPACT SCORE — 6 dimension bars */}
          <div style={{ padding: '16px 20px', borderBottom: `0.75px solid ${dk.divider}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: dk.t2, marginBottom: '12px' }}>IMPACT SCORE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--cp-font-mono)', color: composite > 0 ? dk.t1 : dk.t3 }}>
                {composite.toFixed(2)}
              </span>
              <span style={{ fontSize: '13px', color: dk.t2 }}>out of 5.00</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px',
                borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                backgroundColor: levelColors.bg, color: levelColors.text,
              }}>{impactLevel}</span>
            </div>

            {dimensions.map((dim) => (
              <div key={dim.letter} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  backgroundColor: 'var(--cp-border, #E2E8F0)', color: dk.t2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, flexShrink: 0,
                }}>{dim.letter}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: dk.t1 }}>{dim.name}</span>
                    <span style={{ fontSize: '11px', color: dk.t2 }}>{dim.weight}</span>
                  </div>
                  {canEdit ? (
                    <Slider
                      value={[dim.value]}
                      min={0} max={5} step={0.1}
                      onValueChange={([v]: number[]) => dim.set(v)}
                      className="w-full"
                    />
                  ) : (
                    <div style={{ height: '4px', borderRadius: '4px', backgroundColor: 'var(--cp-border, #E2E8F0)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(dim.value / 5) * 100}%`,
                        backgroundColor: dim.value > 0 ? '#2563EB' : 'transparent',
                        borderRadius: '4px', transition: 'width 300ms',
                      }} />
                    </div>
                  )}
                </div>
                <span style={{
                  fontFamily: 'var(--cp-font-mono)', fontSize: '13px', fontWeight: 650,
                  color: dim.value > 0 ? dk.t1 : dk.t3, minWidth: '28px', textAlign: 'right',
                }}>{dim.value.toFixed(1)}</span>
              </div>
            ))}
          </div>

          {/* CONVERT TO INITIATIVE — green section (only if not Draft and not already converted) */}
          {!isConverted && localStatus !== 'Draft' && onConvert && rawIdea && (
            <div style={{ padding: '16px 20px' }}>
              <div style={{ background: isDark ? 'rgba(22,163,74,0.08)' : '#F0FDF4', border: `0.75px solid ${isDark ? 'rgba(22,163,74,0.20)' : '#BBF7D0'}`, borderRadius: '6px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <ArrowUpRight size={14} style={{ color: isDark ? '#86EFAC' : '#16A34A' }} />
                  <span style={{ fontSize: '13px', fontWeight: 650, color: dk.t1 }}>Ready to promote?</span>
                </div>
                <p style={{ fontSize: '12px', color: dk.t2, margin: '0 0 10px', lineHeight: 1.4 }}>
                  Convert this idea into a tracked request under ProductHub.
                </p>
                <button onClick={() => onConvert(rawIdea)} style={{
                  width: '100%', height: '50px', borderRadius: '6px', border: 'none',
                  background: '#16A34A', color: '#FFFFFF', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                  <ArrowUpRight size={14} /> Convert to Request
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER — sticky */}
        {canEdit ? (
          <div style={{
            padding: '12px 20px', borderTop: `0.75px solid ${dk.border}`,
            backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0,
          }}>
            <button onClick={() => { resetLocal(); }} style={{
              height: '50px', padding: '0 16px', borderRadius: '6px',
              border: `0.75px solid ${dk.border}`, background: isDark ? 'transparent' : '#FFFFFF', color: dk.t2,
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={handleSave} disabled={updateIdea.isPending} style={{
              height: '50px', padding: '0 16px', borderRadius: '6px',
              border: 'none', background: '#2563EB', color: '#FFFFFF',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              opacity: updateIdea.isPending ? 0.7 : 1,
            }}>{updateIdea.isPending ? 'Saving...' : 'Save Changes'}</button>
          </div>
        ) : (
          <div style={{
            padding: '12px 20px', borderTop: `0.75px solid ${dk.border}`,
            backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
              height: '50px', padding: '0 16px', borderRadius: '6px',
              border: `0.75px solid ${dk.border}`, background: isDark ? 'transparent' : '#FFFFFF', color: dk.t2,
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Close</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  const { isDark } = useTheme();
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cp-text-tertiary, #64748B)', marginBottom: '6px' }}>{label}</div>
      {children}
    </div>
  );
}
