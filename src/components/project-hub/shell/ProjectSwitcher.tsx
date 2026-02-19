import { useEffect, useRef, useState } from 'react';
import { Search, Star } from 'lucide-react';

export interface ProjectEntry {
  key: string;
  name: string;
  color: string;
  icon: string;
  isPinned?: boolean;
}

interface ProjectSwitcherProps {
  projects: ProjectEntry[];
  currentKey?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
}

export function ProjectSwitcher({ projects, currentKey, isOpen, onClose, onSelect }: ProjectSwitcherProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const clickHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handler);
    document.addEventListener('mousedown', clickHandler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('mousedown', clickHandler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.key.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter(p => p.isPinned);
  const recent = filtered.filter(p => !p.isPinned).slice(0, 5);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50"
      style={{
        width: 280,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.05)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Search */}
      <div className="p-2 border-b" style={{ borderColor: '#E2E8F0' }}>
        <div
          className="flex items-center gap-2 rounded-md px-2"
          style={{ height: 30, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}
        >
          <Search size={13} color="#94A3B8" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 12, color: '#0F172A' }}
          />
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto py-1">
        {/* Pinned */}
        {pinned.length > 0 && (
          <>
            <div
              className="px-3 pt-2 pb-1"
              style={{ fontSize: 10, fontWeight: 600, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}
            >
              <Star size={10} className="inline mr-1" /> Pinned
            </div>
            {pinned.map(p => (
              <ProjectRow key={p.key} project={p} isCurrent={p.key === currentKey} onSelect={onSelect} />
            ))}
          </>
        )}

        {/* Recent / All */}
        <div
          className="px-3 pt-2 pb-1"
          style={{ fontSize: 10, fontWeight: 600, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}
        >
          {pinned.length > 0 ? 'Recent' : 'All Projects'}
        </div>
        {recent.length === 0 ? (
          <div className="px-3 py-3 text-center" style={{ fontSize: 12, color: '#94A3B8' }}>
            No projects found
          </div>
        ) : (
          recent.map(p => (
            <ProjectRow key={p.key} project={p} isCurrent={p.key === currentKey} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  isCurrent,
  onSelect,
}: {
  project: ProjectEntry;
  isCurrent: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(project.key)}
      className="flex items-center gap-2.5 w-full px-3 py-1.5 transition-colors hover:bg-[#EFF6FF]"
      style={{
        background: isCurrent ? '#EFF6FF' : undefined,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        className="flex items-center justify-center rounded flex-shrink-0"
        style={{
          width: 24,
          height: 24,
          background: project.color,
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 4,
        }}
      >
        {project.key.slice(0, 2)}
      </div>
      <div className="flex flex-col items-start min-w-0">
        <span style={{ fontSize: 12, fontWeight: 500, color: '#0F172A' }} className="truncate w-full">
          {project.name}
        </span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>{project.key}</span>
      </div>
    </button>
  );
}
