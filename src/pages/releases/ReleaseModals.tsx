/**
 * Release Modals — NewReleaseModal + AI Insights drawer + Detail drawer helpers
 * Extracted from AllReleasesPage.tsx
 */

import React, { useState } from 'react';
import { AlertTriangle, ArrowUpDown, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ViewRelease, closeBtnStyle, primaryBtnStyle } from './ReleaseTableView';

// ─── NewReleaseModal ────────────────────────────────────────────
interface NewReleaseModalProps {
  onClose: () => void;
  onCreate: (r: { name: string; version: string; status: string; targetDate: string; description: string }) => void;
  isCreating: boolean;
}

export function NewReleaseModal({ onClose, onCreate, isCreating }: NewReleaseModalProps) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [status, setStatus] = useState('planned');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Release name is required'); return; }
    onCreate({ name: name.trim(), version, status, targetDate, description });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block',
  };

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50" style={{ width: '500px', background: 'var(--bg-app, #fff)', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', animation: 'scaleIn 200ms ease' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e2e8f0' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Create New Release</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label style={labelStyle}>RELEASE NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Q2 2026 Release" autoFocus onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
          </div>
          <div>
            <label style={labelStyle}>VERSION</label>
            <input value={version} onChange={e => setVersion(e.target.value)} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label style={labelStyle}>STATUS</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="testing">Testing</option>
                <option value="uat">UAT</option>
              </select>
            </div>
            <div className="flex-1">
              <label style={labelStyle}>TARGET DATE</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>DESCRIPTION (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#e2e8f0' }}>
          <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'var(--bg-app, #fff)', color: '#334155', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isCreating}
            style={{ ...primaryBtnStyle, opacity: isCreating ? 0.7 : 1 }}
          >
            {isCreating ? 'Creating...' : 'Create Release'}
          </button>
        </div>
        <style>{`@keyframes scaleIn { from { transform: translate(-50%,-50%) scale(0.95); opacity: 0; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }`}</style>
      </div>
    </>
  );
}

// ─── Dynamic AI Insights (generated from real data) ─────────────
export function generateDynamicInsights(releases: ViewRelease[]) {
  const insights: { iconType: 'critical' | 'warning' | 'chart' | 'check' | 'info'; title: string; desc: string }[] = [];

  const critical = releases.filter(r => r.health < 40);
  if (critical.length > 0) {
    insights.push({
      iconType: 'critical',
      title: `${critical.length} Release${critical.length > 1 ? 's' : ''} in Critical Health`,
      desc: `${critical.map(r => r.name).join(', ')} ${critical.length > 1 ? 'have' : 'has'} health below 40. Consider reallocating testing resources.`,
    });
  }

  const overdue = releases.filter(r => r.overdue);
  if (overdue.length > 0) {
    insights.push({
      iconType: 'warning',
      title: `${overdue.length} Overdue Release${overdue.length > 1 ? 's' : ''}`,
      desc: `${overdue.map(r => r.name).join(', ')} ${overdue.length > 1 ? 'are' : 'is'} past target date. Escalation recommended.`,
    });
  }

  const noCoverage = releases.filter(r => r.coverage === null || r.coverage === 0);
  if (noCoverage.length > 0) {
    insights.push({
      iconType: 'chart',
      title: 'Coverage Gap',
      desc: `${noCoverage.length} of ${releases.length} releases have no test coverage data. Run initial test suites for baseline metrics.`,
    });
  }

  const completed = releases.filter(r => r.status === 'released' && r.health >= 80);
  if (completed.length > 0) {
    insights.push({
      iconType: 'check',
      title: `${completed.length} Successfully Released`,
      desc: `${completed.map(r => r.name).join(', ')} completed with healthy metrics. Ready for post-release retrospective.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      iconType: 'info',
      title: 'All Looking Good',
      desc: 'No immediate concerns detected across your release portfolio.',
    });
  }

  return insights;
}

// ─── AI Insights Drawer ────────────────────────────────────────
interface AIInsightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  releases: ViewRelease[];
}

export function AIInsightsDrawer({ isOpen, onClose, releases }: AIInsightsDrawerProps) {
  if (!isOpen) return null;

  const INSIGHT_ICONS: Record<string, React.ReactNode> = {
    critical: <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />,
    warning: <AlertTriangle className="w-4 h-4" style={{ color: '#d97706' }} />,
    chart: <ArrowUpDown className="w-4 h-4" style={{ color: '#2563eb' }} />,
    check: <Check className="w-4 h-4" style={{ color: '#0d9488' }} />,
    info: <Sparkles className="w-4 h-4" style={{ color: '#8b5cf6' }} />,
  };

  return (
    <>
      <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[201] overflow-y-auto" style={{ width: '400px', background: 'var(--bg-app, #fff)', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', animation: 'slideInRight 200ms ease' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: '#8b5cf6' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>AI Insights</h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {generateDynamicInsights(releases).map((insight, i) => (
            <div key={i} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fafafa' }}>
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{INSIGHT_ICONS[insight.iconType]}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{insight.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.5' }}>{insight.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Detail Drawer sub-components ──────────────────────────────
export function MetricBox({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="flex-1 text-center" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#334155' }}>{value}</span>
    </div>
  );
}

// ─── Filter sub-components ──────────────────────────────────────
export const filterDividerStyle: React.CSSProperties = {
  borderTop: '1px solid #e2e8f0', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between',
};
export const clearBtnStyle: React.CSSProperties = {
  fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer',
};
export const applyBtnStyle: React.CSSProperties = {
  fontSize: '12px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
};
export const bulkBarBtnStyle: React.CSSProperties = {
  padding: '4px 10px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', color: '#fff', background: 'transparent', fontSize: '12px', cursor: 'pointer',
};

export function StatItem({ number, label, dotColor }: { number: number; label: string; dotColor?: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ gap: '6px' }}>
      {dotColor && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />}
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{number}</span>
      <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>{label}</span>
    </div>
  );
}

export function CheckboxRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[#f8fafc]" style={{ padding: '6px 12px', fontSize: '13px', color: '#334155' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: '#2563eb' }} />
      {label}
    </label>
  );
}

export function FilterPill({ label, active, count, isOpen, onToggle, children }: {
  label: string; active: boolean; count: number; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative" data-dropdown>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 transition-colors"
        style={{
          height: '32px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          border: `1px solid ${active ? '#2563eb' : '#e2e8f0'}`,
          background: active ? '#dbeafe' : '#fff',
          color: active ? '#2563eb' : '#334155',
        }}
      >
        {label}{active && count > 0 ? ` (${count})` : ''} <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="m6 9 6 6 6-6"/></svg></span>
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-50" style={{ background: 'var(--bg-app, #fff)', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '4px', minWidth: '200px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left transition-colors hover:bg-[#f8fafc]"
      style={{ padding: '8px 12px', fontSize: '13px', color: '#334155', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px' }}
    >
      {icon} {label}
    </button>
  );
}
