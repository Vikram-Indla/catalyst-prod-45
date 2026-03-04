/**
 * ReqAssistPipeline — Pipeline Dashboard (Stage C)
 * Route: /product/req-assist
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, ChevronDown, FileSearch, Zap, Database,
  Upload, Sparkles, ArrowRight,
} from 'lucide-react';
import { useBrdDocuments, usePipelineStats, useDomainTags } from '@/hooks/useReqAssist';
import type { PipelineStage, BrdDocument, StageStats } from '@/types/reqAssist';
import ReqAssistIntakeDrawer from '@/components/product/ReqAssistIntakeDrawer';

/* ── helpers ─────────────────────────────────────────────────────── */

const STAGE_ORDER: PipelineStage[] = ['intake', 'extract', 'process', 'validate', 'distribute', 'complete'];
const STAGE_LABELS: Record<PipelineStage | 'all', string> = {
  all: 'All', intake: 'Intake', extract: 'Extract', process: 'Process',
  validate: 'Validate', distribute: 'Distribute', complete: 'Complete', failed: 'Failed',
};

type LozengeColor = 'grey' | 'blue' | 'green';
function stageToLozenge(s: PipelineStage): LozengeColor {
  if (s === 'complete' || s === 'distribute') return 'green';
  if (s === 'intake' || s === 'failed') return 'grey';
  return 'blue';
}
const LOZENGE: Record<LozengeColor, { bg: string; text: string }> = {
  grey:  { bg: 'var(--cp-lozenge-grey-bg)',  text: 'var(--cp-lozenge-grey-text)' },
  blue:  { bg: 'var(--cp-lozenge-blue-bg)',  text: 'var(--cp-lozenge-blue-text)' },
  green: { bg: 'var(--cp-lozenge-green-bg)', text: 'var(--cp-lozenge-green-text)' },
};

function stagePillStyle(s: PipelineStage) {
  if (s === 'intake') return { bg: 'var(--cp-bg-sunken)', text: 'var(--cp-text-tertiary)' };
  if (s === 'distribute' || s === 'complete') return { bg: 'var(--cp-lozenge-green-bg)', text: 'var(--cp-lozenge-green-text)' };
  return { bg: 'var(--cp-lozenge-blue-bg)', text: 'var(--cp-lozenge-blue-text)' };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function qualityColor(score: number | null): string {
  if (score === null) return 'var(--cp-text-muted)';
  if (score >= 85) return 'var(--cp-success-60)';
  if (score >= 70) return 'var(--cp-warning-60)';
  return 'var(--cp-text-muted)';
}

/* ── Lozenge inline component ───────────────────────────────────── */
function StageLozenge({ stage }: { stage: PipelineStage }) {
  const c = LOZENGE[stageToLozenge(stage)];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      height: 20, padding: '0 6px', borderRadius: 3,
      background: c.bg, color: c.text,
      fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap',
    }}>
      {STAGE_LABELS[stage]}
    </span>
  );
}

/* ── Source column ──────────────────────────────────────────────── */
function SourceCell({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string }> = {
    jira_webhook:  { icon: <Zap size={13} style={{ color: 'var(--cp-primary-60)' }} />, label: 'Jira Hook' },
    jira_bulk:     { icon: <Database size={13} style={{ color: 'var(--cp-text-tertiary)' }} />, label: 'Jira Import' },
    manual_upload: { icon: <Upload size={13} style={{ color: 'var(--cp-text-tertiary)' }} />, label: 'Manual' },
    ai_generated:  { icon: <Sparkles size={13} style={{ color: 'var(--cp-purple-60)' }} />, label: 'AI Generated' },
  };
  const s = map[type] || { icon: null, label: type };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-secondary)' }}>
      {s.icon}{s.label}
    </span>
  );
}

