// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEK HEADER COMPONENT
// - Week navigation with arrows
// - Current Week badge
// ═══════════════════════════════════════════════════════════════════════════

import { ArrowLeft, ChevronLeft, ChevronRight, CheckSquare, Check } from 'lucide-react';
import { format, parseISO, isThisWeek } from 'date-fns';
import type { T10WeekRow, T10ListRow } from '../../types';

interface T10WeekHeaderProps {
  list: T10ListRow;
  week: T10WeekRow;
  completedCount: number;
  totalCount: number;
  onBack: () => void;
  onCheckout?: () => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
}

export function T10WeekHeader({ 
  list, 
  week, 
  completedCount, 
  totalCount, 
  onBack,
  onCheckout,
  onPrevWeek,
  onNextWeek,
  canGoPrev = false,
  canGoNext = false,
}: T10WeekHeaderProps) {
  const weekStart = parseISO(week.week_start_date);
  const isCurrentWeek = isThisWeek(weekStart);

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Back button */}
        <button 
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
        >
          <ArrowLeft size={18} style={{ color: '#374151' }} />
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{
                padding: '2px 8px',
                backgroundColor: '#eff6ff',
                borderRadius: '4px',
                fontFamily: 'SF Mono, Monaco, monospace',
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563eb',
              }}
            >
              {list.list_key}
            </span>
            <span style={{ color: '#9ca3af' }}>/</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
              {list.name}
            </span>
          </div>
          
          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={onPrevWeek}
                disabled={!canGoPrev}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: canGoPrev ? 'pointer' : 'not-allowed',
                  opacity: canGoPrev ? 1 : 0.3,
                }}
              >
                <ChevronLeft size={16} style={{ color: '#6b7280' }} />
              </button>
              
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                Week of {format(weekStart, 'MMM d, yyyy')}
              </span>
              
              <button
                onClick={onNextWeek}
                disabled={!canGoNext}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  opacity: canGoNext ? 1 : 0.3,
                }}
              >
                <ChevronRight size={16} style={{ color: '#6b7280' }} />
              </button>
            </div>
            
            {isCurrentWeek && (
              <span 
                style={{
                  padding: '2px 10px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#16a34a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Current Week
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb' }}>
            {completedCount}
          </span>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>/</span>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#374151' }}>
            {totalCount}
          </span>
          <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '4px' }}>
            completed
          </span>
        </div>
        
        {/* Checkout button or checked out badge */}
        {week.is_checked_out ? (
          <span 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#16a34a',
            }}
          >
            <Check size={16} />
            Checked Out
          </span>
        ) : onCheckout && (
          <button 
            onClick={onCheckout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            <CheckSquare size={16} />
            Checkout Week
          </button>
        )}
      </div>
    </div>
  );
}

export default T10WeekHeader;
