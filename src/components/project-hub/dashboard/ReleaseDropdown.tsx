/**
 * ReleaseDropdown — Radix Popover with checkboxes for release selection
 */
import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Tag, ExternalLink } from 'lucide-react';
import { useDashboardStore } from './useDashboardStore';
import { useReleases } from '@/hooks/useProjectDashboard';
import { format } from 'date-fns';

export default function ReleaseDropdown({ projectId }: { projectId: string | null }) {
  const [open, setOpen] = useState(false);
  const { selectedReleaseIds, setSelectedReleaseIds } = useDashboardStore();
  const { data: releases } = useReleases(projectId);

  // Auto-select all active on first load
  useEffect(() => {
    if (releases?.length && selectedReleaseIds.length === 0) {
      setSelectedReleaseIds(releases.map((r: any) => r.id));
    }
  }, [releases]);

  const toggle = (id: string) => {
    setSelectedReleaseIds(
      selectedReleaseIds.includes(id)
        ? selectedReleaseIds.filter(x => x !== id)
        : [...selectedReleaseIds, id]
    );
  };

  const activeCount = selectedReleaseIds.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="bg-[var(--cp-float)] dark:bg-[#1A1A1A]"
          style={{
            height: 34, padding: '0 14px', borderRadius: 8,
            border: '1px solid var(--divider)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--fg-2)',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'border-color 150ms, box-shadow 150ms',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--cp-primary-30)'; (e.target as HTMLElement).style.boxShadow = '0 1px 4px rgba(37,99,235,.1)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--divider)'; (e.target as HTMLElement).style.boxShadow = 'none'; }}
        >
          <Tag size={13} color="var(--sem-success)" />
          {activeCount === (releases?.length ?? 0) ? `All Active Releases (${activeCount})` : `${activeCount} Release${activeCount !== 1 ? 's' : ''}`}
          <ChevronDown size={14} color="var(--fg-3)" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="bg-[var(--cp-float)] dark:bg-[#1A1A1A]" style={{ width: 340, padding: 0, borderRadius: 12, border: '1px solid var(--divider)', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
        <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid var(--cp-bd-zone)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-1)' }}>Select Releases</div>
        </div>
        <div style={{ padding: '6px 8px', maxHeight: 240, overflowY: 'auto' }}>
          {(releases ?? []).map((r: any) => {
            const checked = selectedReleaseIds.includes(r.id);
            const rKey = r.name || r.title || r.id?.slice(0, 8);
            return (
              <label
                key={r.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px',
                  borderRadius: 6, cursor: 'pointer', transition: 'background 50ms',
                }}
                className="hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(r.id)}
                  style={{ accentColor: 'var(--cp-blue)', width: 14, height: 14 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--fg-1)' }}>
                      {rKey}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
                    {r.status} · {r.target_date ? format(new Date(r.target_date), 'MMM d, yyyy') : 'No date'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--cp-bd-zone)' }}>
          <button
            onClick={() => setOpen(false)}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--cp-blue)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Open ReleaseHub <ExternalLink size={10} />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
