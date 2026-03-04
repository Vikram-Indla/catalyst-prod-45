/**
 * ReqAssistDocument — Document Detail (Stage C) — GOD-TIER rebuild
 * Route: /product/req-assist/:id
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Sparkles, FileText, Braces, FileCheck,
  BookOpen, Zap, TestTube, File, Download, Upload, Search, BarChart3, Shield,
  Inbox, FileSearch, Cpu, ShieldCheck, Send, CheckCircle2,
} from 'lucide-react';
import { useBrdDocument, useBrdEpics } from '@/hooks/useReqAssist';
import type { PipelineStage, ArtifactNode, QualityAxes } from '@/types/reqAssist';

/* ── Stage config ────────────────────────────────────────────────── */
const STAGES: PipelineStage[] = ['intake', 'extract', 'process', 'validate', 'distribute', 'complete'];
const STAGE_LABELS: Record<PipelineStage, string> = {
  intake: 'Intake', extract: 'Extract', process: 'Process',
  validate: 'Validate', distribute: 'Distribute', complete: 'Complete', failed: 'Failed',
};
const STAGE_ICONS: Record<PipelineStage, React.ReactNode> = {
  intake: <Inbox size={14} />,
  extract: <FileSearch size={14} />,
  process: <Cpu size={14} />,
  validate: <ShieldCheck size={14} />,
  distribute: <Send size={14} />,
  complete: <CheckCircle2 size={14} />,
  failed: <File size={14} />,
};

function stageIndex(s: PipelineStage): number {
  const i = STAGES.indexOf(s);
  return i === -1 ? 0 : i;
}

function qualityColor(score: number): string {
  if (score >= 85) return '#16A34A';
  if (score >= 70) return '#D97706';
  return '#DC2626';
}

/* ── Stub quality data ────────────────────────────────────────────── */
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

