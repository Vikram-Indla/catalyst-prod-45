/**
 * WorkHubAssigneePicker — Avatar picker with search for team members
 */
import { useState, useMemo } from 'react';
import { Search, Check, UserX } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AssigneeOption { id: string; name: string; avatarUrl?: string | null; }

interface WorkHubAssigneePickerProps {
  value: string | null;
  displayName: string | null;
  options: AssigneeOption[];
  onChange: (id: string | null, name: string | null) => void;
  trigger?: React.ReactNode;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = ['#0D9488','#2563EB','#DC2626','#16A34A','#0891B2','#EA580C','#4F46E5','#059669','#B91C1C','#0E7490'];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AvatarCircle({ name, url, size = 24 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 600, color: 'var(--bg-app)', flexShrink: 0 }}>
      {getInitials(name)}
    </div>
  );
}

export default function WorkHubAssigneePicker({ value, displayName, options, onChange, trigger }: WorkHubAssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.name.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = (opt: AssigneeOption | null) => { onChange(opt?.id ?? null, opt?.name ?? null); setOpen(false); setSearch(''); };

  const defaultTrigger = (
    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, color: displayName ? 'var(--fg-1)' : 'var(--fg-4)' }}>
      {displayName ? <><AvatarCircle name={displayName} size={20} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{displayName}</span></> : '— Unassigned'}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent align="start" style={{ width: 260, maxHeight: 320, padding: 0, background: 'var(--bg-app)', border: '1px solid var(--bd-default, #2E2E2E)', borderRadius: 6, overflow: 'hidden', zIndex: 9999 }}>
        <div style={{ padding: '8px 8px 4px', borderBottom: '0.75px solid var(--bd-subtle, #292929)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', height: 32, background: 'var(--bg-1)', borderRadius: 4 }}>
            <Search size={14} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..." autoFocus
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--fg-1)', fontFamily: 'Inter, sans-serif' }} />
          </div>
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 260 }}>
          <button onClick={() => handleSelect(null)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: 'none', background: value === null ? 'rgba(37,99,235,0.08)' : 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--fg-3)', textAlign: 'left' }}>
            <UserX size={16} style={{ color: 'var(--fg-4)' }} /> <span>Unassigned</span>
            {value === null && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--cp-blue)' }} />}
          </button>
          {filtered.map(opt => (
            <button key={opt.id} onClick={() => handleSelect(opt)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: 'none', background: value === opt.id ? 'rgba(37,99,235,0.08)' : 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--fg-1)', textAlign: 'left' }}>
              <AvatarCircle name={opt.name} url={opt.avatarUrl} size={24} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.name}</span>
              {value === opt.id && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--cp-blue)' }} />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { AvatarCircle, getInitials, getAvatarColor };
