// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEK HEADER COMPONENT
// Reference: ← Back | Title | < Date > | X /10 completed | Checkout Week button
// ═══════════════════════════════════════════════════════════════════════════

import { ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
  canGoPrev = true,
  canGoNext = true,
}: T10WeekHeaderProps) {
  const weekStart = parseISO(week.week_start_date);

  return (
    <header 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Left section: Back + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Back button with text */}
        <button 
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        
        {/* List title */}
        <h1 style={{ 
          fontSize: '18px', 
          fontWeight: 700, 
          color: '#1f2937',
          margin: 0,
        }}>
          {list.name}
        </h1>
      </div>
      
      {/* Center section: Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={onPrevWeek}
          disabled={!canGoPrev}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            cursor: canGoPrev ? 'pointer' : 'not-allowed',
            opacity: canGoPrev ? 1 : 0.4,
          }}
        >
          <ChevronLeft size={18} style={{ color: '#6b7280' }} />
        </button>
        
        <span style={{ 
          fontSize: '15px', 
          fontWeight: 600, 
          color: '#1f2937',
          padding: '0 12px',
          minWidth: '130px',
          textAlign: 'center',
        }}>
          {format(weekStart, 'MMM d, yyyy')}
        </span>
        
        <button
          onClick={onNextWeek}
          disabled={!canGoNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
          }}
        >
          <ChevronRight size={18} style={{ color: '#6b7280' }} />
        </button>
      </div>
      
      {/* Right section: Stats + Checkout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Completion stats */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>
            {completedCount}
          </span>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>/10</span>
          <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '4px' }}>
            completed
          </span>
        </div>
        
        {/* Checkout button */}
        {week.is_checked_out ? (
          <span 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#16a34a',
            }}
          >
            <Check size={16} />
            Week Completed
          </span>
        ) : onCheckout && (
          <button 
            onClick={onCheckout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            <Check size={16} />
            Checkout Week
          </button>
        )}
      </div>
    </header>
  );
}

export default T10WeekHeader;
