/**
 * ResourceSidebar — 232px resource list with search
 */

import { useState, useMemo } from 'react';
import { useR360Resources } from '@/hooks/useR360Profile';
import type { R360ProfileResource } from '@/types/r360';

interface ResourceSidebarProps {
  selectedResourceId: string | null;
  onSelectResource: (id: string | null) => void;
}

export function ResourceSidebar({ selectedResourceId, onSelectResource }: ResourceSidebarProps) {
  const { data: resources = [] } = useR360Resources();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return resources;
    const q = search.toLowerCase();
    return resources.filter(
      (r) => r.fullName.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
    );
  }, [resources, search]);

  return (
    <div className="r3p-sidebar">
      <div className="r3p-sidebar-header">
        <div className="r3p-sidebar-label">Resources · Delivery</div>
        <input
          className="r3p-sidebar-search"
          placeholder="Search resources…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="r3p-sidebar-list">
        {filtered.map((r) => (
          <button
            key={r.id}
            className="r3p-resource-row"
            data-selected={selectedResourceId === r.id ? 'true' : undefined}
            onClick={() => onSelectResource(r.id)}
          >
            <div
              className="r3p-avatar"
              style={{
                background: `linear-gradient(135deg, ${r.avatarGradientStart}, ${r.avatarGradientEnd})`,
              }}
            >
              {r.avatarInitials}
            </div>
            <div className="r3p-resource-info">
              <div className="r3p-resource-name">{r.fullName}</div>
              <div className="r3p-resource-role">{r.role}</div>
            </div>
            <div className={`r3p-avail-dot r3p-avail-dot--${r.availability}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