/* ── Custom Dropdown ─────────────────────────────────────────────── */
function CustomDropdown({ value, options, placeholder, onChange }: {
  value: string | null; options: string[]; placeholder: string; onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px', borderRadius: 6,
          background: 'var(--cp-bg-surface)', border: '1px solid var(--cp-border-default)',
          fontFamily: 'var(--cp-font-body)', fontSize: 13, color: value ? 'var(--cp-text-primary)' : 'var(--cp-text-tertiary)',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {value || placeholder}
        <ChevronDown size={14} style={{ color: 'var(--cp-text-muted)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          minWidth: 180, background: 'var(--cp-bg-elevated)',
          border: '1px solid var(--cp-border-default)', borderRadius: 6,
          boxShadow: 'var(--cp-shadow-overlay)', zIndex: 500,
          maxHeight: 240, overflowY: 'auto',
        }}>
          <div
            onClick={() => { onChange(null); setOpen(false); }}
            style={{
              padding: '8px 12px', cursor: 'pointer', fontSize: 13,
              fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-tertiary)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-interact-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            All
          </div>
          {options.map(o => (
            <div
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary)',
                background: o === value ? 'var(--cp-interact-selected)' : 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = o === value ? 'var(--cp-interact-selected)' : 'var(--cp-interact-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = o === value ? 'var(--cp-interact-selected)' : 'transparent')}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                                    */
/* ══════════════════════════════════════════════════════════════════ */
export default function ReqAssistPipeline() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PipelineStage | 'all'>('all');
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  const filters = useMemo(() => ({
    stage: activeTab,
    search: search || undefined,
    domainTag: domainFilter || undefined,
  }), [activeTab, search, domainFilter]);

  const { data: documents, isLoading } = useBrdDocuments(filters);
  const { data: stats } = usePipelineStats();
  const { data: domainTags } = useDomainTags();

  const totalCount = useMemo(() => (stats || []).reduce((a, s) => a + s.count, 0), [stats]);

  const tabCounts = useMemo(() => {
    const m: Record<string, number> = { all: totalCount };
    (stats || []).forEach(s => { m[s.stage] = s.count; });
    return m;
  }, [stats, totalCount]);

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'var(--cp-font-body)' }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--cp-text-primary)', margin: 0, lineHeight: 1.3 }}>
            Req Assist™
          </h1>
          <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-tertiary)', margin: '4px 0 0' }}>
            Document Lifecycle Pipeline
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 32, padding: '0 14px', borderRadius: 6, border: 'none',
            background: 'var(--cp-primary-60)', color: '#FFFFFF',
            fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'background 80ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-primary-70)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--cp-primary-60)')}
        >
          <Plus size={14} />
          New Document
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {(stats || STAGE_ORDER.map(s => ({ stage: s, count: 0, label: STAGE_LABELS[s] }))).map(s => {
          const pill = stagePillStyle(s.stage);
          return (
            <div key={s.stage} style={{
              flex: 1, minWidth: 140, padding: 16,
              background: '#FFFFFF', border: '1px solid var(--cp-border-default)',
              borderRadius: 6,
            }}>
              <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: 'var(--cp-text-tertiary)', marginBottom: 8, letterSpacing: '0.04em' }}>
                {s.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 28, fontWeight: 650, color: 'var(--cp-text-primary)', lineHeight: 1 }}>
                  {s.count}
                </span>
                {s.stage === 'process' && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 5px',
                    borderRadius: 3, background: 'rgba(124,58,237,0.08)', color: 'var(--cp-purple-60)',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  }}>
                    AI
                  </span>
                )}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '2px 6px',
                borderRadius: 3, background: pill.bg, color: pill.text,
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Stage Filter Tabs ───────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--cp-border-default)', marginBottom: 0 }}>
        {(['all', ...STAGE_ORDER] as (PipelineStage | 'all')[]).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 36, padding: '0 14px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--cp-font-body)', fontSize: 13,
                fontWeight: isActive ? 650 : 500,
                color: isActive ? 'var(--cp-primary-60)' : 'var(--cp-text-secondary)',
                borderBottom: isActive ? '2px solid var(--cp-primary-60)' : '2px solid transparent',
                transition: 'background 80ms',
                marginBottom: -1,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--cp-interact-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {STAGE_LABELS[tab]}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 6px', borderRadius: 10, minWidth: 20, height: 18,
                background: 'var(--cp-bg-sunken)', color: 'var(--cp-text-tertiary)',
                fontSize: 11, fontWeight: 500,
              }}>
                {tabCounts[tab] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 40, padding: '4px 0', marginBottom: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', width: 260, height: 32,
          border: '1px solid var(--cp-border-default)', borderRadius: 4,
          padding: '0 8px', gap: 6,
        }}>
          <Search size={14} style={{ color: 'var(--cp-text-muted)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            style={{
              border: 'none', outline: 'none', background: 'transparent', width: '100%',
              fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-primary)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CustomDropdown
            value={domainFilter}
            options={domainTags || []}
            placeholder="Domain"
            onChange={setDomainFilter}
          />
        </div>
      </div>

      {/* ── Document Table ──────────────────────────────────────── */}
      <div style={{
        border: '1px solid var(--cp-border-default)', borderRadius: 6, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 130px 180px 100px 120px 100px 110px 80px',
          background: 'var(--cp-bg-sunken)', padding: '0 12px',
          borderBottom: '0.75px solid var(--cp-border-subtle)',
        }}>
          {['Document', 'Stage', 'Domain', 'Quality', 'Source', 'Artifacts', 'Created', ''].map(h => (
            <div key={h} style={{
              padding: '10px 0', fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 500,
              textTransform: 'uppercase', color: 'var(--cp-text-tertiary)', letterSpacing: '0.04em',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Loading skeleton */}
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '2fr 130px 180px 100px 120px 100px 110px 80px',
            padding: '0 12px', height: 36, maxHeight: 36, alignItems: 'center',
            borderBottom: '0.75px solid var(--cp-border-subtle)',
          }}>
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} style={{
                height: 14, width: j === 0 ? '70%' : '60%', borderRadius: 3,
                background: 'var(--cp-bg-sunken)', animation: 'ra-skeleton 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ))}

        {/* Empty state */}
        {!isLoading && documents && documents.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 200, gap: 8,
          }}>
            <FileSearch size={32} style={{ color: 'var(--cp-text-muted)' }} />
            <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 15, color: 'var(--cp-text-secondary)' }}>
              No documents found
            </span>
            <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-tertiary)' }}>
              Try adjusting your filter or add a new document.
            </span>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                marginTop: 8, height: 32, padding: '0 14px', borderRadius: 6,
                border: '1px solid var(--cp-border-default)', background: 'var(--cp-bg-surface)',
                fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
                color: 'var(--cp-text-primary)', cursor: 'pointer',
              }}
            >
              Add Document
            </button>
          </div>
        )}

        {/* Rows */}
        {!isLoading && documents && documents.map(doc => (
          <div
            key={doc.id}
            onClick={() => navigate(`/product/req-assist/${doc.id}`)}
            className="ra-table-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 130px 180px 100px 120px 100px 110px 80px',
              padding: '0 12px', height: 36, maxHeight: 36, alignItems: 'center',
              borderBottom: '0.75px solid var(--cp-border-subtle)',
              cursor: 'pointer', transition: 'background 80ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-interact-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Document */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {doc.jira_key && (
                <span style={{
                  fontFamily: 'var(--cp-font-mono)', fontSize: 11,
                  background: 'var(--cp-bg-sunken)', borderRadius: 3, padding: '2px 5px',
                  color: 'var(--cp-text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {doc.jira_key}
                </span>
              )}
              <span style={{
                fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
                color: 'var(--cp-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {doc.title}
              </span>
            </div>
            {/* Stage */}
            <div><StageLozenge stage={doc.pipeline_stage} /></div>
            {/* Domain */}
            <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.domain_tag || '—'}
            </div>
            {/* Quality */}
            <div style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, color: qualityColor(doc.quality_score) }}>
              {doc.quality_score !== null ? `${doc.quality_score} / 100` : '—'}
            </div>
            {/* Source */}
            <div><SourceCell type={doc.source_type} /></div>
            {/* Artifacts */}
            <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-tertiary)' }}>
              {doc.pipeline_stage === 'complete' ? '4 items' : doc.pipeline_stage === 'distribute' ? '3 items' : '—'}
            </div>
            {/* Created */}
            <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-tertiary)' }}>
              {relativeTime(doc.created_at)}
            </div>
            {/* Action — hidden at rest */}
            <div className="ra-row-action" style={{ opacity: 0, transition: 'opacity 80ms' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 500,
                color: 'var(--cp-primary-60)', cursor: 'pointer',
              }}>
                View <ArrowRight size={12} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Intake Drawer */}
      <ReqAssistIntakeDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Row hover CSS for action visibility */}
      <style>{`
        .ra-table-row:hover .ra-row-action { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
