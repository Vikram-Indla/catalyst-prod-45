import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, Building2, X } from 'lucide-react';

interface Department {
  value: string;
  label: string;
}

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  departments: Department[];
  disabled?: boolean;
}

export function DepartmentSelect({ value, onChange, departments, disabled }: DepartmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return departments;
    const q = search.toLowerCase();
    return departments.filter(d => d.label.toLowerCase().includes(q));
  }, [departments, search]);

  const selected = departments.find(d => d.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { if (!disabled) { setOpen(!open); setSearch(''); } }}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 hover:border-zinc-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className={selected ? 'truncate' : 'text-zinc-400 truncate'}>
            {selected?.label || 'Select department'}
          </span>
        </span>
        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
          {departments.length > 5 && (
            <div className="sticky top-0 bg-white border-b border-zinc-100 px-3 py-2.5 flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search departments..."
                className="flex-1 text-sm text-zinc-900 placeholder-zinc-400 outline-none bg-transparent"
              />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-zinc-400 text-center">No results found</div>
            )}
            {filtered.map(d => (
              <button
                key={d.value}
                type="button"
                onClick={() => { onChange(d.value); setOpen(false); setSearch(''); }}
                className={`w-full px-3 py-2 flex items-center justify-between text-sm transition-colors text-left ${
                  value === d.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {d.label}
                {value === d.value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>

          {value && (
            <div className="border-t border-zinc-100 px-3 py-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
