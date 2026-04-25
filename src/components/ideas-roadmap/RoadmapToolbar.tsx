import React from 'react';
import { MonitorPlay, BarChart3 } from 'lucide-react';
import type { RoadmapView } from '@/types/ideasRoadmap';

interface RoadmapToolbarProps {
  view: RoadmapView;
  onViewChange: (v: RoadmapView) => void;
  committedOnly: boolean;
  onCommittedOnlyChange: (v: boolean) => void;
  totalCount: number;
  committedCount: number;
  onPresent: () => void;
  onExport: () => void;
  onGantt: () => void;
}

export function RoadmapToolbar({
  view, onViewChange, committedOnly, onCommittedOnlyChange,
  totalCount, committedCount, onPresent, onExport, onGantt,
}: RoadmapToolbarProps) {
  const hasCommitted = committedCount > 0;

  return (
    <div style={{
      height: 56, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 24px', borderBottom: '1px solid var(--divider)', background: 'var(--bg-app)',
    }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--ds-font-family-heading)' }}>
          Ideas Roadmap
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--ds-font-family-body)', marginTop: -1 }}>
          FY 2026 delivery pipeline
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Stat pills — EC-04: grey when 0 committed */}
      <div style={{ display: 'flex', gap: 6, fontSize: 12, fontWeight: 600, fontFamily: 'var(--ds-font-family-body)' }}>
        <span style={{
          background: hasCommitted ? '#F0FDFA' : 'var(--bg-1)',
          color: hasCommitted ? 'var(--sem-success)' : 'var(--fg-4)',
          padding: '4px 10px', borderRadius: 100,
        }}>
          {committedCount} committed
        </span>
        <span style={{ background: 'var(--bg-1)', color: 'var(--fg-3)', padding: '4px 10px', borderRadius: 100 }}>
          {totalCount} total
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--divider)' }} />

      {/* View toggle */}
      <div style={{ display: 'flex', border: '2px solid var(--divider)', borderRadius: 6, overflow: 'hidden' }}>
        {(['roadmap', 'dates'] as RoadmapView[]).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            style={{
              padding: '4px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--ds-font-family-body)', outline: 'none', transition: 'all 150ms',
              background: view === v ? 'var(--bg-app)' : 'transparent',
              color: view === v ? '#1E293B' : 'var(--fg-3)',
              boxShadow: view === v ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
            }}
          >
            {v === 'roadmap' ? 'Roadmap' : 'Dates'}
          </button>
        ))}
      </div>

      {/* Committed toggle */}
      <button
        onClick={() => onCommittedOnlyChange(!committedOnly)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 100, border: '1px solid var(--divider)',
          background: committedOnly ? '#F0FDFA' : 'var(--bg-app)', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, fontFamily: 'var(--ds-font-family-body)',
          color: committedOnly ? 'var(--sem-success)' : 'var(--fg-3)', transition: 'all 150ms',
        }}
      >
        <span style={{
          width: 28, height: 16, borderRadius: 8, position: 'relative',
          background: committedOnly ? 'var(--sem-success)' : '#CBD5E1',
          display: 'inline-block', transition: 'background 150ms',
        }}>
          <span style={{
            position: 'absolute', top: 2, width: 12, height: 12, borderRadius: 6,
            background: 'var(--bg-app)', transition: 'left 150ms',
            left: committedOnly ? 14 : 2,
          }} />
        </span>
        Committed only
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--divider)' }} />

      {/* INT-05/06: Toolbar buttons wired to parent callbacks */}
      <button onClick={onPresent} title="Present" style={{
        width: 32, height: 32, borderRadius: 6, border: '1px solid var(--divider)',
        background: 'var(--bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 150ms',
      }}>
        <MonitorPlay size={15} color="#64748B" />
      </button>
      <button onClick={onGantt} title="Gantt view" style={{
        width: 32, height: 32, borderRadius: 6, border: '1px solid var(--divider)',
        background: 'var(--bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 150ms',
      }}>
        <BarChart3 size={15} color="#64748B" />
      </button>
      <button onClick={onExport} style={{
        height: 32, padding: '8px 12px', borderRadius: 6, border: 'none',
        background: '#1E293B', color: 'var(--bg-app)', fontSize: 12, fontWeight: 600,
        fontFamily: 'var(--ds-font-family-body)', cursor: 'pointer', transition: 'all 150ms',
      }}>
        Export PPTX
      </button>
    </div>
  );
}
