/**
 * Roadmap Request Detail Panel
 * Slide-over panel with Details, Score, and placeholder tabs
 * Renders as portal to document.body to avoid overflow clipping
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, Paperclip, Copy, Link2, Star, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RoadmapDemand } from '../types/roadmap';
import { STATUS_CONFIG } from '../types/roadmap';
import { RoadmapScoreTab } from './RoadmapScoreTab';

// Status bar colors matching the timeline bars
const BAR_STATUS_COLORS: Record<string, { border: string; bg: string }> = {
  new_request: { border: 'var(--ds-text-brand, #3B82F6)', bg: 'rgba(59,130,246,0.12)' },
  draft:       { border: '#737373', bg: 'rgba(115,115,115,0.12)' },
  submitted:   { border: 'var(--ds-text-brand, #3B82F6)', bg: 'rgba(59,130,246,0.12)' },
  in_review:   { border: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  approved:    { border: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  in_progress: { border: 'var(--ds-text-warning, #F59E0B)', bg: 'rgba(245,158,11,0.12)' },
  completed:   { border: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  rejected:    { border: 'var(--ds-text-danger, #EF4444)', bg: 'rgba(239,68,68,0.12)' },
  cancelled:   { border: 'var(--ds-text-danger, #EF4444)', bg: 'rgba(239,68,68,0.12)' },
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
          backgroundColor: 'rgba(0,0,0,0.15)',
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
          backgroundColor: 'var(--ds-surface, #ffffff)',
          borderLeft: '1px solid #e4e4e7',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.08)',
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
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f4f4f5' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      fontFamily: 'var(--cp-font-mono)',
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      color: 'var(--ds-text-brand, #2563eb)',
                      flexShrink: 0,
                    }}>
                      {item.request_key}
                    </span>
                  </div>
                  <h2 style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: '#18181b',
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
                      gap: '6px',
                      padding: '3px 10px',
                      fontSize: '12px',
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
                    color: '#a1a1aa',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f4f4f5'; e.currentTarget.style.color = '#52525b'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* B) Action Bar */}
            <div style={{ padding: '8px 20px', borderBottom: '1px solid #f4f4f5', display: 'flex', gap: '4px' }}>
              {ACTION_BUTTONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', fontSize: '12px', fontWeight: 500,
                    color: '#71717a', backgroundColor: 'transparent',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f4f4f5'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* C) Tab Bar */}
            <div style={{ padding: '0 20px', borderBottom: '1px solid #e4e4e7', display: 'flex', gap: '0' }}>
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    color: activeTab === tab.key ? 'var(--ds-text-brand, #2563eb)' : '#71717a',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '-1px',
                  }}
                  onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = '#3f3f46'; }}
                  onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = '#71717a'; }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* D) Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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
            <div style={{ width: '80px', height: '6px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${item.progress}%`, backgroundColor: barColor.border, borderRadius: '9999px' }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{item.progress}%</span>
          </div>
        } />
        <Field label="RANK" value={item.rank != null ? `#${item.rank}` : '—'} />
      </div>

      {/* Description */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f4f4f5' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>Description</div>
        <div style={{ fontSize: '13px', color: '#52525b', lineHeight: 1.6 }}>
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
        fontSize: '11px',
        fontWeight: 600,
        color: '#a1a1aa',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: '#27272a' }}>
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
      <div style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 500 }}>
        {displayName} — Coming soon
      </div>
    </div>
  );
}

export default RoadmapDetailPanel;
