import { useState, useCallback, useEffect, useRef, useId, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import { token } from '@atlaskit/tokens';

const DepartmentIntelligenceOverlay = lazy(
  () => import('@/components/resource360/DepartmentIntelligenceOverlay')
);

// Ask Caty — top-nav AI entry point.
// V2 spec: white pill, neutral border, gradient sparkle glyph (blue→purple),
// hover halo only (no fill change). Route-scoped: active on Home (/),
// disabled elsewhere.

interface SparkleProps {
  size?: number;
  monochromeColor?: string;
}

function CatySparkle({ size = 18, monochromeColor }: SparkleProps) {
  const gradId = useId();
  const fill = monochromeColor ?? `url(#${gradId})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      {!monochromeColor && (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="55%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M9 2.2 L10.2 6.3 L14.3 7.5 L10.2 8.7 L9 12.8 L7.8 8.7 L3.7 7.5 L7.8 6.3 Z"
        fill={fill}
      />
      <path
        d="M14.2 12 L14.7 13.7 L16.4 14.2 L14.7 14.7 L14.2 16.4 L13.7 14.7 L12 14.2 L13.7 13.7 Z"
        fill={fill}
      />
    </svg>
  );
}

function AskCatalystIcon() {
  // Used by IconButton (iconOnly mode) — keep monochrome brand blue
  return <CatySparkle size={16} monochromeColor={token('color.icon.brand', '#2563EB')} />;
}

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
  // Caty is now functional on every route.
  const isForYou = true;

  const [showPicker, setShowPicker] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [hovered, setHovered] = useState(false);
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

  // Close picker when navigating off home
  useEffect(() => {
    if (!isForYou) {
      setShowPicker(false);
      setShowOverlay(false);
    }
  }, [isForYou]);

  const handleClick = useCallback(() => {
    if (!isForYou) return;
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
            aria-label={tooltipLabel}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            style={{
              all: 'unset',
              boxSizing: 'border-box',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 36,
              padding: '0 14px 0 12px',
              borderRadius: 9999,
              background: '#FFFFFF',
              border: '1px solid #2563EB',
              boxShadow: hovered && isForYou
                ? '0 0 0 3px rgba(37,99,235,0.08), 0 4px 10px rgba(37,99,235,0.12)'
                : '0 1px 2px rgba(15,23,42,0.04)',
              transition: 'box-shadow 180ms ease, transform 180ms ease',
              cursor: isForYou ? 'pointer' : 'not-allowed',
              opacity: isForYou ? 1 : 0.55,
              fontFamily: "'Inter', system-ui, sans-serif",
              color: '#0F172A',
            }}
          >
            <CatySparkle size={18} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 650,
                letterSpacing: '-0.1px',
                lineHeight: 1,
                color: '#0F172A',
              }}
            >
              Ask Caty
            </span>
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
