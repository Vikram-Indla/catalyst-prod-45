import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import { xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';

const DepartmentIntelligenceOverlay = lazy(
  () => import('@/components/resource360/DepartmentIntelligenceOverlay')
);

// Ask Caty — top-nav AI entry point.
//
// Apr 2026 rewire: the "Intelligence" button on /for-you was retired and its
// functionality (department picker → DepartmentIntelligenceOverlay) is now
// hosted exclusively by this pill. Behavior is route-scoped:
//
//   /for-you      → opens the department picker dropdown
//   anywhere else → button is rendered disabled (placeholder, no-op)
function AskCatalystIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 1.5l1.2 3.3 3.3 1.2-3.3 1.2L8 10.5 6.8 7.2 3.5 6l3.3-1.2L8 1.5zM12 9l.7 1.8 1.8.7-1.8.7L12 14l-.7-1.8-1.8-.7 1.8-.7L12 9z"
        fill={token('color.icon.brand', '#2563EB')}
      />
    </svg>
  );
}

const pillStyles = xcss({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'space.075',
  height: '32px',
  paddingInline: 'space.150',
  backgroundColor: 'elevation.surface',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: '9999px',
  color: 'color.text',
  font: 'font.body',
  cursor: 'pointer',
});

const DEPT_OPTIONS = ['Delivery', 'Product', 'Governance', 'Operations', 'Technical Support', 'Strategy & Planning'];

const DEPT_COLORS: Record<string, string> = {
  Delivery: '#2563EB',
  Product: '#7C3AED',
  Governance: '#0D9488',
  Operations: '#D97706',
  'Technical Support': '#DC2626',
  'Strategy & Planning': '#0891B2',
};

interface AskCatalystPillProps {
  iconOnly?: boolean;
}

export function AskCatalystPill({ iconOnly = false }: AskCatalystPillProps) {
  const location = useLocation();
  const isForYou = location.pathname === '/for-you' || location.pathname.startsWith('/for-you/');

  const [showPicker, setShowPicker] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Outside-click closes the picker
  useEffect(() => {
    if (!showPicker) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showPicker]);

  // Close picker when navigating off /for-you
  useEffect(() => {
    if (!isForYou) {
      setShowPicker(false);
      setShowOverlay(false);
    }
  }, [isForYou]);

  const handleClick = useCallback(() => {
    if (!isForYou) return; // dead on other pages
    setShowPicker((v) => !v);
  }, [isForYou]);

  const tooltipLabel = isForYou ? 'Ask Caty' : 'Ask Caty (available on Home)';

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {iconOnly ? (
        <Tooltip content={tooltipLabel} position="bottom">
          <IconButton
            label={tooltipLabel}
            appearance="subtle"
            icon={AskCatalystIcon}
            onClick={handleClick}
            isDisabled={!isForYou}
          />
        </Tooltip>
      ) : (
        <Tooltip content={tooltipLabel} position="bottom">
          <button
            type="button"
            onClick={handleClick}
            disabled={!isForYou}
            aria-disabled={!isForYou}
            style={{
              all: 'unset',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: isForYou ? 'pointer' : 'not-allowed',
              height: 32,
              paddingInline: 12,
              border: '1px solid #DFE1E6',
              borderRadius: 6,
              background: '#FFFFFF',
              opacity: isForYou ? 1 : 0.6,
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              if (isForYou) e.currentTarget.style.background = '#F4F5F7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <AskCatalystIcon />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Ask Caty</span>
          </button>
        </Tooltip>
      )}

      {showPicker && isForYou && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            background: 'var(--cp-float, #FFFFFF)',
            border: '1px solid var(--cp-bd, #DFE1E6)',
            borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            minWidth: 220,
            padding: 6,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: '8px 12px 6px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--cp-t3, #6B778C)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Select Department
          </div>
          {DEPT_OPTIONS.map((dept) => (
            <button
              key={dept}
              onClick={() => {
                setSelectedDept(dept);
                setShowPicker(false);
                setShowOverlay(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--cp-t1, #172B4D)',
                transition: 'background 100ms',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--cp-hover, rgba(9,30,66,0.06))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: DEPT_COLORS[dept] || 'var(--cp-t3, #6B778C)',
                  flexShrink: 0,
                }}
              />
              {dept}
            </button>
          ))}
        </div>
      )}

      {showOverlay && selectedDept && (
        <Suspense fallback={null}>
          <DepartmentIntelligenceOverlay
            departmentName={selectedDept}
            onClose={() => setShowOverlay(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
