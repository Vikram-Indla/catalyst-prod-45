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
}

export function RoadmapToolbar({
  view, onViewChange, committedOnly, onCommittedOnlyChange,
  totalCount, committedCount,
}: RoadmapToolbarProps) {
  return (
    <div style={{
      height: 56, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 24px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF',
    }}>
      {/* Title */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
          Ideas Roadmap
        </div>
        <div style={{ fontSize: 12, color: '#64748B', fontFamily: "'Inter', sans-serif", marginTop: -1 }}>
          FY 2026 delivery pipeline
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Stat pills */}
      <div style={{
        display: 'flex', gap: 6, fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif",
      }}>
        <span style={{
          background: '#F0FDFA', color: '#0D9488', padding: '4px 10px', borderRadius: 100,
        }}>
          {committedCount} committed
        </span>
        <span style={{
          background: '#F8FAFC', color: '#64748B', padding: '4px 10px', borderRadius: 100,
        }}>
          {totalCount} total
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#E2E8F0' }} />

      {/* View toggle */}
      <div style={{
        display: 'flex', border: '2px solid #E2E8F0', borderRadius: 6, overflow: 'hidden',
      }}>
        {(['roadmap', 'dates'] as RoadmapView[]).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            style={{
              padding: '4px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              background: view === v ? '#FFFFFF' : 'transparent',
              color: view === v ? '#1E293B' : '#64748B',
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
          padding: '4px 10px', borderRadius: 100, border: '1px solid #E2E8F0',
          background: committedOnly ? '#F0FDFA' : '#FFFFFF', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif",
          color: committedOnly ? '#0D9488' : '#64748B',
        }}
      >
        <span style={{
          width: 28, height: 16, borderRadius: 8, position: 'relative',
          background: committedOnly ? '#0D9488' : '#CBD5E1',
          display: 'inline-block', transition: 'background 150ms',
        }}>
          <span style={{
            position: 'absolute', top: 2, width: 12, height: 12, borderRadius: 6,
            background: '#FFFFFF', transition: 'left 150ms',
            left: committedOnly ? 14 : 2,
          }} />
        </span>
        Committed only
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#E2E8F0' }} />

      {/* Icon buttons */}
      <button
        onClick={() => (window as any).openPresentMode?.()}
        title="Present"
        style={{
          width: 32, height: 32, borderRadius: 6, border: '1px solid #E2E8F0',
          background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <MonitorPlay size={15} color="#64748B" />
      </button>
      <button
        onClick={() => console.log('Gantt modal — Stage E')}
        title="Gantt view"
        style={{
          width: 32, height: 32, borderRadius: 6, border: '1px solid #E2E8F0',
          background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <BarChart3 size={15} color="#64748B" />
      </button>
      <button
        onClick={() => (window as any).exportPPTX?.()}
        style={{
          height: 32, padding: '0 12px', borderRadius: 6, border: 'none',
          background: '#1E293B', color: '#FFFFFF', fontSize: 12, fontWeight: 600,
          fontFamily: "'Inter', sans-serif", cursor: 'pointer',
        }}
      >
        Export PPTX
      </button>
    </div>
  );
}
