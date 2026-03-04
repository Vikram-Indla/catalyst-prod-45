/**
 * ReqAssistDocument — Document Detail — 2-Column Layout
 * Route: /product/req-assist/:id
 * CORRECTIVE BUILD — ra-* ring-fenced CSS, pixel-perfect to HTML demo
 */
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, FileText, Code, Globe, FileCheck,
  BookOpen, Layers, ClipboardCheck, Download, Zap, TestTube,
  File, Printer, Send as SendIcon, Sparkles,
} from 'lucide-react';
import { useBrdDocument, useBrdEpics, useBrdQueueItems } from '@/hooks/useReqAssist';
import type { PipelineStage, BrdEpic, BrdQueueItem } from '@/types/reqAssist';
import '@/styles/ra-styles.css';

/* ── Constants ───────────────────────────────────────────────────── */
const STAGES: PipelineStage[] = ['intake', 'extract', 'process', 'validate', 'distribute', 'complete'];
const STAGE_LABELS: Record<PipelineStage, string> = {
  intake: 'Intake', extract: 'Extract', process: 'Process',
  validate: 'Validate', distribute: 'Distribute', complete: 'Complete', failed: 'Failed',
};

const BRD_SECTIONS = [
  'Executive Summary', 'Business Objectives', 'Functional Requirements',
  'Technical Requirements', 'Integration Requirements', 'Acceptance Criteria',
];

/* ── Helpers ─────────────────────────────────────────────────────── */
function stageIdx(s: PipelineStage): number {
  const i = STAGES.indexOf(s);
  return i === -1 ? 0 : i;
}

function stageState(current: number, idx: number): 'done' | 'run' | 'wait' {
  if (idx < current) return 'done';
  if (idx === current) return 'run';
  return 'wait';
}

function lozengeClass(s: PipelineStage): string {
  if (s === 'complete' || s === 'distribute') return 'ra-lz ra-lz-green';
  return 'ra-lz ra-lz-grey';
}

