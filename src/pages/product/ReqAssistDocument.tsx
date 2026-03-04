/**
 * ReqAssistDocument — Document Detail — Premier Enterprise Layout
 * Route: /product/req-assist/:id
 */
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, FileText, Braces, FileCheck,
  BookOpen, Zap, TestTube, File, ChevronRight, ClipboardList,
  Inbox, FileSearch, Cpu, ShieldCheck, Send, CheckCircle2,
  Star, Globe, Calendar, Upload, Database, Sparkles,
} from 'lucide-react';
import { useBrdDocument, useBrdEpics } from '@/hooks/useReqAssist';
import type { PipelineStage, ArtifactNode, QualityAxes } from '@/types/reqAssist';

/* ── Constants ───────────────────────────────────────────────────── */
const STAGES: PipelineStage[] = ['intake', 'extract', 'process', 'validate', 'distribute', 'complete'];
const STAGE_LABELS: Record<PipelineStage, string> = {
  intake: 'Intake', extract: 'Extract', process: 'Process',
  validate: 'Validate', distribute: 'Distribute', complete: 'Complete', failed: 'Failed',
};
const STAGE_ICONS: Record<PipelineStage, React.ReactNode> = {
  intake: <Inbox size={20} />, extract: <FileSearch size={20} />,
  process: <Cpu size={20} />, validate: <ShieldCheck size={20} />,
  distribute: <Send size={20} />, complete: <CheckCircle2 size={20} />,
  failed: <File size={20} />,
};

const BRD_SECTIONS = [
  'Executive Summary', 'Business Objectives', 'Functional Requirements',
  'Technical Requirements', 'Integration Requirements', 'Acceptance Criteria',
];

/* ── CSS keyframes ───────────────────────────────────────────────── */
const KEYFRAMES_ID = 'ra-doc-v2-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes ra-stage-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function stageIndex(s: PipelineStage): number {
  const i = STAGES.indexOf(s);
  return i === -1 ? 0 : i;
}

function qualityColor(score: number): string {
  if (score >= 85) return '#16A34A';
  if (score >= 70) return '#D97706';
  return '#DC2626';
}

function getStubQuality(score: number | null): QualityAxes {
  if (!score) return { completeness: 0, clarity: 0, traceability: 0, consistency: 0, overall: 0 };
  return {
    completeness: Math.min(100, score + 2),
    clarity: Math.min(100, score - 3),
    traceability: Math.min(100, score + 1),
    consistency: Math.min(100, score - 1),
    overall: score,
  };
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function sourceLabel(s: string): string {
  const map: Record<string, string> = {
    jira_webhook: 'Jira Webhook', jira_bulk: 'Jira Bulk',
    manual_upload: 'Manual Upload', ai_generated: 'AI Generated',
  };
  return map[s] || s;
}

function sourceIcon(s: string) {
  if (s === 'jira_webhook') return <Zap size={14} />;
  if (s === 'jira_bulk') return <Database size={14} />;
  if (s === 'ai_generated') return <Sparkles size={14} />;
  return <Upload size={14} />;
}

function sourceIconColor(s: string): string {
  if (s === 'ai_generated') return '#7C3AED';
  if (s.startsWith('jira')) return '#2563EB';
  return '#64748B';
}

function getArtifactChain(stage: PipelineStage, lang: string): ArtifactNode {
  const idx = stageIndex(stage);
  const s = (i: number): 'complete' | 'pending' => idx >= i ? 'complete' : 'pending';
  return {
    id: '1', label: 'PDF Source', type: 'pdf', status: s(0),
    children: [{
      id: '2', label: 'JSON Extract', type: 'json', status: s(1),
      children: [
        ...(lang === 'ar' ? [{
          id: '2a', label: 'Translation (AR→EN)', type: 'translation' as const, status: s(2), children: [],
        }] : []),
        {
          id: '3', label: 'BRD', type: 'brd' as const, status: s(2),
          children: [
            { id: '4', label: 'WikiHub Chunks', type: 'wiki_chunk' as const, status: s(4), children: [] },
            { id: '5', label: 'Epics', type: 'epic' as const, status: s(4), children: [] },
            { id: '6', label: 'UAT Test Cases', type: 'uat' as const, status: s(4), children: [] },
            { id: '7', label: 'Word Export', type: 'word' as const, status: s(5), children: [] },
          ],
        },
      ],
    }],
  };
}

const ARTIFACT_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText size={14} />, json: <Braces size={14} />,
  brd: <FileCheck size={14} />, wiki_chunk: <BookOpen size={14} />,
  epic: <Zap size={14} />, uat: <TestTube size={14} />,
  word: <File size={14} />, translation: <FileText size={14} />,
};

