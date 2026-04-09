import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MoreVertical, Play, Eye, Pencil, Copy, Trash2, 
  CheckCircle2, XCircle, AlertTriangle, Clock,
  Calendar, Archive, RotateCcw
} from 'lucide-react';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  description: string | null;
  status: string;
  planned_start: string | null;
  planned_end: string | null;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  in_progress_count?: number;
  environment_id?: string | null;
}

interface TestCycleCardProps {
  cycle: TestCycle;
  onView: () => void;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onStart: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onArchive: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:       { label: 'DRAFT',       color: '#253858', bg: '#DFE1E6', border: '#DFE1E6' },
  planned:     { label: 'PLANNED',     color: '#253858', bg: '#DFE1E6', border: '#DFE1E6' },
  active:      { label: 'IN PROGRESS', color: '#0747A6', bg: '#DEEBFF', border: '#B3D4FF' },
  in_progress: { label: 'IN PROGRESS', color: '#0747A6', bg: '#DEEBFF', border: '#B3D4FF' },
  completed:   { label: 'COMPLETED',   color: '#006644', bg: '#E3FCEF', border: '#ABF5D1' },
  done:        { label: 'DONE',        color: '#006644', bg: '#E3FCEF', border: '#ABF5D1' },
  archived:    { label: 'ARCHIVED',    color: '#253858', bg: '#DFE1E6', border: '#DFE1E6' },
  paused:      { label: 'PAUSED',      color: '#253858', bg: '#DFE1E6', border: '#DFE1E6' },
};

const STATUS_DISPLAY_LABELS: Record<string, string> = {
  draft:     'Draft',
  planned:   'Planned',
  active:    'In Progress',
  paused:    'Paused',
  completed: 'Completed',
  archived:  'Archived',
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  height: 50,
  padding: '8px 12px',
  border: 'none',
  borderRadius: 6,
  backgroundColor: 'transparent',
  color: 'var(--fg-2)',
  fontSize: 13,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  textAlign: 'left',
};

