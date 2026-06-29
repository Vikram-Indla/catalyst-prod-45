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
            <stop offset="0%" stopColor="var(--ds-text-brand)" />
            <stop offset="55%" stopColor="var(--ds-text-brand, var(--cp-workstream-catalyst-primary))" />
            <stop offset="100%" stopColor="var(--cp-purple-60)" />
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
  return <CatySparkle size={16} monochromeColor={token('color.icon.brand', 'var(--ds-link)')} />;
}

// CLAUDE.md ENTERPRISE UI GUARDRAIL carve-out — static rainbow border on AI CTAs.
// MUST be `animation: none` — no rotation, no shift, no shimmer. Pure colour treatment.
const STATIC_RAINBOW = `conic-gradient(
  from 0deg,
  var(--ds-background-accent-magenta-bolder) 0deg,
  var(--ds-background-discovery-bold) 60deg,
  var(--ds-link) 120deg,
  var(--ds-background-information-bold) 180deg,
  var(--ds-background-success) 240deg,
  var(--ds-background-warning-bold) 300deg,
  var(--ds-background-accent-magenta-bolder) 360deg
)`;

const DEPT_OPTIONS = ['Delivery', 'Product', 'Governance', 'Operations', 'Technical Support', 'Strategy & Planning'];

const DEPT_COLORS: Record<string, string> = {
  Delivery: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  Product: 'var(--cp-purple-60)',
  Governance: 'var(--cp-teal-60)',
  Operations: 'var(--ds-text-warning, var(--cp-warning))',
  'Technical Support': 'var(--ds-text-danger, var(--cp-danger))',
  'Strategy & Planning': 'var(--ds-link)',
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
          {/* Always-on static rainbow border — AI affordance signifier.
              See CLAUDE.md ENTERPRISE UI GUARDRAIL carve-out (2026-05-31). */}
          <div
            style={{
              display: 'inline-flex',
              padding: 0,
              borderRadius: 9999,
              background: STATIC_RAINBOW,
              opacity: isForYou ? 1 : 0.55,
            }}
          >
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
                height: 32,
                padding: '0 14px 0 12px',
                borderRadius: 9999,
                background: token('elevation.surface', 'var(--ds-surface)'),
                // Border removed — rainbow wrapper provides the AI signifier.
                // Hover state: subtle raised shadow only (no extra ring; rainbow IS the focus marker).
                boxShadow: hovered && isForYou
                  ? 'var(--ds-shadow-raised, 0 4px 10px rgba(37,99,235,0.12))'
                  : 'var(--ds-shadow-raised, 0 1px 2px rgba(15,23,42,0.04))',
                transition: 'box-shadow 180ms ease, transform 180ms ease',
                cursor: isForYou ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--cp-font-body)',
                color: token('color.text', 'var(--cp-ink-1, var(--cp-ink-1))'),
              }}
            >
              <CatySparkle size={18} />
              <span
                style={{
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 650,
                  letterSpacing: '-0.1px',
                  lineHeight: 1,
                  color: token('color.text', 'var(--cp-ink-1, var(--cp-ink-1))'),
                }}
              >
                Ask Caty
              </span>
            </button>
          </div>
        </Tooltip>
      )}

      {showPicker && isForYou && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--ds-surface-overlay, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated))))',
            border: '1px solid var(--ds-border, var(--cp-bd, var(--cp-lozenge-grey-bg, var(--cp-border-neutral))))',
            borderRadius: 12,
            // ADS canonical overlay shadow — works in both modes via the token resolver
            boxShadow: 'var(--ds-shadow-overlay, 0 8px 30px rgba(0,0,0,0.12))',
            minWidth: 220,
            padding: 4,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: '8px 12px 6px',
              fontSize: 'var(--ds-font-size-100)',
              fontWeight: 600,
              color: 'var(--cp-t3, var(--cp-text-secondary))',
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
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 500,
                color: 'var(--cp-t1, var(--cp-text-primary, var(--cp-text-inverse)))',
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
                  background: DEPT_COLORS[dept] || 'var(--cp-t3, var(--cp-text-secondary))',
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
