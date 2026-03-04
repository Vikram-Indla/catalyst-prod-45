/**
 * ReqAssistDocument — Document Detail (Stage C)
 * Route: /product/req-assist/:id
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { useBrdDocument, useBrdEpics } from '@/hooks/useReqAssist';
import type { PipelineStage, ArtifactNode, QualityAxes } from '@/types/reqAssist';

/* ── helpers ──────────────────────────────────────────────────────── */
const STAGES: PipelineStage[] = ['intake', 'extract', 'process', 'validate', 'distribute', 'complete'];
const STAGE_LABELS: Record<PipelineStage, string> = {
  intake: 'Intake', extract: 'Extract', process: 'Process',
  validate: 'Validate', distribute: 'Distribute', complete: 'Complete', failed: 'Failed',
};

function stageIndex(s: PipelineStage): number {
  const i = STAGES.indexOf(s);
  return i === -1 ? 0 : i;
}

function qualityColor(score: number): string {
  if (score >= 85) return 'var(--cp-success-60)';
  if (score >= 70) return 'var(--cp-warning-60)';
  return 'var(--cp-danger-60)';
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

/* ── Stub artifact chain based on stage ─────────────────────────── */
function getArtifactChain(stage: PipelineStage, lang: string): ArtifactNode {
  const idx = stageIndex(stage);
  const s = (i: number): 'complete' | 'pending' => idx >= i ? 'complete' : 'pending';
  const root: ArtifactNode = {
    id: '1', label: 'PDF Upload', type: 'pdf', status: s(0),
    children: [{
      id: '2', label: 'JSON Extract', type: 'json', status: s(1),
      children: [
        ...(lang === 'ar' ? [{
          id: '2a', label: 'Translation (AR→EN)', type: 'translation' as const, status: s(2),
          children: [],
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
  return root;
}

/* ── BRD Section names ───────────────────────────────────────────── */
const BRD_SECTIONS = [
  'Executive Summary',
  'Business Objectives',
  'Functional Requirements',
  'Technical Requirements',
  'Integration Requirements',
  'Acceptance Criteria',
];

/* ── Artifact tree renderer ──────────────────────────────────────── */
function ArtifactTree({ node, depth = 0 }: { node: ArtifactNode; depth?: number }) {
  const dotColor = node.status === 'complete' ? 'var(--cp-success-60)' : node.status === 'failed' ? 'var(--cp-danger-60)' : 'var(--cp-text-muted)';
  const textColor = node.status === 'complete' ? 'var(--cp-text-primary)' : node.status === 'failed' ? 'var(--cp-danger-60)' : 'var(--cp-text-muted)';
  return (
    <div style={{ paddingLeft: depth * 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: textColor }}>{node.label}</span>
      </div>
      {node.children.map(c => <ArtifactTree key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

/* ── Quality bar ─────────────────────────────────────────────────── */
function QualityBar({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-secondary)', minWidth: 90 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--cp-bg-sunken)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: qualityColor(score) }} />
      </div>
      <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: qualityColor(score), minWidth: 28, textAlign: 'right' }}>
        {score}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function ReqAssistDocument() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useBrdDocument(id || '');

  if (isLoading || !doc) {
    return (
      <div style={{ padding: '24px 32px', fontFamily: 'var(--cp-font-body)' }}>
        <div style={{ height: 20, width: 120, background: 'var(--cp-bg-sunken)', borderRadius: 3, animation: 'ra-skeleton 1.5s ease-in-out infinite' }} />
      </div>
    );
  }

  const currentIdx = stageIndex(doc.pipeline_stage);
  const quality = getStubQuality(doc.quality_score);
  const artifacts = getArtifactChain(doc.pipeline_stage, doc.language);

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--cp-font-body)' }}>
      {/* ── Back link ─────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/product/req-assist')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16,
          border: 'none', background: 'none', cursor: 'pointer',
          fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-tertiary)',
        }}
      >
        <ArrowLeft size={14} /> Pipeline
      </button>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        {doc.jira_key && (
          <span style={{
            fontFamily: 'var(--cp-font-mono)', fontSize: 12,
            background: 'var(--cp-bg-sunken)', borderRadius: 3, padding: '2px 6px',
            color: 'var(--cp-text-tertiary)',
          }}>
            {doc.jira_key}
          </span>
        )}
        <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--cp-text-primary)', margin: 0 }}>
          {doc.title}
        </h1>
        {/* Stage lozenge */}
        <StageLozenge stage={doc.pipeline_stage} />
        {/* Quality badge */}
        {doc.quality_score !== null && (
          <span style={{
            fontFamily: 'var(--cp-font-mono)', fontSize: 12, fontWeight: 600,
            color: qualityColor(doc.quality_score),
            background: doc.quality_score >= 85 ? 'rgba(22,163,74,0.08)' : doc.quality_score >= 70 ? 'rgba(217,119,6,0.08)' : 'rgba(220,38,38,0.08)',
            borderRadius: 3, padding: '2px 6px',
          }}>
            {doc.quality_score}/100
          </span>
        )}
      </div>

      {/* ── 6-Stage Progress Bar ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0', marginBottom: 24, position: 'relative',
      }}>
        {/* Connector line */}
        <div style={{
          position: 'absolute', top: '50%', left: 24, right: 24,
          height: 1, background: 'var(--cp-border-subtle)', transform: 'translateY(-8px)',
        }} />
        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIdx;
          const isActive = i === currentIdx;
          return (
            <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1, flex: 1 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted ? 'var(--cp-success-60)' : isActive ? 'var(--cp-primary-60)' : 'var(--cp-bg-elevated)',
                border: isCompleted || isActive ? 'none' : '1px solid var(--cp-border-default)',
                animation: isActive ? 'ra-stage-pulse 2s infinite' : 'none',
              }}>
                {isCompleted && <Check size={13} style={{ color: '#FFFFFF' }} />}
                {isActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }} />}
              </div>
              <span style={{
                fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 500,
                textTransform: 'uppercase', color: 'var(--cp-text-tertiary)',
              }}>
                {STAGE_LABELS[stage]}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: BRD Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: 'var(--cp-bg-page)', border: '1px solid var(--cp-border-default)',
            borderRadius: 6, padding: 24,
          }}>
            {BRD_SECTIONS.map((section, i) => (
              <div key={section} style={{ marginBottom: i < BRD_SECTIONS.length - 1 ? 20 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 500,
                      textTransform: 'uppercase', color: 'var(--cp-text-tertiary)',
                    }}>
                      {section}
                    </span>
                    <span style={{
                      fontFamily: 'var(--cp-font-body)', fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', color: 'var(--cp-text-muted)',
                      background: 'var(--cp-lozenge-grey-bg)', borderRadius: 3, padding: '1px 5px',
                    }}>
                      Section {i + 1}
                    </span>
                  </div>
                  {i >= 1 && i <= 4 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px',
                      borderRadius: 3, background: 'rgba(124,58,237,0.08)', color: 'var(--cp-purple-60)',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      <Sparkles size={12} /> AI Enhanced
                    </span>
                  )}
                </div>
                {i < BRD_SECTIONS.length - 1 && (
                  <div style={{ borderBottom: '0.75px solid var(--cp-border-subtle)', marginBottom: 8 }} />
                )}
                <p style={{
                  fontFamily: 'var(--cp-font-body)', fontSize: 14, color: 'var(--cp-text-primary)',
                  lineHeight: 1.6, margin: 0,
                }}>
                  {doc.pipeline_stage === 'intake'
                    ? 'Content pending extraction…'
                    : `This section contains the ${section.toLowerCase()} for "${doc.title}". Full content will be rendered after pipeline processing is complete.`
                  }
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar (320px) */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Artifact Chain */}
          <div style={{
            background: 'var(--cp-bg-surface)', border: '1px solid var(--cp-border-default)',
            borderRadius: 6, padding: 16,
          }}>
            <div style={{
              fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 500,
              textTransform: 'uppercase', color: 'var(--cp-text-tertiary)', marginBottom: 12,
            }}>
              Artifact Chain
            </div>
            <ArtifactTree node={artifacts} />
          </div>

          {/* Quality Card */}
          <div style={{
            background: 'var(--cp-bg-surface)', border: '1px solid var(--cp-border-default)',
            borderRadius: 6, padding: 16,
          }}>
            <div style={{
              fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 500,
              textTransform: 'uppercase', color: 'var(--cp-text-tertiary)', marginBottom: 12,
            }}>
              Quality Assessment
            </div>
            {quality.overall > 0 ? (
              <>
                <QualityBar label="Completeness" score={quality.completeness} />
                <QualityBar label="Clarity" score={quality.clarity} />
                <QualityBar label="Traceability" score={quality.traceability} />
                <QualityBar label="Consistency" score={quality.consistency} />
                <div style={{ borderTop: '0.75px solid var(--cp-border-subtle)', paddingTop: 12, marginTop: 8, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 32, fontWeight: 650, color: qualityColor(quality.overall) }}>
                      {quality.overall}
                    </span>
                    <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 14, color: 'var(--cp-text-muted)' }}>/ 100</span>
                  </div>
                  <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-tertiary)', marginTop: 4 }}>
                    Overall Quality Score
                  </div>
                  <div style={{
                    fontFamily: 'var(--cp-font-body)', fontSize: 12, marginTop: 6,
                    color: quality.overall >= 85 ? 'var(--cp-success-60)' : 'var(--cp-warning-60)',
                  }}>
                    {quality.overall >= 85 ? '✓ Auto-distributed' : '⚠ Held for review'}
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-muted)' }}>
                Quality assessment pending…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── StageLozenge (local, matching dashboard) ──────────────────── */
function StageLozenge({ stage }: { stage: PipelineStage }) {
  const LOZENGE_MAP: Record<string, { bg: string; text: string }> = {
    complete:   { bg: 'var(--cp-lozenge-green-bg)', text: 'var(--cp-lozenge-green-text)' },
    distribute: { bg: 'var(--cp-lozenge-green-bg)', text: 'var(--cp-lozenge-green-text)' },
    intake:     { bg: 'var(--cp-lozenge-grey-bg)',  text: 'var(--cp-lozenge-grey-text)' },
    failed:     { bg: 'var(--cp-lozenge-grey-bg)',  text: 'var(--cp-lozenge-grey-text)' },
  };
  const c = LOZENGE_MAP[stage] || { bg: 'var(--cp-lozenge-blue-bg)', text: 'var(--cp-lozenge-blue-text)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px',
      borderRadius: 3, background: c.bg, color: c.text,
      fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.03em',
    }}>
      {stage.toUpperCase()}
    </span>
  );
}
