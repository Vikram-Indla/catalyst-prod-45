/**
 * For You Page Header - Title + subtitle + Intelligence button
 * MARAM V3.1 · fy- ring-fenced · Theme-aware
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Sparkles, ChevronDown, Zap } from 'lucide-react';
const DepartmentIntelligenceOverlay = lazy(() => import('@/components/resource360/DepartmentIntelligenceOverlay'));

const DEPT_OPTIONS = ['Delivery', 'Product', 'Governance', 'Operations', 'Technical Support', 'Strategy & Planning'];

const DEPT_COLORS: Record<string, string> = {
  Delivery: '#2563EB',
  Product: '#7C3AED',
  Governance: '#0D9488',
  Operations: '#D97706',
  'Technical Support': '#DC2626',
  'Strategy & Planning': '#0891B2',
};

export function ForYouHeader() {
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showDeptIntel, setShowDeptIntel] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const deptPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (deptPickerRef.current && !deptPickerRef.current.contains(e.target as Node)) {
        setShowDeptPicker(false);
      }
    };
    if (showDeptPicker) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDeptPicker]);

  return (
    <>
      <header className="fy-header" style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Sora', system-ui", fontSize: 22, fontWeight: 700,
            color: 'var(--cp-t1)', letterSpacing: '-0.025em', margin: 0,
          }}>
            For You
          </h1>
          <p style={{ fontSize: 13, color: 'var(--cp-t3)', marginTop: 2 }}>
            Your work across all projects and hubs
          </p>
        </div>

        {/* Intelligence Button */}
        <div ref={deptPickerRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDeptPicker(v => !v)}
            className="fy-intelligence-btn"
            style={{
              background: 'var(--cp-blue)',
              color: '#FFFFFF', border: 'none',
              borderRadius: 20, padding: '0 16px', height: 32,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.3px',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 0 0 6px var(--cp-blue-wash)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = ''; }}
          >
            <Zap size={13} strokeWidth={2.2} />
            Intelligence
          </button>

          {showDeptPicker && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              background: 'var(--cp-float)', border: '1px solid var(--cp-bd)', borderRadius: 12,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: 220, padding: 6, zIndex: 50,
            }}>
              <div style={{ padding: '8px 12px 6px', fontSize: 11, fontWeight: 600, color: 'var(--cp-t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Department
              </div>
              {DEPT_OPTIONS.map(dept => (
                <button
                  key={dept}
                  onClick={() => { setSelectedDept(dept); setShowDeptPicker(false); setShowDeptIntel(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '9px 12px', border: 'none', background: 'transparent',
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: 'var(--cp-t1)', transition: 'background 100ms', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--cp-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: DEPT_COLORS[dept] || 'var(--cp-t3)', flexShrink: 0 }} />
                  {dept}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {showDeptIntel && selectedDept && (
        <Suspense fallback={null}>
          <DepartmentIntelligenceOverlay
            departmentName={selectedDept}
            onClose={() => setShowDeptIntel(false)}
          />
        </Suspense>
      )}
    </>
  );
}
