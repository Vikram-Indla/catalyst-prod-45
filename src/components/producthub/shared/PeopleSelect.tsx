import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, User } from 'lucide-react';

const AVATAR_COLORS = ['#2563eb', '#0d9488', '#0369a1', '#d97706', '#0891b2', '#1e40af', '#b45309', '#0f766e', '#475569', 'rgba(237,237,237,0.53)'];

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface Profile {
  value: string;
  label: string;
}

interface PeopleSelectProps {
  value: string;
  onChange: (value: string) => void;
  profiles: Profile[];
  placeholder?: string;
  disabled?: boolean;
}

export function PeopleSelect({ value, onChange, profiles, placeholder = 'Select person', disabled }: PeopleSelectProps) {
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
    if (!search) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(p => p.label.toLowerCase().includes(q));
  }, [profiles, search]);

  const selected = profiles.find(p => p.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { if (!disabled) { setOpen(!open); setSearch(''); } }}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 hover:border-zinc-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                style={{ backgroundColor: hashColor(selected.label) }}>
                {getInitials(selected.label)}
              </span>
              <span className="truncate">{selected.label}</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-zinc-400">{placeholder}</span>
            </>
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="sticky top-0 bg-white border-b border-zinc-100 px-3 py-2.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search people..."
              className="flex-1 text-sm text-zinc-900 placeholder-zinc-400 outline-none bg-transparent"
            />
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-zinc-400 text-center">No results found</div>
            )}
            {filtered.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => { onChange(p.value); setOpen(false); setSearch(''); }}
                className={`w-full px-3 py-2 flex items-center gap-2.5 text-sm transition-colors text-left ${
                  value === p.value
                    ? 'bg-blue-50 border-l-2 border-l-blue-600'
                    : 'hover:bg-zinc-50 border-l-2 border-l-transparent'
                }`}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                  style={{ backgroundColor: hashColor(p.label) }}>
                  {getInitials(p.label)}
                </span>
                <span className="flex-1 truncate text-zinc-900">{p.label}</span>
                {value === p.value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>

          {/* Clear */}
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
