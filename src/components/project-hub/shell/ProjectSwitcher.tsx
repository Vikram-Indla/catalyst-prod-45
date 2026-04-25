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
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
      className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#1A1A1A] border border-[#E2E8F0] dark:border-[#2E2E2E]"
      style={{
        width: 280,
        borderRadius: 8,
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.60)' : '0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.05)',
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E2E8F0] dark:border-[#2E2E2E]">
        <Search size={13} className="flex-shrink-0 text-[#94A3B8] dark:text-[#7D7D7D]" />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="flex-1 bg-transparent outline-none border-none text-[#0F172A] dark:text-[#EDEDED]"
          style={{ fontSize: 12 }}
        />
      </div>

      <div className="max-h-[320px] overflow-y-auto py-1">
        {pinned.length > 0 && (
          <>
            <div className="px-3 pt-2 pb-1 text-[var(--fg-3)] dark:text-[#878787]" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <Star size={10} className="inline mr-1" /> Pinned
            </div>
            {pinned.map(p => (
              <ProjectRow key={p.key} project={p} isCurrent={p.key === currentKey} onSelect={onSelect} isDark={isDark} />
            ))}
          </>
        )}

        <div className="px-3 pt-2 pb-1 text-[var(--fg-3)] dark:text-[#878787]" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {pinned.length > 0 ? 'Recent' : 'All Projects'}
        </div>
        {recent.length === 0 ? (
          <div className="px-3 py-3 text-center text-[var(--fg-4)] dark:text-[#7D7D7D]" style={{ fontSize: 12 }}>
            No projects found
          </div>
        ) : (
          recent.map(p => (
            <ProjectRow key={p.key} project={p} isCurrent={p.key === currentKey} onSelect={onSelect} isDark={isDark} />
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
  isDark,
}: {
  project: ProjectEntry;
  isCurrent: boolean;
  onSelect: (key: string) => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(project.key)}
      className={`flex items-center gap-2.5 w-full px-3 py-1.5 transition-colors ${
        isCurrent
          ? 'bg-[var(--cp-blue-wash)] dark:bg-[rgba(59,130,246,0.10)]'
          : 'hover:bg-[var(--cp-blue-wash)] dark:hover:bg-[#1F1F1F]'
      }`}
      style={{
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <div
        className="flex items-center justify-center rounded flex-shrink-0"
        style={{ width: 24, height: 24, backgroundColor: project.color, color: '#FFFFFF', fontSize: 10, fontWeight: 700, borderRadius: 4 }}
      >
        {project.key}
      </div>
      <div className="flex flex-col items-start min-w-0">
        <span className="truncate w-full text-[var(--fg-1)] dark:text-[#EDEDED]" style={{ fontSize: 12, fontWeight: 500 }}>
          {project.name}
        </span>
        <span className="text-[var(--fg-4)] dark:text-[#7D7D7D]" style={{ fontSize: 10 }}>{project.key}</span>
      </div>
    </button>
  );
}