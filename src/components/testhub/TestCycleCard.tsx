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
  start_date: string | null;
  end_date: string | null;
  progress_percent: number;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  not_run_count: number;
  owner?: {
    id: string;
    full_name: string;
  };
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

const statusConfig = {
  draft: { label: 'Draft', color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' },
  active: { label: 'Active', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  completed: { label: 'Completed', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  archived: { label: 'Archived', color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  border: 'none',
  borderRadius: 6,
  backgroundColor: 'transparent',
  color: '#334155',
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
  const status = statusConfig[cycle.status];

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

  const getOwnerInitials = () => {
    if (!cycle.owner?.full_name) return '?';
    return cycle.owner.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const executedCount = cycle.passed_count + cycle.failed_count + cycle.blocked_count + cycle.skipped_count;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: 20,
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#CBD5E1';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E2E8F0';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => navigate(`/testhub/cycles/${cycle.id}`)}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 10px', borderRadius: 6 }}>
            {cycle.cycle_key}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 500, color: status.color, backgroundColor: status.bg,
            border: `1px solid ${status.border}`, padding: '4px 10px', borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status.color }} />
            {status.label}
          </span>
        </div>

        {/* Actions Menu */}
        <div ref={menuRef} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            width: 32, height: 32, padding: 0, border: 'none', borderRadius: 6,
            backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, width: 180,
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)', padding: 6, zIndex: 100,
            }}>
              <button onClick={() => { onView(); setMenuOpen(false); }} style={menuItemStyle}>
                <Eye size={14} style={{ color: '#64748B' }} /> View Details
              </button>
              {cycle.status !== 'archived' && cycle.status !== 'completed' && (
                <button onClick={() => { onEdit(); setMenuOpen(false); }} style={menuItemStyle}>
                  <Pencil size={14} style={{ color: '#64748B' }} /> Edit
                </button>
              )}
              <button onClick={() => { onClone(); setMenuOpen(false); }} style={menuItemStyle}>
                <Copy size={14} style={{ color: '#64748B' }} /> Clone Cycle
              </button>
              <div style={{ height: 1, backgroundColor: '#E2E8F0', margin: '6px 0' }} />
              {cycle.status === 'draft' && (
                <button onClick={() => { onStart(); setMenuOpen(false); }} style={menuItemStyle}>
                  <Play size={14} style={{ color: '#059669' }} /> Start Cycle
                </button>
              )}
              {cycle.status === 'active' && (
                <button onClick={() => { onComplete(); setMenuOpen(false); }} style={menuItemStyle}>
                  <CheckCircle2 size={14} style={{ color: '#2563EB' }} /> Complete Cycle
                </button>
              )}
              {cycle.status === 'completed' && (
                <>
                  <button onClick={() => { onReopen(); setMenuOpen(false); }} style={menuItemStyle}>
                    <RotateCcw size={14} style={{ color: '#F59E0B' }} /> Reopen Cycle
                  </button>
                  <button onClick={() => { onArchive(); setMenuOpen(false); }} style={menuItemStyle}>
                    <Archive size={14} style={{ color: '#64748B' }} /> Archive
                  </button>
                </>
              )}
              <div style={{ height: 1, backgroundColor: '#E2E8F0', margin: '6px 0' }} />
              <button onClick={() => { onDelete(); setMenuOpen(false); }} style={{ ...menuItemStyle, color: '#DC2626' }}>
                <Trash2 size={14} style={{ color: '#DC2626' }} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 17, fontWeight: 600, color: '#0F172A', margin: '0 0 6px' }}>{cycle.name}</h3>

      {/* Date Range & Owner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, fontSize: 13, color: '#64748B' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} />
          {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
        </span>
        {cycle.owner && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', backgroundColor: '#E0E7FF', color: '#4F46E5',
              fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{getOwnerInitials()}</div>
            {cycle.owner.full_name}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Progress</span>
          <span style={{ fontSize: 13, color: '#64748B' }}>{executedCount}/{cycle.total_cases} executed</span>
        </div>
        <div style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${cycle.progress_percent}%`,
            background: cycle.progress_percent === 100
              ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
              : 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%)',
            borderRadius: 4, transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: cycle.progress_percent === 100 ? '#059669' : '#2563EB' }}>
            {cycle.progress_percent}%
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#ECFDF5', borderRadius: 6 }}>
          <CheckCircle2 size={14} style={{ color: '#059669' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>{cycle.passed_count}</span>
          <span style={{ fontSize: 12, color: '#059669' }}>Passed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#FEF2F2', borderRadius: 6 }}>
          <XCircle size={14} style={{ color: '#DC2626' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>{cycle.failed_count}</span>
          <span style={{ fontSize: 12, color: '#DC2626' }}>Failed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#FFFBEB', borderRadius: 6 }}>
          <AlertTriangle size={14} style={{ color: '#D97706' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#D97706' }}>{cycle.blocked_count}</span>
          <span style={{ fontSize: 12, color: '#D97706' }}>Blocked</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#F1F5F9', borderRadius: 6 }}>
          <Clock size={14} style={{ color: '#64748B' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>{cycle.not_run_count}</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>Not Run</span>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onView} style={{
          height: 34, padding: '0 14px', border: '1px solid #E2E8F0', borderRadius: 6,
          backgroundColor: '#FFFFFF', color: '#334155', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Eye size={14} /> View
        </button>
        {cycle.status === 'active' && (
          <button onClick={() => navigate(`/testhub/cycles/${cycle.id}`)} style={{
            height: 34, padding: '0 14px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Play size={14} /> Execute
          </button>
        )}
        {cycle.status === 'draft' && (
          <button onClick={onStart} style={{
            height: 34, padding: '0 14px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            border: 'none', borderRadius: 6, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Play size={14} /> Start
          </button>
        )}
      </div>
    </div>
  );
}
