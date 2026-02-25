/**
 * R360 Resources Listing Page
 * Route: /project-hub/resources-v2
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useR360Resources } from '@/hooks/useR360';
import { R360_DEPT_COLORS } from '@/constants/r360';
import { initials, slugify } from '@/utils/r360Utils';
import '@/styles/r360.css';

export default function R360ResourcesListing() {
  const navigate = useNavigate();
  const { data: resources = [], isLoading, error, refetch } = useR360Resources();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string | null>(null);

  const deptCounts = useMemo(() => {
    const map: Record<string, number> = {};
    resources.forEach((r: any) => { map[r.department] = (map[r.department] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [resources]);

  const filtered = useMemo(() => {
    let list = resources;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((r: any) => r.name.toLowerCase().includes(s) || r.role_name.toLowerCase().includes(s));
    }
    if (deptFilter) list = list.filter((r: any) => r.department === deptFilter);
    return list;
  }, [resources, search, deptFilter]);

  if (error) return <div id="r360-root"><div className="r3-page"><div className="r3-empty">Failed to load resources. <span className="r3-retry" onClick={() => refetch()}>Retry</span></div></div></div>;

  return (
    <div id="r360-root">
      <div className="r3-page">
        <div className="r3-header">
          <h1 className="r3-title">Resources</h1>
          <span className="r3-count">{resources.length} resources</span>
        </div>

        <div className="r3-toolbar">
          <input
            className="r3-search"
            placeholder="Search by name, role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className={`r3-chip ${!deptFilter ? 'r3-chip--active' : ''}`} onClick={() => setDeptFilter(null)}>
            All ({resources.length})
          </button>
          {deptCounts.map(([dept, count]) => (
            <button
              key={dept}
              className={`r3-chip ${deptFilter === dept ? 'r3-chip--active' : ''}`}
              onClick={() => setDeptFilter(deptFilter === dept ? null : dept)}
            >
              {dept} ({count})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="r3-skeleton" style={{ height: 52, width: '100%' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="r3-empty">No resources found.</div>
        ) : (
          <table className="r3-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Department</th>
                <th>Job Role</th>
                <th>Type</th>
                <th>Vendor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => {
                const deptColor = R360_DEPT_COLORS[r.department] || '#64748B';
                return (
                  <tr key={r.id} onClick={() => navigate(`/project-hub/resources-v2/${r.id}`)}>
                    <td>
                      <div className="r3-res-cell">
                        <div className="r3-avatar" style={{ background: deptColor }}>
                          <img
                            src={`/admin/users/${slugify(r.name)}/avatar`}
                            alt=""
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <span style={{ position: 'absolute' }}>{initials(r.name)}</span>
                        </div>
                        <div>
                          <div className="r3-res-name">{r.name}</div>
                          <div className="r3-res-rid">RID: {r.rid}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="r3-dept" style={{ background: `${deptColor}11`, color: deptColor }}>
                        <span className="r3-dept-dot" style={{ background: deptColor }} />
                        {r.department}
                      </span>
                    </td>
                    <td>{r.role_name}</td>
                    <td>{r.resource_type || '—'}</td>
                    <td>{r.vendor || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
