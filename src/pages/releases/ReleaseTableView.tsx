/**
 * Release Table View — Table rendering, ReleaseRow, and SortableHeader
 * Extracted from AllReleasesPage.tsx
 */

import React, { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { ReleaseHealth } from '@/types/releases';

// ─── View-layer type (derived from DB release) ──────────────────
export interface ViewRelease {
  id: string;
  name: string;
  version: string;
  status: string;
  health: number;
  healthRaw: ReleaseHealth;
  progress: number;
  testsPass: number;
  testsTotal: number;
  defects: number;
  coverage: number | null;
  targetDate: string;
  daysRemaining: number;
  overdue: boolean;
  owner: string;
  description: string;
  barLeft: number;
  barWidth: number;
  startDate: string | null;
}

export type SortableField = 'name' | 'status' | 'progress' | 'defects' | 'health' | 'daysRemaining';

// ─── Helpers ────────────────────────────────────────────────────
export function getHealthColor(h: number) {
  if (h < 40) return '#ef4444';
  if (h < 60) return '#d97706';
  if (h < 80) return '#2563eb';
  return '#0d9488';
}

export function getHealthLabel(h: number) {
  if (h < 40) return 'critical';
  if (h < 60) return 'at-risk';
  if (h < 80) return 'attention';
  return 'healthy';
}

export function getHealthDisplay(h: number) {
  if (h < 40) return 'Critical';
  if (h < 60) return 'At Risk';
  if (h < 80) return 'Attention';
  return 'Healthy';
}

export function getHealthBg(h: number) {
  if (h < 40) return '#fee2e2';
  if (h < 60) return '#fef3c7';
  if (h < 80) return '#dbeafe';
  return '#ccfbf1';
}

export const STATUS_DISPLAY: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  planned:  { dot: '#94a3b8', bg: '#f1f5f9', text: '#475569', label: 'Planned' },
  planning: { dot: '#94a3b8', bg: '#f1f5f9', text: '#475569', label: 'Planning' },
  active:   { dot: '#2563eb', bg: '#dbeafe', text: '#1e40af', label: 'Active' },
  development: { dot: '#2563eb', bg: 'rgba(37,99,235,0.1)', text: '#2563eb', label: 'Development' },
  staging:  { dot: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6', label: 'Staging' },
  testing:  { dot: '#d97706', bg: 'rgba(217,119,6,0.1)', text: '#d97706', label: 'Testing' },
  uat:      { dot: '#f97316', bg: 'rgba(249,115,22,0.1)', text: '#f97316', label: 'UAT' },
  released: { dot: '#0d9488', bg: 'rgba(13,148,136,0.1)', text: '#0d9488', label: 'Released' },
};

export function getStatusConfig(status: string) {
  return STATUS_DISPLAY[status] || STATUS_DISPLAY.planned;
}

// ─── Shared Styles ──────────────────────────────────────────────
export const colHeaderStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
  letterSpacing: '0.05em', textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap',
  height: '32px', lineHeight: '32px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
};

export const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px', borderRadius: '6px', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
};

export const closeBtnStyle: React.CSSProperties = {
  color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px',
};

// ─── StatusPill ─────────────────────────────────────────────────
export function StatusPill({ status }: { status: string }) {
  const c = getStatusConfig(status);
  return (
    <span className="inline-flex items-center gap-1" style={{ padding: '0 8px', borderRadius: '11px', background: c.bg, color: c.text, fontSize: '11px', fontWeight: 500, height: '22px', lineHeight: '22px', border: `1px solid ${c.bg === '#f1f5f9' ? '#e2e8f0' : 'transparent'}` }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.dot }} />
      {c.label}
    </span>
  );
}

