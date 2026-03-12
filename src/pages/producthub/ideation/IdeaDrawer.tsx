/**
 * IdeaDrawer — Shared side drawer for view/edit ideas
 * Used by ALL 5 ideation pages. 480px right overlay.
 * ALL dropdowns = shadcn Select. NO native <select>.
 * Impact sliders interactive with live composite calculation.
 * Supports Convert to Initiative flow.
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2, Send, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useIdeaByKey, useUpdateIdea, useIdeaHubComments, useCreateIdeaComment, useProfiles, type IdeaRow } from '@/hooks/useIdeasHub';
import { useAuth } from '@/hooks/useAuth';
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
  const s = STATUS_LOZENGE_COLORS[status] ?? { bg: '#DFE1E6', text: '#253858' };
  const label = status === 'Converted to Initiative' ? 'CONVERTED' : status.toUpperCase();
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '3px',
      backgroundColor: s.bg, color: s.text,
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
      lineHeight: '16px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

interface Props {
  ideaKey: string | null;
  onClose: () => void;
  onConvert?: (idea: IdeaRow) => void;
}

export default function IdeaDrawer({ ideaKey, onClose, onConvert }: Props) {
  const { data: rawIdea, isLoading } = useIdeaByKey(ideaKey);
  const { data: profiles = [] } = useProfiles();
  const updateIdea = useUpdateIdea();
  const isSaving = useRef(false);

  const [isEditing, setIsEditing] = useState(false);
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
  const [localIsCommitted, setLocalIsCommitted] = useState(false);

  // Impact sliders
  const [investorFit, setInvestorFit] = useState(0);
  const [marketSize, setMarketSize] = useState(0);
  const [problemSeverity, setProblemSeverity] = useState(0);
  const [userBenefit, setUserBenefit] = useState(0);
  const [complexityInv, setComplexityInv] = useState(0);
  const [timeToValue, setTimeToValue] = useState(0);

  const composite = (investorFit * 0.25) + (marketSize * 0.20) + (problemSeverity * 0.20) +
    (userBenefit * 0.15) + (complexityInv * 0.10) + (timeToValue * 0.10);

  const isConverted = rawIdea?.status === 'Converted to Initiative' || rawIdea?.status === 'Converted';

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
      setLocalIsCommitted(rawIdea.is_committed ?? false);
      setInvestorFit(rawIdea.impact_investor_fit || 0);
      setMarketSize(rawIdea.impact_market_size || 0);
      setProblemSeverity(rawIdea.impact_problem_severity || 0);
      setUserBenefit(rawIdea.impact_user_benefit || 0);
      setComplexityInv(rawIdea.impact_complexity_inv || 0);
      setTimeToValue(rawIdea.impact_time_to_value || 0);
      setIsEditing(false);
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
    setLocalIsCommitted(rawIdea.is_committed ?? false);
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
          is_committed: localIsCommitted,
          impact_investor_fit: investorFit,
          impact_market_size: marketSize,
          impact_problem_severity: problemSeverity,
          impact_user_benefit: userBenefit,
          impact_complexity_inv: complexityInv,
          impact_time_to_value: timeToValue,
        },
      });
      setIsEditing(false);
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
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#FFFFFF', zIndex: 201, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#94A3B8', fontSize: '14px' }}>Loading...</span>
      </div>
    </>
  );
  if (!rawIdea) return null;

  const assigneeName = rawIdea.assigned_to_name || profiles.find(p => p.id === localAssigneeId)?.full_name || null;
  const assigneeInitials = assigneeName ? assigneeName.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) : '?';

  const impactLevel = composite >= 3.51 ? 'CRITICAL' : composite >= 2.51 ? 'HIGH' : composite >= 0.01 ? 'MEDIUM' : 'LOW';
  const levelColors = composite >= 3.51
    ? { bg: '#E3FCEF', text: '#006644' }
    : composite >= 0.01 ? { bg: '#DEEBFF', text: '#0747A6' } : { bg: '#DFE1E6', text: '#253858' };

  const dimensions = [
    { letter: 'I', name: 'Investor Fit', weight: '25%', value: investorFit, set: setInvestorFit },
    { letter: 'M', name: 'Market Size', weight: '20%', value: marketSize, set: setMarketSize },
    { letter: 'P', name: 'Problem Severity', weight: '20%', value: problemSeverity, set: setProblemSeverity },
    { letter: 'A', name: 'User Benefit', weight: '15%', value: userBenefit, set: setUserBenefit },
    { letter: 'C', name: 'Complexity (inv.)', weight: '10%', value: complexityInv, set: setComplexityInv },
    { letter: 'T', name: 'Time to Value', weight: '10%', value: timeToValue, set: setTimeToValue },
  ];

  const canEdit = !isConverted;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
        background: '#FFFFFF', zIndex: 201, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease forwards',
      }}>
        {/* HEADER */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid rgba(15,23,42,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700,
            color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: '4px',
          }}>
            {rawIdea.idea_key}
          </span>
          <StatusLoz status={localStatus} />
          <div style={{ flex: 1 }} />
          {canEdit && (
            <button onClick={() => { if (isEditing) { resetLocal(); setIsEditing(false); } else setIsEditing(true); }} style={{
              width: '32px', height: '32px', borderRadius: '6px',
              border: '1px solid rgba(15,23,42,0.12)',
              background: isEditing ? '#EFF6FF' : '#FFFFFF',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B',
            }}>
              <Edit2 size={14} />
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94A3B8' }}>
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Title */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 650, color: '#0F172A', margin: 0, lineHeight: 1.3, fontFamily: "'Sora', sans-serif" }}>
              {rawIdea.title}
            </h2>
          </div>

          {/* Converted: Linked Initiative Card */}
          {isConverted && rawIdea.linked_initiative_key && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#11853D', marginBottom: '8px' }}>LINKED INITIATIVE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: '#11853D' }}>
                    {rawIdea.linked_initiative_key}
                  </span>
                  <ArrowUpRight size={14} style={{ color: '#11853D' }} />
                </div>
                {(rawIdea as any).converted_at && (
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Converted {new Date((rawIdea as any).converted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fields Grid */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FieldRow label="Status" editing={isEditing && canEdit}
                display={<StatusLoz status={localStatus} />}
                input={
                  <Select value={localStatus} onValueChange={setLocalStatus}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                }
              />
              <FieldRow label="Priority" editing={isEditing && canEdit}
                display={<PriBadge p={localPriority} />}
                input={
                  <Select value={localPriority} onValueChange={setLocalPriority}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                }
              />
              <FieldRow label="Type" editing={isEditing && canEdit}
                display={<span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>{localType || '—'}</span>}
                input={
                  <Select value={localType} onValueChange={setLocalType}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                }
              />
              <FieldRow label="Source" editing={isEditing && canEdit}
                display={<span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>{localSource || '—'}</span>}
                input={
                  <Select value={localSource} onValueChange={setLocalSource}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                }
              />
              <FieldRow label="Ideas Theme" editing={isEditing && canEdit}
                display={<span style={{ fontSize: '13px', fontWeight: 500, color: localTheme ? '#0F172A' : '#94A3B8' }}>{localTheme || '—'}</span>}
                input={
                  <Select value={localTheme || '__none__'} onValueChange={v => setLocalTheme(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Select theme" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="__none__">— None —</SelectItem>
                      {THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                }
              />
              <FieldRow label="Assigned Team" editing={isEditing && canEdit}
                display={<span style={{ fontSize: '13px', fontWeight: 500, color: localTeam ? '#0F172A' : '#94A3B8' }}>{localTeam || '—'}</span>}
                input={
                  <Select value={localTeam || '__none__'} onValueChange={v => setLocalTeam(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="__none__">— None —</SelectItem>
                      {TEAMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                }
              />
              <FieldRow label="Target Release" editing={isEditing && canEdit}
                display={<span style={{ fontSize: '13px', fontWeight: 500, color: localRelease ? '#0F172A' : '#94A3B8' }}>{localRelease || '—'}</span>}
                input={
                  <Select value={localRelease || '__none__'} onValueChange={v => setLocalRelease(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Select release" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="__none__">— None —</SelectItem>
                      {RELEASES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                }
              />
              <FieldRow label="Quarter" editing={isEditing && canEdit}
                display={
                  localQuarter ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      height: 20, padding: '0 6px', borderRadius: 3, fontSize: '11px', fontWeight: 700,
                      background: QUARTER_BADGE[localQuarter]?.bg || '#E2E8F0',
                      color: QUARTER_BADGE[localQuarter]?.text || '#94A3B8',
                    }}>{localQuarter} 2026</span>
                  ) : <span style={{ fontSize: '13px', color: '#94A3B8' }}>—</span>
                }
                input={
                  <Select value={localQuarter || '__none__'} onValueChange={v => setLocalQuarter(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="__none__">— Unassigned —</SelectItem>
                      {QUARTERS.map(q => <SelectItem key={q} value={q}>{q} 2026</SelectItem>)}
                    </SelectContent>
                  </Select>
                }
              />
              <FieldRow label="Assignee" editing={isEditing && canEdit}
                display={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: '#2563EB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FFF', fontSize: '10px', fontWeight: 700, flexShrink: 0,
                    }}>{assigneeInitials}</div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: assigneeName ? '#0F172A' : '#94A3B8' }}>
                      {assigneeName || 'Unassigned'}
                    </span>
                  </div>
                }
                input={
                  <Select value={localAssigneeId || '__none__'} onValueChange={v => setLocalAssigneeId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                    <SelectContent className="bg-white max-h-[200px]">
                      <SelectItem value="__none__">— Unassigned —</SelectItem>
                      {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                }
              />
              <FieldRow label="Created" editing={false}
                display={
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
                    {rawIdea.created_at ? new Date(rawIdea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </span>
                }
                input={null}
              />
            </div>
          </div>

          {/* Committed Toggle */}
          {isEditing && canEdit && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>COMMITTED TO ROADMAP</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Mark as committed</div>
                </div>
                <button type="button" onClick={() => setLocalIsCommitted(!localIsCommitted)} style={{
                  width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                  backgroundColor: localIsCommitted ? '#2563EB' : '#E2E8F0',
                  cursor: 'pointer', position: 'relative', transition: 'background 200ms',
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', background: '#FFFFFF',
                    position: 'absolute', top: '3px',
                    left: localIsCommitted ? '23px' : '3px', transition: 'left 200ms',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '8px' }}>DESCRIPTION</div>
            {isEditing && canEdit ? (
              <textarea value={localDescription} onChange={e => setLocalDescription(e.target.value)} rows={4}
                placeholder="Add a description..."
                style={{ width: '100%', borderRadius: '4px', border: '1px solid rgba(15,23,42,0.14)', padding: '8px 12px', fontSize: '13px', color: '#0F172A', resize: 'vertical', fontFamily: "'Inter', sans-serif", outline: 'none' }}
              />
            ) : (
              <p style={{ fontSize: '13px', color: rawIdea.description ? '#0F172A' : '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                {rawIdea.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* IMPACT SCORE */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '12px' }}>IMPACT SCORE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: composite > 0 ? '#0F172A' : '#94A3B8' }}>
                {composite.toFixed(2)}
              </span>
              <span style={{ fontSize: '13px', color: '#64748B' }}>out of 5.00</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px',
                borderRadius: '3px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                backgroundColor: levelColors.bg, color: levelColors.text,
              }}>
                {impactLevel}
              </span>
            </div>

            {dimensions.map(dim => (
              <div key={dim.letter} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: '#E2E8F0', color: '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, flexShrink: 0,
                }}>{dim.letter}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>{dim.name}</span>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>{dim.weight}</span>
                  </div>
                  {isEditing && canEdit ? (
                    <Slider
                      value={[dim.value]}
                      min={0} max={5} step={0.1}
                      onValueChange={([v]) => dim.set(v)}
                      className="w-full"
                    />
                  ) : (
                    <div style={{ height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(dim.value / 5) * 100}%`,
                        backgroundColor: dim.value > 0 ? '#2563EB' : 'transparent',
                        borderRadius: '2px', transition: 'width 300ms',
                      }} />
                    </div>
                  )}
                </div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 650,
                  color: dim.value > 0 ? '#0F172A' : '#94A3B8', minWidth: '30px', textAlign: 'right',
                }}>{dim.value.toFixed(1)}</span>
              </div>
            ))}
          </div>

          {/* Convert to Initiative section — only for non-converted, approved ideas */}
          {!isConverted && onConvert && rawIdea && (
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>Ready to promote?</div>
                <button onClick={() => onConvert(rawIdea)} style={{
                  width: '100%', height: '36px', borderRadius: '6px', border: 'none',
                  background: '#16A34A', color: '#FFFFFF', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                  <ArrowUpRight size={14} /> Convert to Initiative
                </button>
              </div>
            </div>
          )}

          {/* Comments */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '12px' }}>COMMENTS</div>
            <CommentsSection ideaId={rawIdea.id} />
          </div>
        </div>

        {/* FOOTER */}
        {isEditing && canEdit ? (
          <div style={{
            padding: '12px 24px', borderTop: '1px solid rgba(15,23,42,0.08)',
            backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0,
          }}>
            <button onClick={() => { resetLocal(); setIsEditing(false); }} style={{
              height: '36px', padding: '0 16px', borderRadius: '6px',
              border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', color: '#334155',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={handleSave} disabled={updateIdea.isPending} style={{
              height: '36px', padding: '0 16px', borderRadius: '6px',
              border: 'none', background: '#2563EB', color: '#FFFFFF',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              opacity: updateIdea.isPending ? 0.7 : 1,
            }}>{updateIdea.isPending ? 'Saving...' : 'Save Changes'}</button>
          </div>
        ) : isConverted ? (
          <div style={{
            padding: '12px 24px', borderTop: '1px solid rgba(15,23,42,0.08)',
            backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
              height: '36px', padding: '0 16px', borderRadius: '6px',
              border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', color: '#334155',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Close</button>
          </div>
        ) : null}
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

function FieldRow({ label, editing, display, input }: { label: string; editing: boolean; display: React.ReactNode; input: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: '6px' }}>{label}</div>
      <div>{editing && input ? input : display}</div>
    </div>
  );
}

function PriBadge({ p }: { p: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: 20, minWidth: 26, padding: '0 4px', borderRadius: 3,
      fontSize: '11px', fontWeight: 650, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0',
    }}>{p}</span>
  );
}

function CommentsSection({ ideaId }: { ideaId: string | null }) {
  const { data: comments = [], isLoading } = useIdeaHubComments(ideaId);
  const addComment = useCreateIdeaComment();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async () => {
    if (!newComment.trim() || !ideaId) return;
    try {
      await addComment.mutateAsync({ ideaId, userId: user?.id || '', content: newComment.trim() });
      setNewComment('');
    } catch {}
  };

  if (isLoading) return <div style={{ fontSize: '13px', color: '#94A3B8' }}>Loading comments...</div>;

  return (
    <div>
      {comments.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>No comments yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {comments.map((c: any) => {
            const name = c.profile?.full_name || 'Unknown';
            const initials = name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
            const timeAgo = c.created_at ? getRelativeTime(c.created_at) : '';
            return (
              <div key={c.id} style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '6px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '10px', fontWeight: 700 }}>{initials}</div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{name}</span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#94A3B8' }}>{timeAgo}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{c.content || ''}</div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
          placeholder="Add a comment... (Ctrl+Enter to send)"
          style={{ flex: 1, minHeight: '36px', maxHeight: '120px', resize: 'vertical', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', color: '#0F172A' }}
        />
        {newComment.trim() && (
          <button onClick={handleSubmit} disabled={addComment.isPending} style={{
            background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px',
            width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}><Send size={16} /></button>
        )}
      </div>
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