/* ── Stub artifact chain ──────────────────────────────────────────── */
function getArtifactChain(stage: PipelineStage, lang: string): ArtifactNode {
  const idx = stageIndex(stage);
  const s = (i: number): 'complete' | 'pending' => idx >= i ? 'complete' : 'pending';
  return {
    id: '1', label: 'PDF Upload', type: 'pdf', status: s(0),
    children: [{
      id: '2', label: 'JSON Extract', type: 'json', status: s(1),
      children: [
        ...(lang === 'ar' ? [{
          id: '2a', label: 'Translation (AR→EN)', type: 'translation' as const, status: s(2), children: [],
        }] : []),
        {
          id: '3', label: 'BRD Structured', type: 'brd' as const, status: s(2),
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

/* ── Artifact type → icon mapping ─────────────────────────────────── */
const ARTIFACT_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText size={14} />,
  json: <Braces size={14} />,
  brd: <FileCheck size={14} />,
  wiki_chunk: <BookOpen size={14} />,
  epic: <Zap size={14} />,
  uat: <TestTube size={14} />,
  word: <File size={14} />,
  translation: <FileText size={14} />,
};

/* ── BRD Section names ───────────────────────────────────────────── */
const BRD_SECTIONS = [
  'Executive Summary',
  'Business Objectives',
  'Functional Requirements',
  'Technical Requirements',
  'Integration Requirements',
  'Acceptance Criteria',
];

/* ── CSS keyframes (injected once) ────────────────────────────────── */
const KEYFRAMES_ID = 'ra-doc-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes ra-active-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
      70%  { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
      100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
    }
  `;
  document.head.appendChild(style);
}

/* ════════════════════════════════════════════════════════════════════
   ARTIFACT TREE — vertical tree with connector lines
   ════════════════════════════════════════════════════════════════════ */
function ArtifactTree({ node, depth = 0, isLast = true }: { node: ArtifactNode; depth?: number; isLast?: boolean }) {
  const dotColor = node.status === 'complete' ? '#16A34A' : node.status === 'failed' ? '#DC2626' : '#CBD5E1';
  const textColor = node.status === 'complete' ? '#0F172A' : '#94A3B8';
  const iconColor = node.status === 'complete' ? '#64748B' : '#CBD5E1';
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ position: 'relative', paddingLeft: depth > 0 ? 16 : 0 }}>
      {/* Vertical connector from parent */}
      {depth > 0 && (
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: 1, height: isLast ? 14 : '100%',
          background: '#E2E8F0',
        }} />
      )}
      {/* Horizontal connector */}
      {depth > 0 && (
        <div style={{
          position: 'absolute', left: 0, top: 14,
          width: 12, height: 1,
          background: '#E2E8F0',
        }} />
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 0', position: 'relative',
      }}>
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

      {hasChildren && (
        <div style={{ position: 'relative' }}>
          {node.children.map((child, i) => (
            <ArtifactTree
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={i === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   QUALITY BAR
   ════════════════════════════════════════════════════════════════════ */
function QualityBar({ label, score, pending }: { label: string; score: number; pending?: boolean }) {
  const color = pending ? '#CBD5E1' : qualityColor(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{
        fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#334155',
        minWidth: 90, fontWeight: 450,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: '#F1F5F9', overflow: 'hidden',
      }}>
        {!pending && (
          <div style={{
            width: `${score}%`, height: '100%',
            borderRadius: 3, background: color,
            transition: 'width 600ms ease',
          }} />
        )}
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
        color: pending ? '#94A3B8' : color,
        minWidth: 28, textAlign: 'right', fontWeight: 500,
      }}>
        {pending ? '--' : score}
      </span>
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

  if (isLoading || !doc) {
    return (
      <div style={{ padding: '24px 32px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ height: 20, width: 120, background: '#F1F5F9', borderRadius: 3 }} />
        <div style={{ height: 14, width: 200, background: '#F1F5F9', borderRadius: 3, marginTop: 12 }} />
        <div style={{ height: 64, background: '#F8FAFC', borderRadius: 6, marginTop: 24 }} />
      </div>
    );
  }

  const currentIdx = stageIndex(doc.pipeline_stage);
  const quality = getStubQuality(doc.quality_score);
  const artifacts = getArtifactChain(doc.pipeline_stage, doc.language);
  const isPending = quality.overall === 0;

  return (
    <div style={{
      padding: '24px 32px',
      fontFamily: "'Inter', sans-serif",
      overflowY: 'auto',
    }}>
      {/* ── Back link ─────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/product/req-assist')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16,
          border: 'none', background: 'none', cursor: 'pointer',
          fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#64748B',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
        onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
      >
        <ArrowLeft size={14} /> Pipeline
      </button>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        {doc.jira_key && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            background: '#F1F5F9', borderRadius: 3, padding: '2px 6px',
            color: '#64748B',
          }}>
            {doc.jira_key}
          </span>
        )}
        <h1 style={{
          fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700,
          color: '#0F172A', margin: 0,
        }}>
          {doc.title}
        </h1>
        <StageLozenge stage={doc.pipeline_stage} />
        {doc.quality_score !== null && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
            color: qualityColor(doc.quality_score),
            background: doc.quality_score >= 85 ? 'rgba(22,163,74,0.08)' : doc.quality_score >= 70 ? 'rgba(217,119,6,0.08)' : 'rgba(220,38,38,0.08)',
            borderRadius: 3, padding: '2px 6px',
          }}>
            {doc.quality_score}/100
          </span>
        )}
      </div>

      {/* ═══ 6-STAGE PROGRESS BAR ═══════════════════════════════ */}
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '20px 0 8px', marginBottom: 24, height: 72,
      }}>
        {/* Base connector line */}
        <div style={{
          position: 'absolute', top: 36, left: 32, right: 32,
          height: 2, background: '#E2E8F0', zIndex: 0,
        }} />
        {/* Completed connector overlay */}
        {currentIdx > 0 && (
          <div style={{
            position: 'absolute', top: 36, left: 32,
            width: `calc(${((currentIdx) / (STAGES.length - 1)) * 100}% - 64px)`,
            height: 2, background: '#16A34A', zIndex: 1,
          }} />
        )}

        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIdx;
          const isActive = i === currentIdx;

          return (
            <div key={stage} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, zIndex: 2, flex: 1,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted ? '#16A34A' : isActive ? '#2563EB' : '#FFFFFF',
                border: (!isCompleted && !isActive) ? '1.5px solid #E2E8F0' : 'none',
                color: isCompleted || isActive ? '#FFFFFF' : '#CBD5E1',
                animation: isActive ? 'ra-active-pulse 1.5s infinite' : 'none',
                transition: 'all 300ms ease',
              }}>
                {isCompleted ? <Check size={14} /> : STAGE_ICONS[stage]}
              </div>
              <span style={{
                fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500,
                textTransform: 'uppercase' as const, color: '#64748B',
                letterSpacing: '0.03em',
              }}>
                {STAGE_LABELS[stage]}
              </span>
            </div>
          );
        })}
      </div>

      {/* ═══ TWO-COLUMN LAYOUT ═══════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: BRD Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid rgba(15,23,42,0.12)',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {BRD_SECTIONS.map((section, i) => (
              <div key={section}>
                {/* Divider between sections */}
                {i > 0 && (
                  <div style={{ height: 0.75, background: 'rgba(15,23,42,0.06)' }} />
                )}

                {/* Section header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px 8px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500,
                      textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                      color: '#64748B',
                    }}>
                      {section}
                    </span>
                    <span style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500,
                      textTransform: 'uppercase' as const,
                      color: '#64748B', background: '#F1F5F9',
                      borderRadius: 3, padding: '2px 6px',
                    }}>
                      Section {i + 1}
                    </span>
                  </div>
                  {i >= 1 && i <= 4 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(124,58,237,0.08)',
                      border: '1px solid rgba(124,58,237,0.15)',
                      color: '#7C3AED',
                      fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
                    }}>
                      <Sparkles size={12} /> AI Enhanced
                    </span>
                  )}
                </div>

                {/* Section body */}
                <div style={{ padding: '4px 20px 16px 20px' }}>
                  <p style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 14,
                    color: '#0F172A', lineHeight: 1.6, margin: 0,
                  }}>
                    {doc.pipeline_stage === 'intake'
                      ? 'Content pending extraction…'
                      : `This section contains the ${section.toLowerCase()} for "${doc.title}". Full content will be rendered after pipeline processing is complete.`
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar (320px) */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ═══ ARTIFACT CHAIN ═══════════════════════════════════ */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid rgba(15,23,42,0.12)',
            borderRadius: 6, padding: 16,
          }}>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
              textTransform: 'uppercase' as const, letterSpacing: '0.04em',
              color: '#64748B', marginBottom: 12,
            }}>
              Artifact Chain
            </div>
            <ArtifactTree node={artifacts} />
          </div>

          {/* ═══ QUALITY CARD ════════════════════════════════════ */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid rgba(15,23,42,0.12)',
            borderRadius: 6, padding: 16,
          }}>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
              textTransform: 'uppercase' as const, letterSpacing: '0.04em',
              color: '#64748B', marginBottom: 12,
            }}>
              Quality Assessment
            </div>

            <QualityBar label="Completeness" score={quality.completeness} pending={isPending} />
            <QualityBar label="Clarity" score={quality.clarity} pending={isPending} />
            <QualityBar label="Traceability" score={quality.traceability} pending={isPending} />
            <QualityBar label="Consistency" score={quality.consistency} pending={isPending} />

            <div style={{
              borderTop: '0.75px solid rgba(15,23,42,0.06)',
              paddingTop: 12, marginTop: 8, textAlign: 'center',
            }}>
              {isPending ? (
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13,
                  color: '#94A3B8', margin: 0,
                }}>
                  Quality assessment pending…
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                    <span style={{
                      fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 650,
                      color: qualityColor(quality.overall),
                    }}>
                      {quality.overall}
                    </span>
                    <span style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#94A3B8',
                    }}>
                      / 100
                    </span>
                  </div>
                  <div style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 12,
                    color: '#64748B', marginTop: 4,
                  }}>
                    Overall Quality Score
                  </div>
                  {/* Status chip */}
                  <div style={{ marginTop: 8 }}>
                    {quality.overall >= 85 ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 4,
                        background: '#E3FCEF', color: '#006644',
                        fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
                      }}>
                        ✓ Auto-distributed
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 4,
                        background: '#FEF3C7', color: '#B45309',
                        fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
                      }}>
                        ⚠ Held for review
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── StageLozenge ──────────────────────────────────────────────────── */
function StageLozenge({ stage }: { stage: PipelineStage }) {
  const MAP: Record<string, { bg: string; text: string }> = {
    complete:   { bg: '#E3FCEF', text: '#006644' },
    distribute: { bg: '#E3FCEF', text: '#006644' },
    intake:     { bg: '#F1F5F9', text: '#64748B' },
    failed:     { bg: '#FEE2E2', text: '#DC2626' },
  };
  const c = MAP[stage] || { bg: '#DBEAFE', text: '#2563EB' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px',
      borderRadius: 3, background: c.bg, color: c.text,
      fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {stage.toUpperCase()}
    </span>
  );
}
