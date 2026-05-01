/**
 * TestHub Execution Page — Header Bar
 * Extracted from TestHubExecutionPage.tsx
 */
import React from 'react';
import {
  ArrowLeft, Play, CheckCircle2, XCircle,
  AlertTriangle, Timer, Keyboard, Zap,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  status: string;
  progress_percent: number;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
}

interface ExecutionHeaderProps {
  cycle: TestCycle;
  isDark: boolean;
  fastTrackMode: boolean;
  setFastTrackMode: (v: boolean) => void;
  sessionElapsed: number;
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  setShowShortcuts: (v: boolean) => void;
  onExit: () => void;
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function ExecutionHeader({
  cycle, isDark, fastTrackMode, setFastTrackMode,
  sessionElapsed, showSidebar, setShowSidebar,
  setShowShortcuts, onExit,
}: ExecutionHeaderProps) {
  return (
    <div style={{
      height: 56, padding: '0 20px', backgroundColor: 'hsl(var(--card))',
      borderBottom: '1px solid hsl(var(--border))', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onExit} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
          border: '1px solid hsl(var(--border))', borderRadius: 6,
          backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>
          <ArrowLeft size={16} /> Exit
        </button>
        <div style={{ height: 20, width: 1, backgroundColor: 'hsl(var(--border))' }} />
        <Play size={18} style={{ color: '#10B981' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.1)', padding: '2px 8px', borderRadius: 4 }}>
          {cycle.cycle_key}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{cycle.name}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* FastTrack toggle */}
        <button
          onClick={() => setFastTrackMode(!fastTrackMode)}
          title={fastTrackMode ? 'FastTrack ON: Simple pass/fail, auto-advance' : 'Enable FastTrack mode'}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
            border: fastTrackMode ? 'none' : '1px solid hsl(var(--border))',
            borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            backgroundColor: fastTrackMode ? '#FEF3C7' : 'hsl(var(--card))',
            color: fastTrackMode ? 'var(--ds-text-warning, #D97706)' : 'hsl(var(--muted-foreground))',
          }}
        >
          <Zap size={14} /> {fastTrackMode ? 'FastTrack ON' : 'FastTrack'}
        </button>

        {/* Stats badges */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { count: cycle.passed_count, color: '#059669', bg: 'var(--cp-success-light, #ECFDF5)', Icon: CheckCircle2 },
            { count: cycle.failed_count, color: 'var(--ds-text-danger, #DC2626)', bg: 'var(--cp-danger-light, #FEF2F2)', Icon: XCircle },
            { count: cycle.blocked_count, color: 'var(--ds-text-warning, #D97706)', bg: 'var(--cp-warning-light, #FFFBEB)', Icon: AlertTriangle },
          ].map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px', backgroundColor: s.bg, borderRadius: 6, fontSize: 11, fontWeight: 600, color: s.color }}>
              <s.Icon size={12} /> {s.count}
            </span>
          ))}
        </div>

        {/* Session timer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
          backgroundColor: 'hsl(var(--muted) / 0.3)', borderRadius: 6,
        }}>
          <Timer size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: 'hsl(var(--foreground))' }}>
            {formatTime(sessionElapsed)}
          </span>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 100, height: 6, backgroundColor: 'hsl(var(--muted))', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${cycle.progress_percent}%`, background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{cycle.progress_percent}%</span>
        </div>

        {/* Sidebar toggle */}
        <button onClick={() => setShowSidebar(!showSidebar)} title="Toggle sidebar" style={{
          padding: 6, border: '1px solid hsl(var(--border))', borderRadius: 6,
          backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}>
          {showSidebar ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>

        {/* Shortcuts help */}
        <button onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)" style={{
          padding: 6, border: '1px solid hsl(var(--border))', borderRadius: 6,
          backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}>
          <Keyboard size={16} />
        </button>
      </div>
    </div>
  );
}
