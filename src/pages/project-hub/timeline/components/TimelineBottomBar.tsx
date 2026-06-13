import React, { useState, useCallback } from 'react';

export type ZoomLevel = 'week' | 'month' | 'quarter';

export interface TimelineBottomBarProps {
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
  onScrollToToday: () => void;
  onToggleLegend?: () => void;
  legendOpen?: boolean;
}

const ZOOM_LEVELS: { key: ZoomLevel; label: string }[] = [
  { key: 'week', label: 'Weeks' },
  { key: 'month', label: 'Months' },
  { key: 'quarter', label: 'Quarters' },
];

const T = {
  surface:        'var(--ds-surface, #FFFFFF)',
  border:         'var(--ds-border, #DFE1E6)',
  borderSelected: 'var(--ds-border-selected, #0052CC)',
  borderFocused:  'var(--ds-border-focused, #388BFF)',
  bgSelected:     'var(--ds-background-selected, #E9F2FE)',
  bgHover:        'var(--ds-background-neutral-subtle-hovered, #F1F2F4)',
  bgActive:       'var(--ds-background-neutral-subtle-pressed, #DCDFE4)',
  text:           'var(--ds-text, #172B4D)',
  textSelected:   'var(--ds-link, #0052CC)',
  textSubtle:     'var(--ds-text-subtle, #626F86)',
  focusRing:      '0 0 0 2px var(--ds-border-focused, #388BFF)',
};

function InfoCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" role="presentation">
      <path d="M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-8.5a1 1 0 0 0-1 1V15a1 1 0 0 0 2 0v-2.5a1 1 0 0 0-1-1zm0-1.125a1.375 1.375 0 1 0 0-2.75 1.375 1.375 0 0 0 0 2.75z" />
    </svg>
  );
}

function ChevronRightLargeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" role="presentation">
      <path d="M10.294 9.698a.988.988 0 0 1 0-1.407 1.01 1.01 0 0 1 1.419 0l2.965 2.94a1.09 1.09 0 0 1 0 1.548l-2.955 2.93a1.01 1.01 0 0 1-1.42 0 .988.988 0 0 1 0-1.407l2.318-2.297-2.327-2.307z" />
    </svg>
  );
}

function BarButton({ children, onClick, title, style, isSquare }: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  style?: React.CSSProperties;
  isSquare?: boolean;
}) {
  const [hoverState, setHoverState] = useState<'idle' | 'hover' | 'active'>('idle');
  const bg = hoverState === 'active' ? T.bgActive : hoverState === 'hover' ? T.bgHover : T.surface;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHoverState('hover')}
      onMouseLeave={() => setHoverState('idle')}
      onMouseDown={() => setHoverState('active')}
      onMouseUp={() => setHoverState('hover')}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 32,
        minWidth: isSquare ? 32 : undefined,
        padding: isSquare ? 0 : '0 14px',
        fontSize: 14,
        fontFamily: 'var(--ds-font-family-body)',
        fontWeight: 400,
        color: T.text,
        background: bg,
        border: `1px solid ${T.border}`,
        borderRadius: 3,
        cursor: 'pointer',
        outline: 'none',
        transition: 'background 0.1s ease',
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.boxShadow = T.focusRing; }}
      onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {children}
    </button>
  );
}

export function TimelineBottomBar({
  zoom,
  onZoomChange,
  onScrollToToday,
  onToggleLegend,
  legendOpen,
}: TimelineBottomBarProps) {
  const [hoveredZoom, setHoveredZoom] = useState<ZoomLevel | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleZoomKeyDown = useCallback((e: React.KeyboardEvent, currentKey: ZoomLevel) => {
    const idx = ZOOM_LEVELS.findIndex(z => z.key === currentKey);
    if (e.key === 'ArrowRight' && idx < ZOOM_LEVELS.length - 1) {
      e.preventDefault();
      onZoomChange(ZOOM_LEVELS[idx + 1].key);
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      onZoomChange(ZOOM_LEVELS[idx - 1].key);
    }
  }, [onZoomChange]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 4px',
        background: T.surface,
        border: `1px solid rgba(11, 18, 14, 0.14)`,
        borderRadius: 4,
        boxShadow: 'rgba(30, 31, 33, 0.15) 0px 8px 12px 0px',
        zIndex: 100,
        userSelect: 'none',
      }}
      role="toolbar"
      aria-label="Timeline zoom controls"
    >
      {!collapsed && (
        <>
          <BarButton onClick={onScrollToToday} title="Scroll to today">Today</BarButton>

          <div
            role="radiogroup"
            aria-label="Zoom level"
            style={{
              display: 'flex',
              alignItems: 'center',
              border: `1px solid ${T.border}`,
              borderRadius: 3,
              overflow: 'hidden',
              height: 32,
            }}
          >
            {ZOOM_LEVELS.map((level, i) => {
              const isActive = zoom === level.key;
              const isHovered = hoveredZoom === level.key;
              const isLast = i === ZOOM_LEVELS.length - 1;
              return (
                <button
                  key={level.key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`Zoom to ${level.label}`}
                  onClick={() => onZoomChange(level.key)}
                  onKeyDown={e => handleZoomKeyDown(e, level.key)}
                  onMouseEnter={() => setHoveredZoom(level.key)}
                  onMouseLeave={() => setHoveredZoom(null)}
                  onFocus={e => {
                    e.currentTarget.style.outline = `2px solid ${T.borderFocused}`;
                    e.currentTarget.style.outlineOffset = '-2px';
                  }}
                  onBlur={e => { e.currentTarget.style.outline = 'none'; }}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    fontSize: 14,
                    fontFamily: 'var(--ds-font-family-body)',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? T.textSelected : T.text,
                    background: isActive ? T.bgSelected : isHovered ? T.bgHover : T.surface,
                    border: 'none',
                    borderRight: isLast ? 'none' : `1px solid ${T.border}`,
                    borderRadius: 0,
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: isActive ? `inset 0 0 0 2px ${T.borderSelected}` : 'none',
                    transition: 'background 0.1s ease, color 0.1s ease',
                  }}
                >
                  {level.label}
                </button>
              );
            })}
          </div>

          {onToggleLegend && (
            <BarButton
              onClick={onToggleLegend}
              title={legendOpen ? 'Close legend' : 'Show legend'}
              isSquare
              style={{
                color: legendOpen ? T.textSelected : T.textSubtle,
                background: legendOpen ? T.bgSelected : undefined,
              }}
            >
              <InfoCircleIcon />
            </BarButton>
          )}
        </>
      )}

      <BarButton
        onClick={() => setCollapsed(v => !v)}
        title={collapsed ? 'Expand controls' : 'Collapse controls'}
        isSquare
        style={{
          color: T.textSubtle,
          transform: collapsed ? 'rotate(180deg)' : 'none',
          transition: 'background 0.1s ease, transform 0.2s ease',
        }}
      >
        <ChevronRightLargeIcon />
      </BarButton>
    </div>
  );
}
