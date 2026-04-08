import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   StatusLozenge — Catalyst V12
   3-color JIRA guardrail: Grey / Blue / Green
   ═══════════════════════════════════════════════════════════ */

// ── Types ─────────────────────────────────────────────────

interface StatusLozengeProps {
  status: string;
  size?: 'sm' | 'md';
  withDropdown?: boolean;
  transitions?: string[];
  onChange?: (newStatus: string) => void;
}

// ── Color mapping (3-color guardrail) ─────────────────────

const GREY = { bg: '#DFE1E6', text: '#253858' };
const BLUE = { bg: '#DEEBFF', text: '#0747A6' };
const GREEN = { bg: '#E3FCEF', text: '#006644' };

const STATUS_MAP: Record<string, { bg: string; text: string }> = {
  'to do': GREY,
  'backlog': GREY,
  'on hold': GREY,
  'open': GREY,
  'in progress': BLUE,
  'in review': BLUE,
  'active': BLUE,
  'in beta': BLUE,
  'in requirements': BLUE,
  'done': GREEN,
  'approved': GREEN,
  'completed': GREEN,
  'closed': GREEN,
};

function getStatusColors(status: string): { bg: string; text: string } {
  return STATUS_MAP[status.toLowerCase()] ?? GREY;
}

// ── Size config ───────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { height: 18, fontSize: 10, py: 3 },
  md: { height: 24, fontSize: 11, py: 5 },
} as const;

// ── Component ─────────────────────────────────────────────

export function StatusLozenge({
  status,
  size = 'md',
  withDropdown = false,
  transitions = [],
  onChange,
}: StatusLozengeProps) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const colors = useMemo(() => getStatusColors(status), [status]);
  const cfg = SIZE_CONFIG[size];

  // ── Position ──
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const panelH = transitions.length * 32 + 8;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const top = spaceBelow < panelH && r.top > spaceBelow ? r.top - panelH - 4 : r.bottom + 4;
    setPos({ top, left: r.left });
  }, [transitions.length]);

  const openDropdown = useCallback(() => {
    if (!withDropdown || transitions.length === 0) return;
    calcPos();
    setOpen(true);
    setFocusIdx(0);
  }, [withDropdown, transitions.length, calcPos]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const selectOption = useCallback(
    (s: string) => {
      onChange?.(s);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  // ── Click outside / scroll close ──
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) closeDropdown();
    };
    const onScroll = () => closeDropdown();
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, closeDropdown]);

  // ── Focus first option ──
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => optionRefs.current[0]?.focus());
    }
  }, [open]);

  // ── Keyboard on dropdown ──
  const handlePanelKey = (e: React.KeyboardEvent) => {
    const count = transitions.length;
    if (!count) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        { const next = (focusIdx + 1) % count; setFocusIdx(next); optionRefs.current[next]?.focus(); }
        break;
      case 'ArrowUp':
        e.preventDefault();
        { const prev = (focusIdx - 1 + count) % count; setFocusIdx(prev); optionRefs.current[prev]?.focus(); }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectOption(transitions[focusIdx]);
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
      case 'Tab':
        e.preventDefault();
        break;
    }
  };

  // ── Lozenge style ──
  const lozengeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: cfg.height,
    padding: `0 8px`,
    borderRadius: 3,
    border: 'none',
    background: colors.bg,
    color: colors.text,
    fontSize: cfg.fontSize,
    fontWeight: 700,
    fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    cursor: withDropdown && transitions.length > 0 ? 'pointer' : 'default',
    outline: 'none',
    transition: 'background-color 200ms ease-in-out',
  };

  const Tag = withDropdown ? 'button' : 'span';
  const interactiveProps = withDropdown
    ? {
        type: 'button' as const,
        role: 'button' as const,
        'aria-haspopup': 'listbox' as const,
        'aria-expanded': open,
        onClick: () => (open ? closeDropdown() : openDropdown()),
        onKeyDown: (e: React.KeyboardEvent) => {
          if ((e.key === 'Enter' || e.key === ' ') && !open) {
            e.preventDefault();
            openDropdown();
          }
        },
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.filter = 'brightness(0.92)';
        },
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.filter = 'none';
        },
      }
    : {};

  return (
    <>
      <Tag
        ref={withDropdown ? triggerRef : undefined}
        style={lozengeStyle}
        {...(interactiveProps as any)}
      >
        {status.toUpperCase()}
        {withDropdown && transitions.length > 0 && (
          <ChevronDown
            size={12}
            style={{
              flexShrink: 0,
              transition: 'transform 200ms ease-in-out',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </Tag>

      {open &&
        transitions.length > 0 &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: 'fixed',
              zIndex: 1000,
              top: pos.top,
              left: pos.left,
              minWidth: 160,
              background: 'var(--cp-bg-elevated, #FFFFFF)',
              border: '1px solid var(--cp-border-default, rgba(15, 23, 42, 0.12))',
              borderRadius: 4,
              boxShadow: 'var(--cp-shadow-overlay, 0 8px 16px rgba(0,0,0,0.15))',
              padding: 4,
              fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
            }}
            onKeyDown={handlePanelKey}
          >
            {transitions.map((t, i) => {
              const c = getStatusColors(t);
              return (
                <div
                  key={t}
                  ref={(el) => { optionRefs.current[i] = el; }}
                  role="option"
                  tabIndex={-1}
                  aria-selected={focusIdx === i}
                  onClick={() => selectOption(t)}
                  onMouseEnter={(e) => {
                    setFocusIdx(i);
                    e.currentTarget.style.background = 'var(--cp-interact-hover, rgba(15, 23, 42, 0.04))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 32,
                    padding: '0 12px',
                    cursor: 'pointer',
                    borderRadius: 3,
                    fontSize: 11,
                    fontWeight: 400,
                    color: 'var(--cp-text-primary, #0F172A)',
                    background: focusIdx === i ? 'var(--cp-interact-hover, rgba(15, 23, 42, 0.04))' : 'transparent',
                    outline: 'none',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: c.bg,
                      border: `1px solid ${c.text}`,
                      flexShrink: 0,
                    }}
                  />
                  {t}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Demo
// ═══════════════════════════════════════════════════════════

export function StatusLozengeDemo() {
  return (
    <div style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 32, fontFamily: "var(--cp-font-body, 'Inter', sans-serif)" }}>
      {/* Row 1: sm */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text-muted, #94A3B8)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Size: sm (compact)
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatusLozenge status="To Do" size="sm" />
          <StatusLozenge status="In Progress" size="sm" />
          <StatusLozenge status="Done" size="sm" />
        </div>
      </div>

      {/* Row 2: md */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text-muted, #94A3B8)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Size: md (prominent)
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatusLozenge status="To Do" size="md" />
          <StatusLozenge status="In Progress" size="md" />
          <StatusLozenge status="Done" size="md" />
        </div>
      </div>

      {/* Row 3: interactive */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text-muted, #94A3B8)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Interactive with Dropdown
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <StatusLozenge
            status="In Progress"
            size="md"
            withDropdown
            transitions={['To Do', 'In Review', 'Done']}
            onChange={(s) => console.log('Changed to:', s)}
          />
          <StatusLozenge
            status="Done"
            size="md"
            withDropdown
            transitions={['In Progress']}
            onChange={(s) => console.log('Changed to:', s)}
          />
        </div>
      </div>
    </div>
  );
}

export default StatusLozenge;
