/**
 * CatalystViewIdea — Phase 6 (2026-05-02)
 *
 * Canonical detail surface for Idea entities, routed via CatalystDetailRouter.
 * Implements CatalystViewBaseProps so the rest of the app reaches Ideas
 * through the same router every other entity type uses (Story, Epic,
 * BusinessRequest, etc.). No parallel modal — see CLAUDE.md anti-patterns.
 *
 * Composed entirely from @atlaskit/* primitives:
 *   modal-dialog · select · lozenge · textarea · heading · button · icon
 * Native <input type="range"> for the 6 IMPACT sliders (no @atlaskit/range
 * installed). Tokens applied via accentColor for ADS brand-blue track/thumb.
 *
 * Data source: ph_ideas (not ph_issues). Lookup by idea_key, hooks live in
 * useIdeasHub. The router skips its ph_issues lookup when itemType="idea".
 */
import React, { useState, useEffect, useRef } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button, { IconButton } from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import TextArea from '@atlaskit/textarea';
import Heading from '@atlaskit/heading';
import Select from '@atlaskit/select';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import CopyIcon from '@atlaskit/icon/glyph/copy';
import ArrowRightIcon from '@atlaskit/icon/glyph/arrow-right';
import { toast } from 'sonner';
import { useIdeaByKey, useUpdateIdea, useProfiles, type IdeaRow } from '@/hooks/useIdeasHub';
import { QUARTER_BADGE } from '@/pages/producthub/ideation/ideation-data';
import type { CatalystViewBaseProps } from '../shared/types';

const THEMES = [
  'Provide Services for SBC', 'Digital Maturity 2026', 'Marketplace', 'UX',
  'اتاحة خدمات', 'استعلام تحققي', 'المسح الصناعي', 'تحسين إجراء قائم',
  'تحسين خدمة الشركاء', 'تضمين خدمة قطاعية', 'تقارير ومؤشرات', 'رقمنة إجراء جديد',
  'كفاءة الموقع', 'مهام داخلية',
];
const STATUSES   = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'];
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const TYPES      = ['Feature Request', 'Enhancement', 'Bug Fix', 'Opportunity', 'Solution', 'Improvement', 'Problem'];
const SOURCES    = ['Internal', 'External', 'Customer'];
const TEAMS      = ['Senaie BAU', 'Integration Team', 'Mobile App Team'];
const RELEASES   = ['Mar 2026', 'Jun 2026', 'Sep 2026', 'Dec 2026'];
const QUARTERS   = ['Q1', 'Q2', 'Q3', 'Q4'];

type Opt = { label: string; value: string };
const toOpts = (arr: string[]): Opt[] => arr.map(v => ({ label: v, value: v }));
const NONE: Opt = { label: '— None —', value: '__none__' };

