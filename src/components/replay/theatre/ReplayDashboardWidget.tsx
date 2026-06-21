import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/new';
import Avatar from '@atlaskit/avatar';
import { JiraTable, makeKeyCell } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { statusBg, STATUS_TEXT } from '@/components/catalyst-detail-views/shared/sections/statusPalette';
import type { StatusAppearance } from '@/components/catalyst-detail-views/shared/sections/statusPalette';
import type { Column } from '@/components/shared/JiraTable/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReplayDashboardWidgetProps {
  mode: 'product' | 'project' | 'release';
  projectKey?: string;
  productKey?: string;
}

interface QualifyingBR {
  id: string;
  request_key: string | null;
  title: string;
  process_step: string;
  hop_count: number;
  journey_steps: string[];
  created_at: string;
  updated_at: string;
  assignee_name: string | null;
  assignee_avatar: string | null;
}

// ─── Status chip — canonical statusPalette colors ────────────────────────────

const STEP_APPEARANCE: Record<string, StatusAppearance> = {
  'In Requirements':    'default',
  'Demand Validation':  'inprogress',
  'Prioritized Backlog':'moved',
  'In Development':     'inprogress',
  'Done':               'success',
  "Won't Do":           'removed',
  'Rejected':           'removed',
};

function BRStatusChip({ status }: { status: string }) {
  const appearance = STEP_APPEARANCE[status] ?? 'default';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 500,
        background: statusBg(appearance),
        color: STATUS_TEXT,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

// ─── Data hook ──────────────────────────────────────────────────────────────

const TERMINAL_STEPS = new Set(["Done", "Rejected", "Won't Do"]);

async function fetchQualifyingBRs(): Promise<QualifyingBR[]> {
  const { data: steps, error: stepsErr } = await supabase
    .from('demand_process_steps')
    .select('value, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (stepsErr) throw stepsErr;

  const progressSteps = (steps ?? []).filter(s => !TERMINAL_STEPS.has(s.value));
  const progressValues = progressSteps.map(s => s.value);

  if (progressValues.length < 3) return [];

  const { data: brs, error: brErr } = await supabase
    .from('business_requests')
    .select('id, request_key, title, process_step, created_at, updated_at, project_manager_user_id')
    .is('deleted_at', null)
    .in('process_step', progressValues)
    .order('updated_at', { ascending: false });
  if (brErr) throw brErr;

  const rawBrs = brs ?? [];

  // Batch-fetch PM profiles for assignee display
  const pmIds = [...new Set(rawBrs.map(b => b.project_manager_user_id).filter(Boolean))] as string[];
  const profileMap = new Map<string, string>();
  const avatarMap = new Map<string, string>();
  if (pmIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', pmIds);
    for (const p of profiles ?? []) {
      if (p.full_name) profileMap.set(p.id, p.full_name);
      if (p.avatar_url) avatarMap.set(p.id, p.avatar_url);
    }
  }

  const qualifying: QualifyingBR[] = [];
  for (const br of rawBrs) {
    const pos = progressValues.indexOf(br.process_step ?? '');
    if (pos < 2) continue;
    qualifying.push({
      id: br.id,
      request_key: br.request_key ?? null,
      title: br.title,
      process_step: br.process_step ?? '',
      hop_count: pos + 1,
      journey_steps: progressValues.slice(0, pos + 1),
      created_at: br.created_at,
      updated_at: br.updated_at,
      assignee_name: br.project_manager_user_id ? (profileMap.get(br.project_manager_user_id) ?? null) : null,
      assignee_avatar: br.project_manager_user_id ? (avatarMap.get(br.project_manager_user_id) ?? null) : null,
    });
  }
  return qualifying;
}

function useQualifyingBRs() {
  return useQuery<QualifyingBR[]>({
    queryKey: ['replay-qualifying-brs'],
    queryFn: fetchQualifyingBRs,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ctrlBtnStyle: React.CSSProperties = {
  width: 28, height: 28,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--ds-background-neutral, #F1F2F4)',
  border: '1px solid var(--ds-border, #DFE1E6)',
  borderRadius: 3,
  color: 'var(--ds-text, #172B4D)',
  fontSize: 12,
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
};

// ─── Theatre inline view ──────────────────────────────────────────────────────

function TheatreView({ br, onClose }: { br: QualifyingBR; onClose: () => void }) {
  const steps = br.journey_steps;
  const total = steps.length;
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isPlaying) return;
    if (currentStep >= total - 1) { setIsPlaying(false); return; }
    timerRef.current = setTimeout(() => setCurrentStep(s => s + 1), 2500 / speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, currentStep, speed, total]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key === ' ') { e.preventDefault(); setIsPlaying(v => !v); return; }
    if (e.key === 'ArrowLeft') { setCurrentStep(s => Math.max(0, s - 1)); setIsPlaying(false); return; }
    if (e.key === 'ArrowRight') { setCurrentStep(s => Math.min(total - 1, s + 1)); setIsPlaying(false); return; }
  }, [onClose, total]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [handleKey]);

  const spanDays = Math.round(
    (new Date(br.updated_at).getTime() - new Date(br.created_at).getTime()) / 86400000,
  );
  const stepDate = (i: number) =>
    i === 0 ? fmtDate(br.created_at) : i === total - 1 ? fmtDate(br.updated_at) : '';
  const scrubberPct = total > 1 ? (currentStep / (total - 1)) * 100 : 100;
  const goToStep = (i: number) => { setCurrentStep(i); setIsPlaying(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: '0.5px solid var(--ds-border, #DFE1E6)', borderRadius: 8, overflow: 'hidden', background: 'var(--ds-surface, #FFFFFF)', minHeight: 480 }}>

      {/* TOP BAR */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, flexShrink: 0, borderBottom: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #FFFFFF)' }}>
        <button title="Back to journey (Esc)" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--ds-text-subtle, #42526E)', fontSize: 13, borderRadius: 3 }}>
          ← Back
        </button>
        {br.request_key && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 3, background: 'var(--ds-background-neutral, #F1F2F4)', fontSize: 11, fontWeight: 600, color: 'var(--ds-text, #172B4D)', whiteSpace: 'nowrap' }}>
            <JiraIssueTypeIcon type="Business Request" size={12} />
            {br.request_key}
          </span>
        )}
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {br.title}
        </span>

        {/* Transport controls */}
        <button title="Restart" onClick={() => { setCurrentStep(0); setIsPlaying(false); }} style={ctrlBtnStyle}>⏮</button>
        <button title="Step back (←)" onClick={() => goToStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} style={{ ...ctrlBtnStyle, opacity: currentStep === 0 ? 0.38 : 1 }}>⏪</button>
        <button
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          onClick={() => setIsPlaying(v => !v)}
          style={{ ...ctrlBtnStyle, background: isPlaying ? 'var(--ds-background-information, #E9F2FF)' : 'var(--ds-background-neutral, #F1F2F4)', color: isPlaying ? 'var(--ds-text-information, #0055CC)' : 'var(--ds-text, #172B4D)' }}
        >{isPlaying ? '⏸' : '▶'}</button>
        <button title="Step forward (→)" onClick={() => goToStep(Math.min(total - 1, currentStep + 1))} disabled={currentStep >= total - 1} style={{ ...ctrlBtnStyle, opacity: currentStep >= total - 1 ? 0.38 : 1 }}>⏩</button>
        <button
          title={speed === 1 ? 'Switch to 2×' : 'Switch to 1×'}
          onClick={() => setSpeed(s => s === 1 ? 2 : 1)}
          style={{ ...ctrlBtnStyle, fontSize: 10, background: speed === 2 ? 'var(--ds-background-information, #E9F2FF)' : 'var(--ds-background-neutral, #F1F2F4)', color: speed === 2 ? 'var(--ds-text-information, #0055CC)' : 'var(--ds-text-subtle, #42526E)' }}
        >{speed}×</button>
        <button title="Close replay" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 16, borderRadius: 3 }}>×</button>
      </div>

      {/* METADATA STRIP */}
      <div style={{ height: 36, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, flexShrink: 0, background: 'var(--ds-surface-sunken, #F7F8F9)', borderBottom: '1px solid var(--ds-border, #DFE1E6)', fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
        {br.assignee_name && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Avatar name={br.assignee_name} src={br.assignee_avatar ?? undefined} size="xsmall" />
            {br.assignee_name}
          </span>
        )}
        <span>Created {fmtDate(br.created_at)}</span>
        <span>{spanDays} days total</span>
        <span>{total} hops</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, fontStyle: 'italic' }}>Space = play · ← → = step</span>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 280 }}>

        {/* LEFT 70%: Status timeline */}
        <div style={{ flex: 7, padding: '20px 24px', borderRight: '1px solid var(--ds-border, #DFE1E6)', overflowY: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 4 }}>Status timeline</div>
          <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 24 }}>
            {fmtDate(br.created_at)} → {fmtDate(br.updated_at)} · step {currentStep + 1} of {total}
          </div>

          {/* Step nodes */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ position: 'absolute', top: 19, left: 0, right: 0, height: 1, background: 'var(--ds-border, #DFE1E6)', zIndex: 0 }} />
            {steps.map((step, i) => {
              const isPast = i < currentStep;
              const isActive = i === currentStep;
              const isFuture = i > currentStep;
              return (
                <div key={step} onClick={() => goToStep(i)} title={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, cursor: 'pointer' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                    ...(isActive ? { background: 'var(--ds-background-information-bold, #0055CC)', color: '#FFFFFF', boxShadow: '0 0 0 3px var(--ds-border-information, #CCE0FF)' }
                      : isPast ? { background: 'var(--ds-background-neutral, #F1F2F4)', color: 'var(--ds-text-subtle, #42526E)', border: '1px solid var(--ds-border, #DFE1E6)' }
                      : { background: 'var(--ds-surface, #FFFFFF)', color: 'var(--ds-text-subtlest, #6B778C)', border: '1px dashed var(--ds-border, #DFE1E6)', opacity: 0.38 }),
                  }}>
                    {isPast ? '✓' : isActive ? '●' : '○'}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, textAlign: 'center', lineHeight: 1.3, maxWidth: 72, wordBreak: 'break-word', fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--ds-text-information, #0055CC)' : isPast ? 'var(--ds-text-subtle, #42526E)' : 'var(--ds-text-subtlest, #6B778C)', opacity: isFuture ? 0.5 : 1 }}>
                    {step}
                  </div>
                  {stepDate(i) && <div style={{ fontSize: 10, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2, textAlign: 'center' }}>{stepDate(i)}</div>}
                </div>
              );
            })}
          </div>

          {/* Current step callout */}
          <div style={{ marginTop: 32, padding: '10px 12px', borderLeft: '2px solid var(--ds-border-information, #0055CC)', background: 'var(--ds-background-information, #E9F2FF)', borderRadius: '0 4px 4px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>{steps[currentStep]}</div>
            <div style={{ fontSize: 11, color: 'var(--ds-text-subtle, #42526E)', marginTop: 4 }}>
              Step {currentStep + 1} of {total} · {isPlaying ? 'Playing…' : 'Paused — press ▶ or Space'}
            </div>
          </div>
        </div>

        {/* RIGHT 30%: Journey hierarchy */}
        <div style={{ flex: 3, padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-text-subtle, #42526E)', marginBottom: 12 }}>Journey hierarchy</div>
          <div style={{ padding: '8px 10px', marginBottom: 8, borderLeft: '2px solid var(--ds-border-information, #0055CC)', background: 'var(--ds-background-information, #E9F2FF)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <JiraIssueTypeIcon type="Business Request" size={14} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-link, #0055CC)' }}>{br.request_key ?? 'BR'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ds-text-subtle, #42526E)', marginTop: 2, lineHeight: 1.3 }}>{br.title}</div>
          </div>
          <div style={{ paddingLeft: 10 }}>
            {steps.map((step, i) => {
              const isCur = i === currentStep;
              const wasPast = i < currentStep;
              return (
                <div key={step} onClick={() => goToStep(i)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginBottom: 2, borderRadius: 3, cursor: 'pointer', background: isCur ? 'var(--ds-background-selected, #E9F2FF)' : 'transparent', borderLeft: isCur ? '2px solid var(--ds-border-information, #0055CC)' : '2px solid transparent' }}>
                  <span style={{ fontSize: 10, color: wasPast ? 'var(--ds-text-subtle, #42526E)' : isCur ? 'var(--ds-text-information, #0055CC)' : 'var(--ds-text-subtlest, #6B778C)' }}>
                    {wasPast ? '✓' : isCur ? '●' : '○'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: isCur ? 500 : 400, color: isCur ? 'var(--ds-text-information, #0055CC)' : wasPast ? 'var(--ds-text, #172B4D)' : 'var(--ds-text-subtlest, #6B778C)' }}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM SCRUBBER BAR */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, borderTop: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #FFFFFF)' }}>
        <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', whiteSpace: 'nowrap', minWidth: 64 }}>Step {currentStep + 1} of {total}</span>
        <div
          style={{ flex: 1, height: 16, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const target = Math.round(((e.clientX - rect.left) / rect.width) * (total - 1));
            goToStep(Math.max(0, Math.min(total - 1, target)));
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: 4, borderRadius: 2, background: 'var(--ds-background-neutral, #F1F2F4)' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${scrubberPct}%`, borderRadius: 2, background: 'var(--ds-background-information-bold, #0055CC)' }} />
            <div style={{ position: 'absolute', top: -4, left: `calc(${scrubberPct}% - 6px)`, width: 12, height: 12, borderRadius: '50%', background: 'var(--ds-background-information-bold, #0055CC)', boxShadow: '0 0 0 2px var(--ds-surface, #FFFFFF)' }} />
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ds-text, #172B4D)', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{steps[currentStep]}</span>
        {stepDate(currentStep) && (
          <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', whiteSpace: 'nowrap' }}>{stepDate(currentStep)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Journey detail view ─────────────────────────────────────────────────────

function JourneyView({ br, onBack, onPlayReplay }: { br: QualifyingBR; onBack: () => void; onPlayReplay: () => void }) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button appearance="link" onClick={onBack}>
          ← Back to list
        </Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <JiraIssueTypeIcon type="Business Request" size={16} />
        {br.request_key && (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-link, #0055CC)' }}>
            {br.request_key}
          </span>
        )}
        <span dir="auto" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
          {br.title}
        </span>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 8 }}>
        Status journey · {br.hop_count} steps
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '2px solid var(--ds-border, #DFE1E6)',
          paddingLeft: 12,
        }}
      >
        {br.journey_steps.map((step, i) => {
          const isFirst = i === 0;
          const isLast = i === br.journey_steps.length - 1;
          const date = isFirst ? fmtDate(br.created_at) : isLast ? fmtDate(br.updated_at) : null;
          return (
            <div key={step} style={{ position: 'relative', paddingBottom: isLast ? 0 : 12 }}>
              <div
                style={{
                  position: 'absolute',
                  left: -17,
                  top: 4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isLast
                    ? 'var(--ds-background-information-bold, #0055CC)'
                    : 'var(--ds-border-bold, #758195)',
                  border: '2px solid var(--ds-surface, #FFFFFF)',
                }}
              />
              <BRStatusChip status={step} />
              {date && (
                <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>
                  {isFirst ? `Started ${date}` : `Last updated ${date}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--ds-text-subtlest, #6B778C)',
          marginTop: 12,
          fontStyle: 'italic',
        }}
      >
        Journey inferred from current step — exact transition dates appear as activity is recorded.
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--ds-border, #DFE1E6)' }}>
        <Button
          appearance="primary"
          onClick={onPlayReplay}
        >
          ▶ Play Replay
        </Button>
        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>
          Step-through lifecycle animation
        </span>
      </div>
    </div>
  );
}

// ─── Widget ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

export function ReplayDashboardWidget({ mode }: ReplayDashboardWidgetProps) {
  const { data: brs = [], isLoading, error } = useQualifyingBRs();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<QualifyingBR | null>(null);
  const [theatreMode, setTheatreMode] = useState(false);

  const totalPages = Math.ceil(brs.length / PAGE_SIZE);
  const pageData = useMemo(() => brs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [brs, page]);

  const columns = useMemo<Column<QualifyingBR>[]>(() => {
    const keyRenderer = makeKeyCell(
      (row: QualifyingBR) => row.request_key ?? row.id.slice(0, 8),
      (row: QualifyingBR) => setSelected(row),
      undefined,
      (_row: QualifyingBR) => <JiraIssueTypeIcon type="Business Request" size={14} />,
    );

    return [
      {
        id: 'key',
        label: 'Summary',
        flex: true,
        align: 'start',
        alwaysVisible: true,
        accessor: (row) => row.request_key ?? row.id,
        cell: (props) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, width: '100%', textAlign: 'left' }}>
            {keyRenderer(props)}
            <span
              dir="auto"
              style={{
                fontSize: 13,
                color: 'var(--ds-text, #172B4D)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
                textAlign: 'left',
              }}
            >
              {props.row.title}
            </span>
          </span>
        ),
      },
      {
        id: 'status',
        label: 'Status',
        width: 20,
        accessor: (row) => row.process_step,
        cell: ({ row }) => <BRStatusChip status={row.process_step} />,
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 12,
        accessor: (row) => row.assignee_name,
        cell: ({ row }) => row.assignee_name ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar name={row.assignee_name} src={row.assignee_avatar ?? undefined} size="xsmall" />
            <span style={{ fontSize: 12, color: 'var(--ds-text, #172B4D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
              {row.assignee_name}
            </span>
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', fontStyle: 'italic' }}>—</span>
        ),
      },
      {
        id: '__replay',
        label: '',
        width: 8,
        align: 'end',
        cell: ({ row }) => (
          <button
            className="replay-br-cta"
            onClick={(e) => { e.stopPropagation(); setSelected(row); setTheatreMode(false); }}
            style={{
              opacity: 0,
              transition: 'opacity 0.15s',
              background: 'var(--ds-background-brand-bold, #0055CC)',
              color: 'var(--ds-text-inverse, #FFFFFF)',
              border: 'none',
              borderRadius: 3,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ▶ Replay
          </button>
        ),
      },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (selected && theatreMode) {
    return <TheatreView br={selected} onClose={() => setTheatreMode(false)} />;
  }

  if (selected) {
    return (
      <JourneyView
        br={selected}
        onBack={() => { setSelected(null); setTheatreMode(false); }}
        onPlayReplay={() => setTheatreMode(true)}
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontSize: 13, color: 'var(--ds-text-danger, #AE2A19)', padding: '8px 0' }}>
        Failed to load qualifying business requests.
      </div>
    );
  }

  if (!brs.length) {
    return (
      <div
        style={{
          fontSize: 13,
          color: 'var(--ds-text-subtlest, #6B778C)',
          padding: '16px 0',
          textAlign: 'center',
        }}
      >
        No business requests have advanced to Prioritized Backlog or beyond.
      </div>
    );
  }

  return (
    <>
      <style>{`
        .replay-widget-table tr:hover .replay-br-cta {
          opacity: 1 !important;
        }
      `}</style>

      <div className="replay-widget-table">
        <JiraTable<QualifyingBR>
          columns={columns}
          data={pageData}
          getRowId={(row) => row.id}
          onRowClick={(row) => { setSelected(row); setTheatreMode(false); }}
          density="compact"
          showRowCount={false}
        />
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 8,
            fontSize: 12,
            color: 'var(--ds-text-subtlest, #6B778C)',
          }}
        >
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: page === 0 ? 'default' : 'pointer',
              color: page === 0 ? 'var(--ds-text-disabled, #8590A2)' : 'var(--ds-link, #0055CC)',
              fontSize: 12,
              padding: 0,
            }}
          >
            ← Prev
          </button>
          <span>{page + 1} of {totalPages} · {brs.length} qualifying BRs</span>
          <button
            disabled={page === totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: page === totalPages - 1 ? 'default' : 'pointer',
              color: page === totalPages - 1 ? 'var(--ds-text-disabled, #8590A2)' : 'var(--ds-link, #0055CC)',
              fontSize: 12,
              padding: 0,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}
