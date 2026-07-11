/**
 * Roadmap Request Detail Panel
 * Slide-over panel with Details, Score, and placeholder tabs
 * Renders as portal to document.body to avoid overflow clipping
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, Paperclip, Copy, Link2, Star, Trash2 } from '@/lib/atlaskit-icons';
import { format, parseISO } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RoadmapDemand } from '../types/roadmap';
import { STATUS_CONFIG } from '../types/roadmap';
import { RoadmapScoreTab } from './RoadmapScoreTab';

// Status bar colors matching the timeline bars
const BAR_STATUS_COLORS: Record<string, { border: string; bg: string }> = {
  new_request: { border: 'var(--ds-text-brand)', bg: 'var(--ds-background-information-bold)' },
  draft:       { border: 'var(--ds-text-subtlest)', bg: 'rgba(115,115,115,0.12)' },
  submitted:   { border: 'var(--ds-text-brand)', bg: 'var(--ds-background-information-bold)' },
  in_review:   { border: 'var(--ds-text-discovery)', bg: 'var(--ds-background-discovery-bold)' },
  approved:    { border: 'var(--ds-text-information)', bg: 'rgba(6,182,212,0.12)' },
  in_progress: { border: 'var(--ds-text-warning, var(--cp-amber))', bg: 'var(--ds-background-warning-bold)' },
  completed:   { border: 'var(--ds-text-success)', bg: 'var(--ds-background-success-bold)' },
  rejected:    { border: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
  cancelled:   { border: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)' },
};

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'score', label: 'Score' },
  { key: 'budget', label: 'Budget' },
  { key: 'risks', label: 'Risks' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'links', label: 'Links' },
  { key: 'audit', label: 'Audit' },
];

const ACTION_BUTTONS = [
  { icon: Pencil, label: 'Edit' },
  { icon: Paperclip, label: 'Attach' },
  { icon: Copy, label: 'Clone' },
  { icon: Link2, label: 'Link' },
  { icon: Star, label: 'Score' },
  { icon: Trash2, label: 'Delete' },
];

const PLACEHOLDER_EMOJI: Record<string, string> = {
  budget: '💰',
  risks: '⚠️',
  milestones: '🏁',
  links: '🔗',
  audit: '📋',
};

interface RoadmapDetailPanelProps {
  item: RoadmapDemand | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RoadmapDetailPanel({ item, isOpen, onClose }: RoadmapDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Reset tab when opening new item
  useEffect(() => {
    if (isOpen) setActiveTab('details');
  }, [item?.id, isOpen]);

  const statusKey = item?.process_step?.toLowerCase().replace(/ /g, '_') || '';
  const statusCfg = STATUS_CONFIG[statusKey];
  const barColor = BAR_STATUS_COLORS[statusKey] || BAR_STATUS_COLORS.draft;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
  };

  return createPortal(
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--ds-shadow-raised)',
          zIndex: 200,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 200ms ease',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '90vw',
          backgroundColor: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
          borderLeft: '1px solid var(--ds-border)',
          boxShadow: '-8px 0 30px var(--ds-shadow-raised)',
          zIndex: 201,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {item && (
          <>
            {/* A) Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      padding: '0px 8px',
                      borderRadius: '4px',
                      fontSize: 'var(--ds-font-size-200)',
                      fontWeight: 600,
                      fontFamily: 'var(--cp-font-mono)',
                      backgroundColor: 'var(--ds-background-information-bold)',
                      color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
                      flexShrink: 0,
                    }}>
                      {item.request_key}
                    </span>
                  </div>
                  <h2 style={{
                    fontSize: 'var(--ds-font-size-500)',
                    fontWeight: 600,
                    color: 'var(--ds-text)',
                    lineHeight: 1.3,
                    margin: 0,
                    wordBreak: 'break-word',
                  }}>
                    {item.title}
                  </h2>
                  {statusCfg && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      fontSize: 'var(--ds-font-size-200)',
                      fontWeight: 500,
                      borderRadius: '12px',
                      backgroundColor: barColor.bg,
                      color: barColor.border,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: barColor.border }} />
                      {statusCfg.label}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 6, border: 'none', cursor: 'pointer',
                    backgroundColor: 'transparent',
                    color: 'var(--ds-text-subtlest)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-background-neutral)'; e.currentTarget.style.color = 'var(--ds-text-subtle)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-subtlest)'; }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* B) Action Bar */}
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--ds-border)', display: 'flex', gap: '4px' }}>
              {ACTION_BUTTONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', fontSize: 'var(--ds-font-size-200)', fontWeight: 500,
                    color: 'var(--ds-text-subtle)', backgroundColor: 'transparent',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-background-neutral)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* C) Tab Bar */}
            <div style={{ padding: '0 20px', borderBottom: '1px solid var(--ds-border)', display: 'flex', gap: '0' }}>
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 'var(--ds-font-size-300)',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    color: activeTab === tab.key ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-text-subtle)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid var(--ds-link)' : '2px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '-1px',
                  }}
                  onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--ds-text)'; }}
                  onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--ds-text-subtle)'; }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* D) Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {activeTab === 'details' && <DetailsTabContent item={item} formatDate={formatDate} barColor={barColor} />}
              {activeTab === 'score' && <RoadmapScoreTab item={item} />}
              {['budget', 'risks', 'milestones', 'links', 'audit'].includes(activeTab) && (
                <PlaceholderTab name={activeTab} />
              )}
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}

/** Details Tab */
function DetailsTabContent({
  item,
  formatDate,
  barColor,
}: {
  item: RoadmapDemand;
  formatDate: (d: string | null) => string;
  barColor: { border: string; bg: string };
}) {
  const statusKey = item.process_step?.toLowerCase().replace(/ /g, '_') || '';
  const statusCfg = STATUS_CONFIG[statusKey];

  return (
    <div>
      {/* Field Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
        <Field label="STATUS" value={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: barColor.border }} />
            {statusCfg?.label || item.process_step || '—'}
          </span>
        } />
        <Field label="PLATFORM" value={item.platform || '—'} />

        <Field label="PRIORITY" value={item.priority_tier || '—'} />
        <Field label="HEALTH" value={item.health || '—'} />

        <Field label="ASSIGNEE" value={item.assignee || '—'} />
        <Field label="PRODUCT" value={item.product?.name || '—'} />

        <Field label="START DATE" value={formatDate(item.start_date)} />
        <Field label="END DATE" value={formatDate(item.end_date)} />

        <Field label="PROGRESS" value={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--ds-background-neutral)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${item.progress}%`, backgroundColor: barColor.border, borderRadius: '9999px' }} />
            </div>
            <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{item.progress}%</span>
          </div>
        } />
        <Field label="RANK" value={item.rank != null ? `#${item.rank}` : '—'} />
      </div>

      {/* Description */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--ds-border)' }}>
        <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text)', marginBottom: '8px' }}>Description</div>
        <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)', lineHeight: 1.6 }}>
          {item.description || 'No description provided for this initiative.'}
        </div>
      </div>
    </div>
  );
}

/** Single field in the details grid */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 600,
        color: 'var(--ds-text-subtlest)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
        {value}
      </div>
    </div>
  );
}

/** Placeholder tab for coming-soon features */
function PlaceholderTab({ name }: { name: string }) {
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>{PLACEHOLDER_EMOJI[name] || '📄'}</div>
      <div style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtlest)', fontWeight: 500 }}>
        {displayName} — Coming soon
      </div>
    </div>
  );
}

export default RoadmapDetailPanel;
