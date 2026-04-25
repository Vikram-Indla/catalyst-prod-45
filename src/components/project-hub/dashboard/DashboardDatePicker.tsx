/**
 * DashboardDatePicker — Layer 1 page-level date filter for the project
 * dashboard. Single button + popup with Quarters / Rolling / All / Custom.
 *
 * Updates DashboardFilterContext on selection — every gadget hook that
 * reads useDashboardFilter() refetches automatically because their
 * queryKeys include filter.dateFrom and filter.dateTo.
 *
 * Saudi week convention: Sunday is the first day of the week in the
 * inline custom-range calendar (FP-001).
 */
import { useMemo, useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  buildPreset,
  useDashboardFilter,
  type DashboardPreset,
} from '@/contexts/DashboardFilterContext';
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

const QUARTERS: { key: DashboardPreset; label: string; sub: string }[] = [
  { key: 'Q1', label: 'Q1 2026', sub: 'Jan – Mar' },
  { key: 'Q2', label: 'Q2 2026', sub: 'Apr – Jun' },
  { key: 'Q3', label: 'Q3 2026', sub: 'Jul – Sep' },
  { key: 'Q4', label: 'Q4 2026', sub: 'Oct – Dec' },
];

const ROLLING: { key: DashboardPreset; label: string }[] = [
  { key: 'last30', label: 'Last 30 days' },
  { key: 'last90', label: 'Last 90 days' },
  { key: 'last12m', label: 'Last 12 months' },
];

export default function DashboardDatePicker() {
  const { filter, setFilter } = useDashboardFilter();
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(filter.preset === 'custom');

  const triggerStyle = useMemo(
    () => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 32,
      padding: '0 10px',
      border: open ? '2px solid #4C9AFF' : '1px solid #DFE1E6',
      boxShadow: open ? '0 0 0 2px rgba(76,154,255,.3)' : 'none',
      borderRadius: 4,
      background: '#FAFBFC',
      fontSize: 13,
      fontWeight: 500,
      color: open ? '#0052CC' : '#172B4D',
      cursor: 'pointer',
    }) as React.CSSProperties,
    [open],
  );

  const selectPreset = (key: DashboardPreset) => {
    if (key === 'custom') {
      setShowCustom(true);
      return;
    }
    setFilter(buildPreset(key));
    setOpen(false);
    setShowCustom(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" style={triggerStyle} data-testid="dashboard-date-picker">
          <Calendar size={14} />
          <span>{filter.label}</span>
          <ChevronDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="p-0"
        style={{
          width: 280,
          background: '#FFFFFF',
          border: '1px solid #DFE1E6',
          borderRadius: 4,
          boxShadow: '0 8px 24px rgba(9,30,66,.18)',
          padding: 0,
        }}
      >
        <DateMenu
          activePreset={filter.preset}
          onSelect={selectPreset}
          showCustom={showCustom}
          onCustomCancel={() => {
            setShowCustom(false);
          }}
          onCustomApply={(from, to) => {
            const f = format(from, 'yyyy-MM-dd');
            const t = format(to, 'yyyy-MM-dd');
            const label = `${format(from, 'd MMM')} – ${format(to, 'd MMM yyyy')}`;
            setFilter({
              quarter: '',
              dateFrom: f,
              dateTo: t,
              preset: 'custom',
              label,
            });
            setShowCustom(false);
            setOpen(false);
          }}
          initialFrom={filter.dateFrom ? parseISO(filter.dateFrom) : new Date()}
          initialTo={filter.dateTo ? parseISO(filter.dateTo) : new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface DateMenuProps {
  activePreset: DashboardPreset;
  onSelect: (k: DashboardPreset) => void;
  showCustom: boolean;
  onCustomCancel: () => void;
  onCustomApply: (from: Date, to: Date) => void;
  initialFrom: Date;
  initialTo: Date;
}

function DateMenu({
  activePreset,
  onSelect,
  showCustom,
  onCustomCancel,
  onCustomApply,
  initialFrom,
  initialTo,
}: DateMenuProps) {
  return (
    <div>
      <Section label="Quarters — 2026">
        {QUARTERS.map((q) => (
          <Row
            key={q.key}
            active={activePreset === q.key}
            onClick={() => onSelect(q.key)}
            label={q.label}
            sub={q.sub}
          />
        ))}
      </Section>
      <Section label="Rolling">
        {ROLLING.map((r) => (
          <Row
            key={r.key}
            active={activePreset === r.key}
            onClick={() => onSelect(r.key)}
            label={r.label}
          />
        ))}
      </Section>
      <Section>
        <Row
          active={activePreset === 'all'}
          onClick={() => onSelect('all')}
          label="All active"
          sub="No date filter"
        />
        <Row
          active={activePreset === 'custom' || showCustom}
          onClick={() => onSelect('custom')}
          label="Custom range"
        />
      </Section>
      {showCustom && (
        <CustomRangePanel
          initialFrom={initialFrom}
          initialTo={initialTo}
          onCancel={onCustomCancel}
          onApply={onCustomApply}
        />
      )}
    </div>
  );
}

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid #F1F2F4' }}>
      {label && (
        <div
          style={{
            padding: '10px 12px 4px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#7A869A',
          }}
        >
          {label}
        </div>
      )}
      <div style={{ padding: '4px 0 6px' }}>{children}</div>
    </div>
  );
}

function Row({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 12px',
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        fontSize: 13,
        color: active ? '#0052CC' : '#172B4D',
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F5F7')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ width: 14, display: 'inline-flex' }}>
        {active && <Check size={14} color="#0052CC" />}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: 11, color: '#7A869A' }}>{sub}</span>}
    </button>
  );
}