// ─── SortableHeader ─────────────────────────────────────────────
export function SortableHeader({ label, field, current, direction, onClick, style }: {
  label: string; field: SortableField; current: SortableField; direction: 'asc' | 'desc'; onClick: (f: SortableField) => void; style?: React.CSSProperties;
}) {
  const isActive = current === field;
  return (
    <th
      onClick={() => onClick(field)}
      className="cursor-pointer select-none transition-colors hover:text-[#334155]"
      style={{ ...colHeaderStyle, ...style, color: isActive ? '#2563eb' : '#64748b' }}
    >
      {label} {isActive && <span style={{ color: '#2563eb' }}>{direction === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

// ─── ReleaseRow ─────────────────────────────────────────────────
export function ReleaseRow({ release: r, index = 0, selected, onToggle, onClick, onNavigate }: {
  release: ViewRelease; index?: number; selected: boolean; onToggle: () => void; onClick: () => void; onNavigate?: () => void;
}) {
  const cellStyle: React.CSSProperties = { padding: '0 16px', height: '50px', maxHeight: '50px', lineHeight: '36px', verticalAlign: 'middle', whiteSpace: 'nowrap' as const };
  // Test bar color based on pass ratio
  const testRatio = r.testsTotal > 0 ? r.testsPass / r.testsTotal : 0;
  const testBarColor = testRatio <= 0.3 ? '#ef4444' : testRatio <= 0.6 ? '#d97706' : '#0d9488';
  // Coverage color
  const covColor = r.coverage === null ? '#94a3b8' : r.coverage <= 30 ? '#ef4444' : r.coverage <= 60 ? '#d97706' : '#0d9488';

  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer transition-colors hover:bg-muted/50"
      style={{
        height: '50px', maxHeight: '50px', borderBottom: '1px solid #f1f5f9',
        background: selected ? '#eff6ff' : undefined,
        animation: `fadeInUp 0.3s ease both`,
        animationDelay: `${index * 25}ms`,
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget.style.background = '#f8fafc'); }}
      onMouseLeave={e => { if (!selected) (e.currentTarget.style.background = ''); }}
    >
      <td style={{ textAlign: 'center', padding: '0 4px', position: 'relative', width: '40px', height: '50px', verticalAlign: 'middle' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#2563eb', opacity: 0, transition: 'opacity 100ms' }} className="group-hover:!opacity-100" />
        <input
          type="checkbox"
          checked={selected}
          onChange={e => { e.stopPropagation(); onToggle(); }}
          onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ opacity: selected ? 1 : undefined, cursor: 'pointer', accentColor: '#2563eb', width: '16px', height: '16px' }}
        />
      </td>
      <td style={{ ...cellStyle, minWidth: '280px' }}>
        <span style={{ display: 'inline-block', padding: '2px 6px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", marginRight: '6px', verticalAlign: 'middle' }}>{r.version}</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{r.name}</span>
      </td>
      <td style={{ ...cellStyle, width: '100px' }}><StatusPill status={r.status} /></td>
      <td style={{ ...cellStyle, width: '130px' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: '64px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${r.progress}%`, height: '100%', background: r.progress <= 30 ? '#ef4444' : r.progress <= 60 ? '#d97706' : '#0d9488', borderRadius: '4px' }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{r.progress}%</span>
        </div>
      </td>
      <td style={cellStyle}>
        <div className="flex items-center gap-2">
          <div className="flex" style={{ width: '60px', height: '6px', borderRadius: '4px', overflow: 'hidden', background: '#e2e8f0' }}>
            {r.testsTotal > 0 && (
              <>
                <div style={{ width: `${testRatio * 100}%`, background: testBarColor }} />
                {testRatio < 0.8 && <div style={{ width: `${(1 - testRatio) * 100}%`, background: '#ef4444' }} />}
              </>
            )}
          </div>
          <span style={{ fontSize: '13px', fontWeight: testRatio < 0.8 ? 600 : 400, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{r.testsPass}/{r.testsTotal}</span>
        </div>
      </td>
      <td style={{ ...cellStyle, width: '72px', fontSize: '14px', fontWeight: 600, color: r.defects >= 20 ? '#ef4444' : r.defects >= 10 ? '#d97706' : r.defects > 0 ? '#10b981' : '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
        {r.defects > 0 ? r.defects : '—'}
      </td>
      <td style={{ ...cellStyle, width: '100px' }}>
        {r.coverage !== null ? (
          <div className="flex items-center gap-2">
            <div style={{ width: '48px', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${r.coverage}%`, height: '100%', background: covColor, borderRadius: '4px' }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: covColor, fontFamily: "'JetBrains Mono', monospace" }}>{r.coverage}%</span>
          </div>
        ) : (
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>—</span>
        )}
      </td>
      <td style={{ ...cellStyle, width: '80px' }}>
        <div className="flex items-center gap-1.5">
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getHealthColor(r.health) }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: getHealthColor(r.health) }}>{r.health}</span>
        </div>
      </td>
      <td style={{ ...cellStyle, width: '80px' }}>
        {r.status === 'released' ? (
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#059669', textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>Released</span>
        ) : (
          <span style={{ fontSize: '13px', fontWeight: r.daysRemaining <= 7 ? 600 : 500, color: r.daysRemaining <= 7 ? '#ef4444' : r.daysRemaining <= 14 ? '#d97706' : '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
            {r.overdue ? `-${r.daysRemaining}d` : `${r.daysRemaining}d`}
          </span>
        )}
      </td>
      <td style={{ ...cellStyle, width: '100px' }}>
        {r.owner === 'Unassigned' ? (
          <div className="flex items-center gap-1.5" style={{ color: '#2563eb' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus className="w-2.5 h-2.5" style={{ color: '#94a3b8' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#2563eb' }}>Assign</span>
          </div>
        ) : (
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#334155' }}>{r.owner}</span>
        )}
      </td>
    </tr>
  );
}