/* ── StageLozenge (3-color guardrail) ─────────────────────────────── */
function StageLozenge({ stage }: { stage: PipelineStage }) {
  let bg: string, text: string;
  if (stage === 'complete' || stage === 'distribute') { bg = '#E3FCEF'; text = '#006644'; }
  else if (stage === 'intake' || stage === 'extract' || stage === 'process' || stage === 'validate' || stage === 'failed') { bg = '#DFE1E6'; text = '#253858'; }
  else { bg = '#DBEAFE'; text = '#2563EB'; }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px',
      borderRadius: 3, background: bg, color: text,
      fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {stage.toUpperCase()}
    </span>
  );
}

/* ── ArtifactTree ─────────────────────────────────────────────────── */
function ArtifactTree({ node, depth = 0, isLast = true }: { node: ArtifactNode; depth?: number; isLast?: boolean }) {
  const dotColor = node.status === 'complete' ? '#16A34A' : node.status === 'failed' ? '#DC2626' : '#E2E8F0';
  const textColor = node.status === 'complete' ? '#0F172A' : '#94A3B8';
  const iconColor = dotColor;
  return (
    <div style={{ position: 'relative', paddingLeft: depth > 0 ? 20 : 0 }}>
      {depth > 0 && (
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: 1, height: isLast ? 16 : '100%',
          background: '#E2E8F0',
        }} />
      )}
      {depth > 0 && (
        <div style={{
          position: 'absolute', left: 0, top: 16,
          width: 16, height: 1, background: '#E2E8F0',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: dotColor, flexShrink: 0,
        }} />
        <span style={{ color: iconColor, display: 'flex', flexShrink: 0 }}>
          {ARTIFACT_ICONS[node.type] || <File size={14} />}
        </span>
        <span style={{
          fontFamily: "'Inter', sans-serif", fontSize: 13,
          color: textColor, fontWeight: node.status === 'complete' ? 500 : 400,
        }}>
          {node.label}
        </span>
      </div>
      {node.children.length > 0 && (
        <div style={{ position: 'relative' }}>
          {node.children.map((child, i) => (
            <ArtifactTree key={child.id} node={child} depth={depth + 1} isLast={i === node.children.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════ */
export default function ReqAssistDocument() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useBrdDocument(id || '');
  const [activeTab, setActiveTab] = useState<'content' | 'artifacts' | 'quality' | 'history'>('content');

  const currentIdx = doc ? stageIndex(doc.pipeline_stage) : 0;
  const quality = doc ? getStubQuality(doc.quality_score) : null;
  const artifacts = doc ? getArtifactChain(doc.pipeline_stage, doc.language) : null;

  const historyEvents = useMemo(() => {
    if (!doc) return [];
    const events: { title: string; time: string }[] = [];
    events.push({ title: 'Document created', time: doc.created_at });
    const idx = stageIndex(doc.pipeline_stage);
    if (idx >= 1) events.push({ title: 'Queued for extraction', time: doc.created_at });
    if (idx >= 2) events.push({ title: 'Extraction complete', time: doc.updated_at });
    if (idx >= 3) events.push({ title: 'Processing complete', time: doc.updated_at });
    if (doc.quality_score !== null) events.push({ title: `Quality score assigned: ${doc.quality_score}`, time: doc.updated_at });
    if (idx >= 4) events.push({ title: 'Distributed to WikiHub', time: doc.updated_at });
    if (idx >= 5) events.push({ title: 'Pipeline complete', time: doc.updated_at });
    return events;
  }, [doc]);

  if (isLoading || !doc) {
    return (
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ height: 20, width: 120, background: '#F1F5F9', borderRadius: 3 }} />
        <div style={{ height: 14, width: 200, background: '#F1F5F9', borderRadius: 3, marginTop: 12 }} />
      </div>
    );
  }

  const TABS = [
    { key: 'content' as const, label: 'Content' },
    { key: 'artifacts' as const, label: 'Artifacts' },
    { key: 'quality' as const, label: 'Quality' },
    { key: 'history' as const, label: 'History' },
  ];

  return (
    <div style={{
      padding: 24,
      fontFamily: "'Inter', sans-serif",
      background: '#FFFFFF',
      overflowY: 'auto',
      flex: 1,
    }}>
      {/* ═══ SECTION 1 — PAGE HEADER ═══════════════════════════════ */}
      {/* Row 1: Back link */}
      <button
        onClick={() => navigate('/product/req-assist')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          border: 'none', background: 'none', cursor: 'pointer', padding: 0,
          fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#2563EB',
        }}
      >
        <ArrowLeft size={14} /> Pipeline
      </button>

      {/* Row 2: Title + lozenge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {doc.jira_key && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              background: '#F1F5F9', border: '1px solid rgba(15,23,42,0.12)',
              borderRadius: 4, padding: '2px 8px', color: '#64748B',
            }}>
              {doc.jira_key}
            </span>
          )}
          <h1 style={{
            fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700,
            color: '#0F172A', margin: 0,
          }}>
            {doc.title}
          </h1>
        </div>
        <StageLozenge stage={doc.pipeline_stage} />
      </div>

      {/* Row 3: Metric chips */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {/* Quality chip */}
        <MetricChip
          icon={<Star size={14} color={doc.quality_score === null ? '#94A3B8' : doc.quality_score >= 85 ? '#16A34A' : '#D97706'} />}
          label="Quality"
          value={doc.quality_score !== null ? `${doc.quality_score} / 100` : '—'}
          valueColor={doc.quality_score !== null ? qualityColor(doc.quality_score) : '#94A3B8'}
        />
        {/* Source chip */}
        <MetricChip
          icon={<span style={{ color: sourceIconColor(doc.source_type) }}>{sourceIcon(doc.source_type)}</span>}
          label="Source"
          value={sourceLabel(doc.source_type)}
        />
        {/* Language chip */}
        <MetricChip
          icon={<Globe size={14} color="#64748B" />}
          label="Language"
          value={doc.language === 'ar' ? 'Arabic' : 'English'}
        />
        {/* Created chip */}
        <MetricChip
          icon={<Calendar size={14} color="#64748B" />}
          label="Created"
          value={relativeTime(doc.created_at)}
        />
      </div>

      {/* ═══ SECTION 2 — CI/CD PIPELINE STRIP ═════════════════════ */}
      <div style={{
        marginTop: 16, padding: '16px 24px',
        background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)',
        borderRadius: 8, display: 'flex', alignItems: 'center',
      }}>
        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIdx;
          const isActive = i === currentIdx;
          const iconColor = isCompleted ? '#16A34A' : isActive ? '#2563EB' : '#CBD5E1';
          const nameColor = isCompleted ? '#16A34A' : isActive ? '#2563EB' : '#94A3B8';
          const statusText = isCompleted ? 'Done' : isActive ? 'In Progress' : 'Pending';
          const statusColor = iconColor;
          const bg = isCompleted
            ? 'rgba(22,163,74,0.04)'
            : isActive ? 'rgba(37,99,235,0.06)' : 'transparent';
          const border = isActive ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent';

          return (
            <React.Fragment key={stage}>
              {i > 0 && (
                <ChevronRight size={16} color={i <= currentIdx ? '#16A34A' : '#CBD5E1'} style={{ flexShrink: 0, margin: '0 2px' }} />
              )}
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '10px 8px', borderRadius: 6,
                background: bg, border,
              }}>
                <span style={{
                  color: iconColor, display: 'flex',
                  animation: isActive ? 'ra-stage-pulse 1.5s infinite' : 'none',
                }}>
                  {STAGE_ICONS[stage]}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: isActive ? 650 : 500,
                  textTransform: 'uppercase' as const, color: nameColor,
                  letterSpacing: '0.03em',
                }}>
                  {STAGE_LABELS[stage]}
                </span>
                <span style={{ fontSize: 11, color: statusColor }}>
                  {statusText}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ═══ SECTION 3 — TABBED CONTENT ═══════════════════════════ */}
      <div style={{
        marginTop: 20, borderBottom: '1px solid rgba(15,23,42,0.10)',
        display: 'flex', gap: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", fontSize: 13,
              fontWeight: activeTab === t.key ? 650 : 500,
              color: activeTab === t.key ? '#2563EB' : '#64748B',
              borderBottom: activeTab === t.key ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Content ────────────────────────────────────────── */}
      {activeTab === 'content' && (
        <div style={{
          marginTop: 16, background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.10)', borderRadius: 8,
          padding: 24,
        }}>
          {BRD_SECTIONS.map((section, i) => (
            <div key={section}>
              {i > 0 && <div style={{ height: 0.75, background: 'rgba(15,23,42,0.06)', margin: '16px 0' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em', color: '#64748B',
                }}>
                  {section}
                </span>
                <span style={{
                  fontSize: 10, background: '#F1F5F9', color: '#94A3B8',
                  borderRadius: 3, padding: '2px 6px',
                }}>
                  SECTION {i + 1}
                </span>
              </div>
              <div style={{ padding: '8px 0 16px 0' }}>
                {doc.json_data === null ? (
                  <p style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>
                    Awaiting extraction
                  </p>
                ) : (
                  <p style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.7, margin: 0 }}>
                    This section contains the {section.toLowerCase()} for "{doc.title}".
                    Full content will be rendered after pipeline processing is complete.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Artifacts ──────────────────────────────────────── */}
      {activeTab === 'artifacts' && artifacts && (
        <div style={{
          marginTop: 16, background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.10)', borderRadius: 8,
          padding: 24,
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', marginBottom: 16 }}>
            Artifact Chain
          </div>
          <ArtifactTree node={artifacts} />
        </div>
      )}

      {/* ── TAB: Quality ────────────────────────────────────────── */}
      {activeTab === 'quality' && quality && (
        <div style={{
          marginTop: 16, background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.10)', borderRadius: 8,
          padding: 24,
        }}>
          {doc.quality_score === null ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <ClipboardList size={32} color="#CBD5E1" />
              <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 12 }}>
                Quality assessment runs after extraction
              </p>
            </div>
          ) : (
            <>
              {/* Large score */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                  <span style={{
                    fontFamily: "'Sora', sans-serif", fontSize: 48, fontWeight: 700,
                    color: qualityColor(quality.overall),
                  }}>
                    {quality.overall}
                  </span>
                  <span style={{
                    fontFamily: "'Sora', sans-serif", fontSize: 24, color: '#94A3B8',
                  }}>
                    / 100
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>
                  {quality.overall >= 85 ? (
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 4,
                      background: '#E3FCEF', color: '#006644', fontSize: 13,
                    }}>
                      ✓ Auto-distributed to WikiHub
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 4,
                      background: '#FEF3C7', color: '#B45309', fontSize: 13,
                    }}>
                      ⚠ Held for manual review
                    </span>
                  )}
                </div>
              </div>

              {/* 4 axis bars */}
              {[
                { label: 'Completeness', score: quality.completeness },
                { label: 'Clarity', score: quality.clarity },
                { label: 'Traceability', score: quality.traceability },
                { label: 'Consistency', score: quality.consistency },
              ].map(axis => (
                <div key={axis.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#334155', minWidth: 100 }}>{axis.label}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}>
                    <div style={{
                      width: `${axis.score}%`, height: '100%', borderRadius: 4,
                      background: qualityColor(axis.score),
                      transition: 'width 600ms ease',
                    }} />
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                    color: qualityColor(axis.score), minWidth: 28, textAlign: 'right', fontWeight: 500,
                  }}>
                    {axis.score}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── TAB: History ────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{
          marginTop: 16, background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.10)', borderRadius: 8,
          padding: 24,
        }}>
          {historyEvents.map((evt, i) => {
            const isLatest = i === historyEvents.length - 1;
            return (
              <div key={i} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                {/* Connector */}
                {i < historyEvents.length - 1 && (
                  <div style={{
                    position: 'absolute', left: 3.5, top: 12,
                    width: 1, height: 'calc(100% + 4px)', background: '#E2E8F0',
                  }} />
                )}
                {/* Dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                  background: isLatest ? '#2563EB' : '#CBD5E1',
                }} />
                {/* Content */}
                <div style={{ paddingBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{evt.title}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{relativeTime(evt.time)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── MetricChip ────────────────────────────────────────────────────── */
function MetricChip({ icon, label, value, valueColor }: {
  icon: React.ReactNode; label: string; value: string; valueColor?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px',
      background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.08)',
      borderRadius: 6,
    }}>
      {icon}
      <span style={{ fontSize: 12, color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: valueColor || '#0F172A' }}>{value}</span>
    </div>
  );
}