// ─── Custom range panel with inline calendar ──────────────────────────────────

function CustomRangePanel({
  initialFrom,
  initialTo,
  onCancel,
  onApply,
}: {
  initialFrom: Date;
  initialTo: Date;
  onCancel: () => void;
  onApply: (from: Date, to: Date) => void;
}) {
  const [from, setFrom] = useState<Date>(initialFrom);
  const [to, setTo] = useState<Date>(isAfter(initialTo, initialFrom) ? initialTo : initialFrom);
  const [pickStart, setPickStart] = useState(true);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(initialFrom));

  const onDayClick = (d: Date) => {
    if (pickStart) {
      setFrom(d);
      if (isAfter(d, to)) setTo(d);
      setPickStart(false);
    } else {
      if (isAfter(from, d)) {
        setFrom(d);
        setTo(from);
      } else {
        setTo(d);
      }
      setPickStart(true);
    }
  };

  const days = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1,
  );

  return (
    <div style={{ padding: 12, borderTop: '1px solid #F1F2F4' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#172B4D' }}>
        <DateInput label="From" value={from} onChange={setFrom} />
        <span style={{ color: '#7A869A' }}>→</span>
        <DateInput label="To" value={to} onChange={setTo} />
      </div>

      <div style={{ marginTop: 12 }}>
        <MonthHeader
          month={viewMonth}
          onPrev={() => setViewMonth(addMonths(viewMonth, -1))}
          onNext={() => setViewMonth(addMonths(viewMonth, 1))}
        />
        <MonthGrid month={viewMonth} from={from} to={to} onDayClick={onDayClick} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingTop: 8,
          borderTop: '1px solid #F1F2F4',
        }}
      >
        <span style={{ fontSize: 11, color: '#7A869A' }}>{days} days selected</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 28,
              padding: '0 10px',
              border: '1px solid #DFE1E6',
              borderRadius: 3,
              background: '#FFFFFF',
              fontSize: 12,
              cursor: 'pointer',
              color: '#42526E',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(from, to)}
            style={{
              height: 28,
              padding: '0 12px',
              border: 0,
              borderRadius: 3,
              background: '#0052CC',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <span style={{ fontSize: 10, color: '#7A869A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <input
        type="date"
        value={format(value, 'yyyy-MM-dd')}
        onChange={(e) => {
          const v = e.currentTarget.value;
          if (v) onChange(parseISO(v));
        }}
        style={{
          height: 28,
          padding: '0 6px',
          border: '1px solid #DFE1E6',
          borderRadius: 3,
          fontSize: 12,
          background: '#FAFBFC',
          color: '#172B4D',
        }}
      />
    </label>
  );
}

function MonthHeader({
  month,
  onPrev,
  onNext,
}: {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0 6px',
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#42526E', padding: 4 }}
        aria-label="Previous month"
      >
        ‹
      </button>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#172B4D' }}>{format(month, 'MMMM yyyy')}</span>
      <button
        type="button"
        onClick={onNext}
        style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#42526E', padding: 4 }}
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}

function MonthGrid({
  month,
  from,
  to,
  onDayClick,
}: {
  month: Date;
  from: Date;
  to: Date;
  onDayClick: (d: Date) => void;
}) {
  // Saudi convention: weekStartsOn = 0 (Sunday)
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const monthIdx = month.getMonth();
  const today = new Date();
  const lastOfMonth = endOfMonth(month);

  // Trim trailing weeks that contain only next-month days, but only if we
  // already covered the full current month.
  const usefulRows = (() => {
    for (let r = 5; r >= 4; r--) {
      const rowStart = cells[r * 7];
      if (rowStart && rowStart.getTime() <= lastOfMonth.getTime()) return r + 1;
    }
    return 4;
  })();
  const visible = cells.slice(0, usefulRows * 7);

  const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          marginBottom: 4,
        }}
      >
        {dayHeaders.map((d) => (
          <div
            key={d}
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#7A869A',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {visible.map((d, i) => {
          const isOtherMonth = d.getMonth() !== monthIdx;
          const isStart = isSameDay(d, from);
          const isEnd = isSameDay(d, to);
          const inRange = d.getTime() > from.getTime() && d.getTime() < to.getTime();
          const isToday = isSameDay(d, today);

          let bg = 'transparent';
          let color = isOtherMonth ? '#C1C7D0' : '#172B4D';
          let radius = '3px';
          if (isStart || isEnd) {
            bg = '#0052CC';
            color = '#FFFFFF';
            if (isStart && !isEnd) radius = '3px 0 0 3px';
            if (isEnd && !isStart) radius = '0 3px 3px 0';
          } else if (inRange) {
            bg = '#DEEBFF';
            color = '#0052CC';
            radius = '0';
          }
          if (isToday && !isStart && !isEnd) {
            color = '#0052CC';
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(d)}
              style={{
                height: 28,
                background: bg,
                color,
                border: 0,
                borderRadius: radius,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isToday || isStart || isEnd ? 700 : 400,
                padding: 0,
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