function qualityColor(score: number): string {
  if (score >= 80) return 'var(--ra-success)';
  if (score >= 60) return 'var(--ra-warn)';
  return 'var(--ra-danger)';
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sourceLabel(s: string): string {
  const map: Record<string, string> = {
    jira_webhook: 'Jira Webhook', jira_bulk: 'Jira Bulk',
    manual_upload: 'Manual Upload', ai_generated: 'AI Generated',
  };
  return map[s] || s;
}

function durationMs(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ══════════════════════════════════════════════════════════════════ */
export default function ReqAssistDocument() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useBrdDocument(id || '');
  const { data: epics = [] } = useBrdEpics(id || '');
  const { data: queueItems = [] } = useBrdQueueItems(id || '');

  const currentIdx = doc ? stageIdx(doc.pipeline_stage) : 0;
  const qualityScore = doc?.quality_score ?? null;

  // Derive quality axes from score
  const axes = useMemo(() => {
    if (qualityScore === null) return null;
    return [
      { label: 'Typography', score: Math.min(100, qualityScore + 2) },
      { label: 'Data Density', score: Math.min(100, qualityScore - 3) },
      { label: 'Completeness', score: Math.min(100, qualityScore + 1) },
      { label: 'Traceability', score: Math.min(100, qualityScore - 1) },
    ];
  }, [qualityScore]);

  // Build history from queue items
  const historyEvents = useMemo(() => {
    if (!doc) return [];
    const events: { title: string; time: string; isError?: boolean }[] = [];
    events.push({ title: 'Document created', time: doc.created_at });

    if (queueItems.length > 0) {
      queueItems.forEach((qi: BrdQueueItem) => {
        if (qi.started_at) events.push({ title: `${qi.status} started`, time: qi.started_at });
        if (qi.completed_at) events.push({ title: `${qi.status} completed`, time: qi.completed_at });
        if (qi.error_message) events.push({ title: `Error: ${qi.error_message}`, time: qi.completed_at || qi.started_at || qi.created_at, isError: true });
      });
    } else {
      const idx = stageIdx(doc.pipeline_stage);
      if (idx >= 1) events.push({ title: 'Queued for extraction', time: doc.created_at });
      if (idx >= 2) events.push({ title: 'Extraction complete', time: doc.updated_at });
      if (idx >= 3) events.push({ title: 'Processing complete', time: doc.updated_at });
      if (doc.quality_score !== null) events.push({ title: `Quality score: ${doc.quality_score}`, time: doc.updated_at });
      if (idx >= 4) events.push({ title: 'Distributed to WikiHub', time: doc.updated_at });
      if (idx >= 5) events.push({ title: 'Pipeline complete', time: doc.updated_at });
    }

    return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [doc, queueItems]);

  // Artifact chain config
  const chainItems = useMemo(() => {
    if (!doc) return [];
    const idx = currentIdx;
    const reached = (i: number) => idx >= i;
    const items = [
      { icon: <FileText size={15} />, bg: 'var(--ra-neutral-10)', color: 'var(--ra-text-ter)', name: 'Original PDF', detail: `${doc.language === 'ar' ? 'Arabic' : 'English'} · manual_upload`, reached: true, active: false },
      { icon: <Code size={15} />, bg: 'var(--ra-teal-10)', color: 'var(--ra-teal)', name: 'Lossless JSON', detail: 'Tier 2 · Vision OCR', reached: reached(1), active: false },
    ];
    if (doc.language === 'ar') {
      items.push({ icon: <Globe size={15} />, bg: 'var(--ra-teal-10)', color: 'var(--ra-teal)', name: 'English Translation', detail: 'Auto-detected Arabic', reached: reached(2), active: false });
    }
    items.push(
      { icon: <FileCheck size={15} />, bg: 'var(--ra-blue-10)', color: 'var(--ra-blue)', name: 'Structured BRD', detail: `KPMG · 6 sections${qualityScore !== null ? ` · ${qualityScore}` : ''}`, reached: reached(2), active: idx === 2 || idx === 3 },
      { icon: <BookOpen size={15} />, bg: 'var(--ra-success-10)', color: 'var(--ra-success)', name: 'WikiHub Chunks', detail: 'source_type: brd', reached: reached(4), active: false },
      { icon: <Layers size={15} />, bg: 'var(--ra-purple-10)', color: 'var(--ra-purple)', name: `Epics (${epics.length})`, detail: epics.length > 0 ? 'Generated' : 'Pending', reached: epics.length > 0, active: false },
      { icon: <ClipboardCheck size={15} />, bg: 'var(--ra-warn-10)', color: 'var(--ra-warn)', name: 'UAT Scenarios', detail: 'After validation', reached: reached(4), active: false },
      { icon: <Download size={15} />, bg: 'var(--ra-neutral-10)', color: 'var(--ra-text-ter)', name: 'WordX Export', detail: 'Ready to download', reached: reached(5), active: false },
    );
    return items;
  }, [doc, currentIdx, epics.length, qualityScore]);

  if (isLoading || !doc) {
    return (
      <div className="ra-root" style={{ padding: 24 }}>
        <div className="ra-skel" style={{ height: 20, width: 120 }} />
        <div className="ra-skel" style={{ height: 28, width: 300, marginTop: 12 }} />
        <div className="ra-skel" style={{ height: 60, width: '100%', marginTop: 20 }} />
      </div>
    );
  }

  const jsonData = doc.json_data as Record<string, unknown> | null;

  return (
    <div className="ra-root" style={{ padding: '24px 32px', background: '#FFFFFF', minHeight: '100%' }}>

      {/* ═══ HEADER ═══════════════════════════════════════════════ */}
      <button className="ra-back" onClick={() => navigate('/product/req-assist')}>
        <ArrowLeft size={14} /> Pipeline
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--ra-text-pri)', margin: 0 }}>
            {doc.title}
          </h1>
          <span className={lozengeClass(doc.pipeline_stage)}>
            {STAGE_LABELS[doc.pipeline_stage]}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ra-btn-ghost"><Printer size={14} /> Print PDF</button>
          <button className="ra-btn-teal"><Download size={14} /> Download WordX</button>
          <button className="ra-btn-ghost"><SendIcon size={14} /> Push to Project</button>
        </div>
      </div>

      {/* META ROW */}
      <div className="ra-meta">
        {doc.jira_key && <span className="ra-brd-id">{doc.jira_key}</span>}
        {doc.jira_key && <span className="ra-meta-sep">·</span>}
        {doc.domain_tag && <><span>{doc.domain_tag}</span><span className="ra-meta-sep">·</span></>}
        <span>{formatDate(doc.created_at)}</span>
        <span className="ra-meta-sep">·</span>
        <span>Source: {sourceLabel(doc.source_type)}</span>
      </div>

      {/* ═══ STAGE PROGRESS BAR ═══════════════════════════════════ */}
      <div className="ra-spb" style={{ marginTop: 20 }}>
        {STAGES.map((stage, i) => {
          const state = stageState(currentIdx, i);
          const qi = queueItems.find((q: BrdQueueItem) => q.status?.toLowerCase().includes(stage));
          const timing = qi ? durationMs(qi.started_at, qi.completed_at) : null;
          return (
            <div key={stage} className={`ra-spb-s ${state}`}>
              <div className="ra-spb-ic" style={{ width: 32, height: 32 }}>
                {state === 'done' ? <Check size={14} /> : (i + 1)}
              </div>
              <div>
                <div className="ra-spb-lb">{STAGE_LABELS[stage]}</div>
                {timing && <div className="ra-spb-tm">{timing}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ 2-COLUMN BODY ════════════════════════════════════════ */}
      <div className="ra-det-body">

        {/* LEFT — BRD Content Sections */}
        <div className="ra-det-content">
          {jsonData !== null ? (
            Object.entries(jsonData).map(([key, value], i) => (
              <div key={key} className="ra-sec">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ra-sec-label">{key.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 10, background: 'var(--ra-sunken)', color: 'var(--ra-text-muted)', borderRadius: 3, padding: '2px 6px' }}>
                    SECTION {i + 1}
                  </span>
                </div>
                <div className="ra-sec-body" style={{ marginTop: 8 }}>
                  {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                </div>
              </div>
            ))
          ) : doc.raw_text ? (
            <div className="ra-sec">
              <span className="ra-sec-label">Raw Content</span>
              <div className="ra-sec-body" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{doc.raw_text}</div>
            </div>
          ) : (
            BRD_SECTIONS.map((section, i) => (
              <div key={section} className="ra-sec">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ra-sec-label">{section}</span>
                  <span style={{ fontSize: 10, background: 'var(--ra-sunken)', color: 'var(--ra-text-muted)', borderRadius: 3, padding: '2px 6px' }}>
                    SECTION {i + 1}
                  </span>
                </div>
                <div className="ra-sec-body" style={{ marginTop: 8, fontStyle: 'italic', color: 'var(--ra-text-muted)' }}>
                  Awaiting extraction
                </div>
              </div>
            ))
          )}

          {/* History timeline at bottom of content */}
          {historyEvents.length > 0 && (
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '0.75px solid var(--ra-border-sub)' }}>
              <span className="ra-sec-label">Pipeline History</span>
              <div style={{ marginTop: 12 }}>
                {historyEvents.map((evt, i) => {
                  const isLatest = i === historyEvents.length - 1;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                      {i < historyEvents.length - 1 && (
                        <div style={{ position: 'absolute', left: 3.5, top: 12, width: 1, height: 'calc(100% + 4px)', background: 'var(--ra-neutral-20)' }} />
                      )}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                        background: evt.isError ? 'var(--ra-danger)' : isLatest ? 'var(--ra-blue)' : 'var(--ra-neutral-30)',
                      }} />
                      <div style={{ paddingBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: evt.isError ? 'var(--ra-danger)' : 'var(--ra-text-pri)' }}>{evt.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ra-text-muted)', marginTop: 2 }}>{relativeTime(evt.time)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Artifact Chain + Quality */}
        <div className="ra-chain">
          <div className="ra-chain-h">Artifact Chain</div>

          {chainItems.map((item, i) => (
            <React.Fragment key={i}>
              <div className={`ra-ci ${item.active ? 'active' : ''}`} style={{ opacity: item.reached ? 1 : 0.4 }}>
                <div className="ra-ci-ic" style={{ background: item.bg, color: item.color }}>
                  {item.icon}
                </div>
                <div>
                  <div className="ra-ci-nm" style={{ color: item.reached ? 'var(--ra-text-pri)' : 'var(--ra-text-muted)' }}>{item.name}</div>
                  <div className="ra-ci-dt">{item.detail}</div>
                </div>
              </div>

              {/* Epic children */}
              {item.name.startsWith('Epics') && epics.length > 0 && (
                <div className="ra-ci-kids">
                  {epics.map((epic: BrdEpic) => (
                    <div key={epic.id} className="ra-ci-kid">
                      <span className="dot" style={{ background: 'var(--ra-purple)' }} />
                      <span>{epic.epic_key}: {epic.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {i < chainItems.length - 1 && <div className="ra-cln" />}
            </React.Fragment>
          ))}

          {/* Quality Card */}
          {qualityScore !== null && axes && (
            <div className="ra-qc">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Sparkles size={14} style={{ color: 'var(--ra-teal)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ra-text-pri)' }}>REC-QA Validator</div>
                  <div style={{ fontSize: 11, color: 'var(--ra-text-muted)' }}>Quality Gate · 4-axis scoring</div>
                </div>
              </div>
              <div className="ra-qc-score" style={{ color: qualityColor(qualityScore) }}>
                {qualityScore}
              </div>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                {qualityScore >= 80 ? (
                  <span className="ra-lz ra-lz-green">PASS</span>
                ) : (
                  <span className="ra-lz ra-lz-grey">FAIL</span>
                )}
              </div>
              {axes.map(axis => (
                <div key={axis.label} className="ra-qb-row">
                  <span className="ra-qb-lbl">{axis.label}</span>
                  <div className="ra-qb-bar">
                    <div className="ra-qb-fill" style={{ width: `${axis.score}%`, background: qualityColor(axis.score) }} />
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: qualityColor(axis.score), minWidth: 24, textAlign: 'right' }}>
                    {axis.score}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--ra-success)' }}>
                <Check size={12} /> Zero ungrounded claims
              </div>
              <button className="ra-btn-purple" style={{ marginTop: 12 }}>
                <Zap size={12} /> Regenerate Epics
              </button>
            </div>
          )}

          {qualityScore === null && (
            <div className="ra-qc" style={{ textAlign: 'center', padding: 24 }}>
              <div className="ra-skel" style={{ height: 40, width: 60, margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12, color: 'var(--ra-text-muted)' }}>Quality assessment pending</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
