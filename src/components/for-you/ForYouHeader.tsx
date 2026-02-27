/**
 * For You Page Header - Title + Intelligence button (CATALYST10 v3 spec)
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

const DepartmentIntelligenceOverlay = lazy(() => import('@/components/resource360/DepartmentIntelligenceOverlay'));

const DEPT_OPTIONS = ['Delivery', 'Product', 'Governance', 'Operations', 'Technical Support', 'Strategy & Planning'];

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
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-bold text-[hsl(222,47%,11%)] tracking-[-0.03em]">
          For you
        </h1>

        {/* Intelligence Button with Department Picker */}
        <div ref={deptPickerRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDeptPicker(v => !v)}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 4px rgba(37,99,235,0.25)',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}
          >
            <Sparkles size={14} strokeWidth={2.2} />
            Intelligence
            <ChevronDown size={12} style={{ opacity: 0.7 }} />
          </button>

          {showDeptPicker && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                minWidth: 220,
                padding: '6px',
                zIndex: 50,
              }}
            >
              <div style={{ padding: '8px 12px 6px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Department
              </div>
              {DEPT_OPTIONS.map(dept => (
                <button
                  key={dept}
                  onClick={() => {
                    setSelectedDept(dept);
                    setShowDeptPicker(false);
                    setShowDeptIntel(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '9px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 7,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#1E293B',
                    transition: 'background 100ms',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: dept === 'Delivery' ? '#2563EB' : dept === 'Product' ? '#7C3AED' : dept === 'Governance' ? '#0D9488' : dept === 'Operations' ? '#D97706' : dept === 'Technical Support' ? '#DC2626' : '#0891B2',
                    flexShrink: 0,
                  }} />
                  {dept}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Department Intelligence Overlay */}
      {showDeptIntel && selectedDept && (
        <Suspense fallback={null}>
          <TooltipProvider>
            <DepartmentIntelligenceOverlay
              departmentName={selectedDept}
              onClose={() => setShowDeptIntel(false)}
            />
          </TooltipProvider>
        </Suspense>
      )}
    </>
  );
}
