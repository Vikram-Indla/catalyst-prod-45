/**
 * WorkHubColumnFilter — Per-column filter dropdown with checkbox list
 */
import { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface WorkHubColumnFilterProps {
  values: string[];
  selected: string[];
  onApply: (selected: string[]) => void;
  trigger: React.ReactNode;
}

export default function WorkHubColumnFilter({ values, selected, onApply, trigger }: WorkHubColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selected));

  const filtered = useMemo(() => {
    if (!search) return values;
    const q = search.toLowerCase();
    return values.filter(v => v.toLowerCase().includes(q));
  }, [values, search]);

  const toggleValue = (v: string) => { const n = new Set(localSelected); if (n.has(v)) n.delete(v); else n.add(v); setLocalSelected(n); };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setLocalSelected(new Set(selected)); }}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" style={{ width: 240, maxHeight: 320, padding: 0, background: 'var(--bg-app)', border: '1px solid var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 6, overflow: 'hidden', zIndex: 9999 }}>
        <div style={{ padding: 8, borderBottom: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', height: 30, background: 'var(--bg-1)', borderRadius: 4 }}>
            <Search size={13} style={{ color: 'var(--fg-4)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter..." autoFocus
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--fg-1)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))' }}>
          <button onClick={() => setLocalSelected(new Set(values))} style={{ fontSize: 11, color: 'var(--cp-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>Select All</button>
          <button onClick={() => setLocalSelected(new Set())} style={{ fontSize: 11, color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear All</button>
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 200, padding: '4px 0' }}>
          {filtered.map(v => (
            <button key={v} onClick={() => toggleValue(v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--fg-1)', textAlign: 'left' }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: localSelected.has(v) ? 'none' : '1.5px solid var(--bd-default, rgba(255,255,255,0.08))', background: localSelected.has(v) ? 'var(--cp-blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {localSelected.has(v) && <Check size={11} color="white" strokeWidth={3} />}
              </div>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: 8, borderTop: '0.75px solid var(--bd-subtle, rgba(255,255,255,0.05))', justifyContent: 'flex-end' }}>
          <button onClick={() => { setLocalSelected(new Set()); onApply([]); setOpen(false); }} style={{ padding: '4px 12px', fontSize: 12, color: 'var(--fg-3)', background: 'none', border: '1px solid var(--bd-default, rgba(255,255,255,0.08))', borderRadius: 4, cursor: 'pointer' }}>Reset</button>
          <button onClick={() => { onApply(Array.from(localSelected)); setOpen(false); }} style={{ padding: '4px 12px', fontSize: 12, color: 'var(--bg-app)', background: 'var(--cp-blue)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Apply</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