export function TestCycleCard({
  cycle, onView, onEdit, onClone, onDelete, onStart, onComplete, onReopen, onArchive,
}: TestCycleCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const status = statusConfig[(cycle.status || 'draft').toLowerCase().replace(/-/g, '_')] ?? statusConfig['draft'];

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const executedCount = cycle.passed_count + cycle.failed_count + cycle.blocked_count + cycle.skipped_count;
  const progressPercent = cycle.total_cases > 0 ? Math.min(100, Math.round((executedCount / cycle.total_cases) * 100)) : 0;
  const isOverdue = !!(cycle.planned_end && new Date(cycle.planned_end) < new Date() && cycle.status !== 'completed' && cycle.status !== 'archived');

  return (
    <div
      style={{
        backgroundColor: 'var(--cp-float)',
        border: '1px solid var(--divider)',
        borderRadius: 12,
        padding: 20,
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--divider)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--divider)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '4px 10px', borderRadius: 6 }}>
            {cycle.cycle_key}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
            color: status.color, backgroundColor: status.bg,
            padding: '2px 6px', borderRadius: 4, height: 20,
            display: 'inline-flex', alignItems: 'center',
          }}>
            {STATUS_DISPLAY_LABELS[cycle.status] ?? cycle.status}
          </span>
        </div>

        {/* Actions Menu */}
        <div ref={menuRef} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            width: 32, height: 32, padding: 0, border: 'none', borderRadius: 6,
            backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, width: 180,
              backgroundColor: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)', padding: 6, zIndex: 100,
            }}>
              <button onClick={() => { onView(); setMenuOpen(false); }} style={menuItemStyle}>
                <Eye size={14} style={{ color: 'var(--fg-3)' }} /> View Details
              </button>
              {cycle.status !== 'archived' && cycle.status !== 'completed' && (
                <button onClick={() => { onEdit(); setMenuOpen(false); }} style={menuItemStyle}>
                  <Pencil size={14} style={{ color: 'var(--fg-3)' }} /> Edit
                </button>
              )}
              <button onClick={() => { onClone(); setMenuOpen(false); }} style={menuItemStyle}>
                <Copy size={14} style={{ color: 'var(--fg-3)' }} /> Clone Cycle
              </button>
              <div style={{ height: 1, backgroundColor: 'var(--divider)', margin: '6px 0' }} />
              {cycle.status === 'draft' && (
                <button onClick={() => { onStart(); setMenuOpen(false); }} style={menuItemStyle}>
                  <Play size={14} style={{ color: 'var(--sem-success)' }} /> Activate Cycle
                </button>
              )}
              {cycle.status === 'active' && (
                <button onClick={() => { onComplete(); setMenuOpen(false); }} style={menuItemStyle}>
                  <CheckCircle2 size={14} style={{ color: 'var(--cp-blue)' }} /> Complete Cycle
                </button>
              )}
              {cycle.status === 'completed' && (
                <button onClick={() => { onArchive(); setMenuOpen(false); }} style={menuItemStyle}>
                  <Archive size={14} style={{ color: 'var(--fg-3)' }} /> Archive
                </button>
              )}
              <div style={{ height: 1, backgroundColor: 'var(--divider)', margin: '6px 0' }} />
              <button onClick={() => { onDelete(); setMenuOpen(false); }} style={{ ...menuItemStyle, color: 'var(--sem-danger)' }}>
                <Trash2 size={14} style={{ color: 'var(--sem-danger)' }} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--fg-1)', margin: '0 0 6px' }}>{cycle.name}</h3>

      {/* Date Range & Owner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--fg-3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} />
          {formatDate(cycle.planned_start)} — {formatDate(cycle.planned_end)}
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>Progress</span>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{executedCount}/{cycle.total_cases} executed</span>
        </div>
        <div style={{ height: 8, backgroundColor: 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progressPercent}%`,
            background: progressPercent === 100
              ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
              : 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%)',
            borderRadius: 4, transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: progressPercent === 100 ? 'var(--sem-success)' : 'var(--cp-blue)' }}>
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#ECFDF5', borderRadius: 6 }}>
          <CheckCircle2 size={14} style={{ color: 'var(--sem-success)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sem-success)' }}>{cycle.passed_count}</span>
          <span style={{ fontSize: 12, color: 'var(--sem-success)' }}>Passed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#FEF2F2', borderRadius: 6 }}>
          <XCircle size={14} style={{ color: 'var(--sem-danger)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sem-danger)' }}>{cycle.failed_count}</span>
          <span style={{ fontSize: 12, color: 'var(--sem-danger)' }}>Failed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#FFFBEB', borderRadius: 6 }}>
          <AlertTriangle size={14} style={{ color: 'var(--sem-warning)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sem-warning)' }}>{cycle.blocked_count}</span>
          <span style={{ fontSize: 12, color: 'var(--sem-warning)' }}>Blocked</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: 'var(--cp-bd-zone)', borderRadius: 6 }}>
          <Clock size={14} style={{ color: 'var(--fg-3)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-3)' }}>{cycle.not_run_count}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Not Run</span>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--cp-bd-zone)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onView} style={{
          height: 34, padding: '0 14px', border: '1px solid var(--divider)', borderRadius: 6,
          backgroundColor: 'var(--cp-float)', color: 'var(--fg-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Eye size={14} /> View
        </button>
        {cycle.status === 'active' && (
          <button onClick={() => navigate(`/testhub/cycles/${cycle.id}`)} style={{
            height: 34, padding: '0 14px', background: 'linear-gradient(135deg, #10B981 0%, var(--sem-success) 100%)',
            border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Play size={14} /> Execute
          </button>
        )}
        {cycle.status === 'draft' && (
          <button onClick={() => navigate(`/testhub/cycles/${cycle.id}`)} style={{
            height: 34, padding: '0 14px', background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--cp-primary-70) 100%)',
            border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Play size={14} /> Plan
          </button>
        )}
      </div>
    </div>
  );
}
