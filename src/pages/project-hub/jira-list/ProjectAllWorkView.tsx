/**
 * ProjectAllWorkView — All work tab with Table/Split modes
 * Stage C: Full pixel-perfect build
 */
import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal, ChevronDown, Globe, ChevronRight, Plus } from 'lucide-react';
import { JiraStatusLozenge } from '@/components/ui/JiraStatusLozenge';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { useProjectAllWorkItems } from '@/hooks/useProjectListItems';
import { WorkItemDetailPanel } from './components/WorkItemDetailPanel';
import type { WorkItem } from '@/types/workItem.types';

type AllWorkSubView = 'table' | 'split';

interface Props {
  projectKey: string;
}

export default function ProjectAllWorkView({ projectKey }: Props) {
  const { data: items = [], isLoading } = useProjectAllWorkItems(projectKey);
  const [subView, setSubView] = useState<AllWorkSubView>('table');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const epics = items.filter(i => i.type === 'epic');
  const childrenOf = (parentId: string) => items.filter(i => i.parentId === parentId);
  const selectedItemData = items.find(i => i.id === selectedItem);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── ALL WORK TOOLBAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px', borderBottom: 'var(--ph-divider)',
        background: 'var(--cp-bg-page)', flexShrink: 0,
      }}>
        <button style={{
          height: 32, padding: '0 10px', borderRadius: 4,
          border: '1px solid var(--cp-border-default)', background: 'var(--cp-bg-page)',
          color: 'var(--cp-text-primary)', fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.5 4.5H14l-3.5 2.5 1.5 4.5L8 10l-4 2.5 1.5-4.5L2 5.5h4.5z" fill="#7C3AED"/>
          </svg>
          Ask AI
        </button>

        <div style={{
          height: 32, minWidth: 160, border: '1px solid var(--cp-border-default)',
          borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px', background: 'var(--cp-bg-page)',
        }}>
          <Search size={13} style={{ color: 'var(--cp-text-tertiary)', flexShrink: 0 }} />
          <input placeholder="Search work"
            style={{ border: 'none', outline: 'none', fontSize: 14,
              fontFamily: 'Inter, sans-serif', color: 'var(--cp-text-primary)',
              background: 'transparent', width: '100%' }}
          />
        </div>

        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: 'var(--cp-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#fff', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
        }}>V</div>

        <button style={{
          height: 32, padding: '0 10px', borderRadius: 4,
          border: '1px solid var(--cp-border-default)', background: 'var(--cp-bg-page)',
          fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'Inter, sans-serif', color: 'var(--cp-text-primary)',
        }}>
          <Filter size={13} /> Filter
        </button>

        <button style={{
          height: 32, padding: '0 10px', borderRadius: 4,
          border: '1px solid var(--cp-border-default)', background: 'var(--cp-bg-page)',
          fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'Inter, sans-serif', color: 'var(--cp-text-primary)',
        }}>
          Group
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={{
            height: 32, padding: '0 10px', borderRadius: 4,
            border: '1px solid var(--cp-border-default)', background: 'var(--cp-bg-page)',
            fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'Inter, sans-serif', color: 'var(--cp-text-secondary)',
          }}>
            Saved filters <ChevronDown size={12} />
          </button>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--cp-border-default)', borderRadius: 4, overflow: 'hidden' }}>
            {[
              { key: 'table' as const, icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              )},
              { key: 'split' as const, icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="12" y1="3" x2="12" y2="21"/>
                </svg>
              )},
            ].map(btn => (
              <button key={btn.key} onClick={() => setSubView(btn.key)}
                style={{
                  width: 32, height: 32, border: 'none',
                  background: subView === btn.key ? 'rgba(37,99,235,0.1)' : 'var(--cp-bg-page)',
                  color: subView === btn.key ? 'var(--cp-primary)' : 'var(--cp-text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: btn.key === 'table' ? '1px solid var(--cp-border-default)' : 'none',
                }}>
                {btn.icon}
              </button>
            ))}
          </div>

          <button className="ph-icon-btn"><MoreHorizontal size={16} /></button>
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      {subView === 'table' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="ph-list-table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input type="checkbox" style={{ width: 14, height: 14 }} />
                </th>
                <th style={{ minWidth: 360 }}>WORK</th>
                <th style={{ width: 180 }}>PARENT</th>
                <th style={{ width: 150 }}>STATUS</th>
                <th style={{ width: 100 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Globe size={13} /> VERSIONS
                  </span>
                </th>
                <th style={{ width: 140 }}>ASSIGNEE</th>
                <th style={{ width: 165 }}>CREATED</th>
                <th style={{ width: 32, textAlign: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3l-5 5h10L8 3zm0 10l5-5H3l5 5z"/></svg>
                </th>
                <th style={{ width: 36 }}>
                  <button style={{ width: 22, height: 22, border: '1px dashed var(--cp-border-default)', borderRadius: 3, background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--cp-text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--cp-text-tertiary)' }}>Loading…</td></tr>
              ) : epics.map(epic => (
                <React.Fragment key={epic.id}>
                  <tr>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" style={{ width: 14, height: 14 }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => toggleExpand(epic.id)}
                          style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-text-tertiary)', borderRadius: 2, flexShrink: 0 }}
                        >
                          <ChevronRight size={14} style={{ transform: expandedRows.has(epic.id) ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                        </button>
                        <WorkItemTypeIcon type="epic" size={16} />
                        <a className="ph-iss-key" href="#"
                          onClick={e => { e.preventDefault(); setSelectedItem(epic.id); setSubView('split'); }}>
                          {epic.jiraKey}
                        </a>
                        <span style={{ fontSize: 14, color: 'var(--cp-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {epic.summary}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--cp-text-tertiary)', fontSize: 13 }}>{epic.parentKey ?? 'None'}</td>
                    <td><JiraStatusLozenge status={epic.status} interactive /></td>
                    <td style={{ color: 'var(--cp-text-tertiary)', fontSize: 13 }}>{epic.fixVersion ?? 'None'}</td>
                    <td>
                      {epic.assignee ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: epic.assignee.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {epic.assignee.initials}
                          </div>
                          <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {epic.assignee.name}
                          </span>
                        </div>
                      ) : <span style={{ color: 'var(--cp-text-tertiary)', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--cp-text-tertiary)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(epic.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td />
                    <td style={{ textAlign: 'center' }}>
                      <button className="ph-icon-btn" style={{ width: 24, height: 24 }}><MoreHorizontal size={13} /></button>
                    </td>
                  </tr>

                  {expandedRows.has(epic.id) && childrenOf(epic.id).map(child => (
                    <tr key={child.id} style={{ background: 'rgba(248,250,252,0.5)' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" style={{ width: 14, height: 14 }} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 38 }}>
                          <WorkItemTypeIcon type={child.type} size={16} />
                          <a className="ph-iss-key" href="#">{child.jiraKey}</a>
                          <span style={{ fontSize: 14, color: 'var(--cp-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {child.summary}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--cp-text-tertiary)', fontSize: 13 }}>{epic.jiraKey}</td>
                      <td><JiraStatusLozenge status={child.status} interactive /></td>
                      <td style={{ color: 'var(--cp-text-tertiary)', fontSize: 13 }}>{child.fixVersion ?? 'None'}</td>
                      <td>
                        {child.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: child.assignee.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {child.assignee.initials}
                            </div>
                            <span style={{ fontSize: 13 }}>{child.assignee.name}</span>
                          </div>
                        ) : <span style={{ color: 'var(--cp-text-tertiary)', fontSize: 13 }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--cp-text-tertiary)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(child.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td /><td />
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px', borderTop: 'var(--ph-divider)', fontSize: 13, color: 'var(--cp-text-secondary)' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--cp-text-tertiary)', fontFamily: 'Inter, sans-serif', marginRight: 'auto' }}>
              <Plus size={13} /> Create
            </button>
            <span><strong style={{ color: 'var(--cp-text-primary)' }}>{items.length}</strong> of {items.length}</span>
          </div>
        </div>
      ) : (
        /* SPLIT MODE */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: Card List */}
          <div style={{ width: 'var(--ph-card-panel-w, 288px)', flexShrink: 0, borderRight: 'var(--ph-divider)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: 'var(--ph-divider)', fontSize: 13, fontWeight: 500, color: 'var(--cp-text-primary)', flexShrink: 0 }}>
              Created <ChevronDown size={12} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {[...epics, ...items.filter(i => i.type !== 'epic')].map(item => (
                <div key={item.id}
                  onClick={() => setSelectedItem(item.id)}
                  style={{
                    padding: '10px 12px', borderBottom: 'var(--ph-divider)', cursor: 'pointer',
                    background: selectedItem === item.id ? 'rgba(37,99,235,0.06)' : 'transparent',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (selectedItem !== item.id) e.currentTarget.style.background = 'var(--cp-bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedItem === item.id ? 'rgba(37,99,235,0.06)' : 'transparent'; }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: selectedItem === item.id ? 'var(--cp-primary)' : 'var(--cp-text-primary)', marginBottom: 4, lineHeight: 1.35 }}>
                    {item.summary}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <WorkItemTypeIcon type={item.type} size={13} />
                    <span style={{ fontSize: 12, color: 'var(--cp-text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {item.jiraKey}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 12px', borderTop: 'var(--ph-divider)', fontSize: 12, color: 'var(--cp-text-tertiary)', textAlign: 'center' }}>
              {items.length} items
            </div>
          </div>

          {/* Right: Detail Panel */}
          {selectedItem && selectedItemData ? (
            <WorkItemDetailPanel
              item={selectedItemData}
              allItems={items}
              onNavigate={(id) => setSelectedItem(id)}
              onClose={() => setSelectedItem(null)}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-text-tertiary)', fontSize: 14 }}>
              Select a work item to view details
            </div>
          )}
        </div>
      )}
    </div>
  );
}