type LozAppearance = 'default' | 'inprogress' | 'success' | 'removed' | 'new' | 'moved';
function statusToAppearance(s: string): LozAppearance {
  if (s === 'Converted' || s === 'Converted to Request') return 'success';
  if (s === 'Approved' || s === 'Under Review') return 'inprogress';
  if (s === 'Rejected') return 'removed';
  if (s === 'Submitted') return 'new';
  return 'default';
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

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--ds-text-subtlest, #5E6C84)', marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}

function ImpactSlider({
  value, onChange, disabled,
}: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <input
      type="range"
      min={0}
      max={5}
      step={0.1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        width: '100%',
        accentColor: 'var(--ds-text-brand, #0C66E4)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    />
  );
}

/**
 * CatalystViewIdea — receives idea_key via the canonical `itemId` prop
 * from CatalystDetailRouter. `onConvert` is the optional promotion
 * handler (Idea → Request); only IdeasBoardPage etc. wire it up.
 */
export default function CatalystViewIdea({
  isOpen, onClose, itemId, onConvert,
}: CatalystViewBaseProps) {
  const ideaKey = itemId || null;
  const { data: rawIdea, isLoading } = useIdeaByKey(ideaKey);
  const { data: profiles = [] } = useProfiles();
  const updateIdea = useUpdateIdea();
  const isSaving = useRef(false);

  const [localStatus, setLocalStatus]           = useState('');
  const [localPriority, setLocalPriority]       = useState('');
  const [localType, setLocalType]               = useState('');
  const [localSource, setLocalSource]           = useState('');
  const [localTheme, setLocalTheme]             = useState('');
  const [localTeam, setLocalTeam]               = useState('');
  const [localRelease, setLocalRelease]         = useState('');
  const [localQuarter, setLocalQuarter]         = useState('');
  const [localAssigneeId, setLocalAssigneeId]   = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [investorFit, setInvestorFit]           = useState(0);
  const [marketSize, setMarketSize]             = useState(0);
  const [problemSeverity, setProblemSeverity]   = useState(0);
  const [userBenefit, setUserBenefit]           = useState(0);
  const [complexityInv, setComplexityInv]       = useState(0);
  const [timeToValue, setTimeToValue]           = useState(0);

  const composite =
    (investorFit * 0.25) + (marketSize * 0.20) + (problemSeverity * 0.20) +
    (userBenefit * 0.15) + (complexityInv * 0.10) + (timeToValue * 0.10);

  const isConverted = rawIdea?.status === 'Converted to Request' || rawIdea?.status === 'Converted';
  const canEdit = !isConverted;

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
  }, [rawIdea?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      toast.success('Idea saved');
    } catch {
      // useUpdateIdea raises a toast on error already
    } finally {
      isSaving.current = false;
    }
  };

  const profileOpts: Opt[] = profiles.map(p => ({ label: p.full_name, value: p.id }));
  const assigneeName = rawIdea?.assigned_to_name
    || profiles.find(p => p.id === localAssigneeId)?.full_name
    || null;
  const updatedAgo = rawIdea?.updated_at ? getRelativeTime(rawIdea.updated_at) : '';

  const impactLevel: LozAppearance =
    composite >= 3.51 ? 'success' :
    composite >= 0.01 ? 'inprogress' :
    'default';
  const impactLabel =
    composite >= 3.51 ? 'CRITICAL' :
    composite >= 2.51 ? 'HIGH' :
    composite >= 0.01 ? 'MEDIUM' :
    'LOW';

  const dimensions: ReadonlyArray<{
    letter: string; name: string; weight: string; value: number; set: (v: number) => void;
  }> = [
    { letter: 'I', name: 'Investor Fit',     weight: '25%', value: investorFit,    set: setInvestorFit },
    { letter: 'M', name: 'Market Size',      weight: '20%', value: marketSize,     set: setMarketSize },
    { letter: 'P', name: 'Problem Severity', weight: '20%', value: problemSeverity, set: setProblemSeverity },
    { letter: 'A', name: 'User Benefit',     weight: '15%', value: userBenefit,    set: setUserBenefit },
    { letter: 'C', name: 'Complexity (inv.)',weight: '10%', value: complexityInv,  set: setComplexityInv },
    { letter: 'T', name: 'Time to Value',    weight: '10%', value: timeToValue,    set: setTimeToValue },
  ];

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="x-large" shouldScrollInViewport>
          <ModalHeader>
            <ModalTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'var(--cp-font-mono, ui-monospace, SFMono-Regular)',
                  fontSize: 13, fontWeight: 700, color: 'var(--ds-text-brand, #0C66E4)',
                }}>
                  {rawIdea?.idea_key ?? '—'}
                </span>
                {rawIdea?.idea_key && (
                  <IconButton
                    icon={CopyIcon}
                    label="Copy key"
                    appearance="subtle"
                    spacing="compact"
                    onClick={() => {
                      navigator.clipboard.writeText(rawIdea.idea_key || '');
                      toast.success('Key copied');
                    }}
                  />
                )}
                <Lozenge appearance={statusToAppearance(localStatus)}>
                  {localStatus === 'Converted to Request' ? 'CONVERTED' : (localStatus || 'DRAFT').toUpperCase()}
                </Lozenge>
                {updatedAgo && (
                  <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #5E6C84)' }}>
                    Updated {updatedAgo}
                  </span>
                )}
              </div>
            </ModalTitle>
            <IconButton
              icon={CrossIcon}
              label="Close"
              appearance="subtle"
              onClick={onClose}
            />
          </ModalHeader>

          <ModalBody>
            {isLoading || !rawIdea ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ds-text-subtlest, #5E6C84)' }}>
                Loading…
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <Heading size="medium">{rawIdea.title}</Heading>

                {isConverted && rawIdea.linked_initiative_key && (
                  <div style={{
                    background: 'var(--ds-background-success, #DCFFF1)',
                    border: '1px solid var(--ds-border-success, #6BE1B0)',
                    borderRadius: 4, padding: 12,
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: 'var(--ds-text-success, #1F845A)',
                      marginBottom: 6,
                    }}>
                      CONVERTED TO INITIATIVE
                    </div>
                    <span style={{
                      fontFamily: 'var(--cp-font-mono, ui-monospace)', fontSize: 13,
                      fontWeight: 700, color: 'var(--ds-text-success, #1F845A)',
                    }}>
                      {rawIdea.linked_initiative_key}
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <FieldBlock label="STATUS">
                    {canEdit ? (
                      <Select<Opt>
                        inputId="idea-status"
                        options={toOpts(STATUSES)}
                        value={{ label: localStatus, value: localStatus }}
                        onChange={(v) => setLocalStatus(v?.value || '')}
                        spacing="compact"
                      />
                    ) : <Lozenge appearance={statusToAppearance(localStatus)}>{localStatus}</Lozenge>}
                  </FieldBlock>

                  <FieldBlock label="PRIORITY">
                    {canEdit ? (
                      <Select<Opt>
                        inputId="idea-priority"
                        options={toOpts(PRIORITIES)}
                        value={{ label: localPriority, value: localPriority }}
                        onChange={(v) => setLocalPriority(v?.value || '')}
                        spacing="compact"
                      />
                    ) : <span style={{ fontSize: 13, fontWeight: 600 }}>{localPriority}</span>}
                  </FieldBlock>

                  <FieldBlock label="TYPE">
                    {canEdit ? (
                      <Select<Opt>
                        inputId="idea-type"
                        options={toOpts(TYPES)}
                        value={{ label: localType, value: localType }}
                        onChange={(v) => setLocalType(v?.value || '')}
                        spacing="compact"
                      />
                    ) : <span style={{ fontSize: 13 }}>{localType || '—'}</span>}
                  </FieldBlock>

                  <FieldBlock label="SOURCE">
                    {canEdit ? (
                      <Select<Opt>
                        inputId="idea-source"
                        options={toOpts(SOURCES)}
                        value={{ label: localSource, value: localSource }}
                        onChange={(v) => setLocalSource(v?.value || '')}
                        spacing="compact"
                      />
                    ) : <span style={{ fontSize: 13 }}>{localSource || '—'}</span>}
                  </FieldBlock>

                  <FieldBlock label="IDEAS THEME">
                    {canEdit ? (
                      <Select<Opt>
                        inputId="idea-theme"
                        options={[NONE, ...toOpts(THEMES)]}
                        value={localTheme ? { label: localTheme, value: localTheme } : NONE}
                        onChange={(v) => setLocalTheme(v?.value === '__none__' ? '' : (v?.value || ''))}
                        placeholder="Select theme"
                        spacing="compact"
                      />
                    ) : <span style={{ fontSize: 13 }}>{localTheme || '—'}</span>}
                  </FieldBlock>

                  <FieldBlock label="ASSIGNED TEAM">
                    {canEdit ? (
                      <Select<Opt>
                        inputId="idea-team"
                        options={[NONE, ...toOpts(TEAMS)]}
                        value={localTeam ? { label: localTeam, value: localTeam } : NONE}
                        onChange={(v) => setLocalTeam(v?.value === '__none__' ? '' : (v?.value || ''))}
                        placeholder="Select team"
                        spacing="compact"
                      />
                    ) : <span style={{ fontSize: 13 }}>{localTeam || '—'}</span>}
                  </FieldBlock>

                  <FieldBlock label="TARGET RELEASE">
                    {canEdit ? (
                      <Select<Opt>
                        inputId="idea-release"
                        options={[NONE, ...toOpts(RELEASES)]}
                        value={localRelease ? { label: localRelease, value: localRelease } : NONE}
                        onChange={(v) => setLocalRelease(v?.value === '__none__' ? '' : (v?.value || ''))}
                        placeholder="Select release"
                        spacing="compact"
                      />
                    ) : <span style={{ fontSize: 13 }}>{localRelease || '—'}</span>}
                  </FieldBlock>

                  <FieldBlock label="QUARTER">
                    {canEdit ? (
                      <Select<Opt>
                        inputId="idea-quarter"
                        options={[
                          { label: '— Unassigned —', value: '__none__' },
                          ...QUARTERS.map(q => ({ label: `${q} 2026`, value: q })),
                        ]}
                        value={
                          localQuarter
                            ? { label: `${localQuarter} 2026`, value: localQuarter }
                            : { label: '— Unassigned —', value: '__none__' }
                        }
                        onChange={(v) => setLocalQuarter(v?.value === '__none__' ? '' : (v?.value || ''))}
                        spacing="compact"
                      />
                    ) : localQuarter ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', height: 20,
                        padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                        background: QUARTER_BADGE[localQuarter]?.bg || 'var(--ds-border, #DFE1E6)',
                        color: QUARTER_BADGE[localQuarter]?.text || 'var(--ds-text-subtlest, #5E6C84)',
                      }}>
                        {localQuarter} 2026
                      </span>
                    ) : <span style={{ fontSize: 13 }}>—</span>}
                  </FieldBlock>

                  <FieldBlock label="ASSIGNEE">
                    {canEdit ? (
                      <Select<Opt>
                        inputId="idea-assignee"
                        options={[NONE, ...profileOpts]}
                        value={
                          localAssigneeId
                            ? profileOpts.find(o => o.value === localAssigneeId) ?? NONE
                            : NONE
                        }
                        onChange={(v) => setLocalAssigneeId(v?.value === '__none__' ? '' : (v?.value || ''))}
                        placeholder="Select assignee"
                        spacing="compact"
                      />
                    ) : <span style={{ fontSize: 13 }}>{assigneeName || 'Unassigned'}</span>}
                  </FieldBlock>

                  <FieldBlock label="CREATED">
                    <span style={{ fontSize: 13 }}>
                      {rawIdea.created_at
                        ? new Date(rawIdea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </span>
                  </FieldBlock>
                </div>

                <FieldBlock label="DESCRIPTION">
                  {canEdit ? (
                    <TextArea
                      value={localDescription}
                      onChange={(e) => setLocalDescription((e.target as HTMLTextAreaElement).value)}
                      placeholder="Add a description…"
                      minimumRows={4}
                      resize="vertical"
                    />
                  ) : (
                    <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                      {rawIdea.description || 'No description provided'}
                    </p>
                  )}
                </FieldBlock>

                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: 'var(--ds-text-subtlest, #5E6C84)',
                    marginBottom: 12,
                  }}>IMPACT SCORE</div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                    <span style={{
                      fontSize: 28, fontWeight: 700,
                      fontFamily: 'var(--cp-font-mono, ui-monospace, SFMono-Regular)',
                    }}>
                      {composite.toFixed(2)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #5E6C84)' }}>
                      out of 5.00
                    </span>
                    <Lozenge appearance={impactLevel}>{impactLabel}</Lozenge>
                  </div>

                  {dimensions.map((dim) => (
                    <div key={dim.letter} style={{
                      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--ds-background-neutral, #F1F2F4)',
                        color: 'var(--ds-text-subtle, #5E6C84)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>{dim.letter}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{dim.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #5E6C84)' }}>{dim.weight}</span>
                        </div>
                        <ImpactSlider
                          value={dim.value}
                          onChange={dim.set}
                          disabled={!canEdit}
                        />
                      </div>
                      <span style={{
                        fontFamily: 'var(--cp-font-mono, ui-monospace)',
                        fontSize: 13, fontWeight: 600,
                        color: dim.value > 0 ? 'inherit' : 'var(--ds-text-subtlest, #94A3B8)',
                        minWidth: 28, textAlign: 'right',
                      }}>{dim.value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>

                {!isConverted && localStatus !== 'Draft' && onConvert && rawIdea && (
                  <div style={{
                    background: 'var(--ds-background-success-subtle, #DCFFF1)',
                    border: '1px solid var(--ds-border-success, #6BE1B0)',
                    borderRadius: 4, padding: 14,
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: 'var(--ds-text-success, #216E4E)',
                      marginBottom: 4,
                    }}>
                      Ready to promote?
                    </div>
                    <p style={{
                      fontSize: 12, margin: '0 0 12px',
                      color: 'var(--ds-text-subtle, #44546F)',
                    }}>
                      Convert this idea into a tracked Request under Product Hub.
                    </p>
                    <Button
                      appearance="primary"
                      iconBefore={ArrowRightIcon}
                      onClick={() => onConvert(rawIdea as IdeaRow)}
                    >
                      Convert to Request
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            {canEdit ? (
              <>
                <Button appearance="subtle" onClick={resetLocal}>Cancel</Button>
                <Button
                  appearance="primary"
                  onClick={handleSave}
                  isLoading={updateIdea.isPending}
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <Button appearance="subtle" onClick={onClose}>Close</Button>
            )}
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
