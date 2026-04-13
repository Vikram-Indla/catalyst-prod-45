/**
 * IssueListPanel — Flat left panel with tight row density
 * Blue selected rail · status lozenge right · key + summary + assignee
 */
import { useState, useCallback, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { AllWorkItem } from '@/types/allwork.types';

interface Props {
  projectKey: string;
  selectedIssueKey: string | null;
  onSelectIssue: (key: string) => void;
  onSearch: (query: string) => void;
  items?: AllWorkItem[];
  loading?: boolean;
}

export function IssueListPanel({
  projectKey, selectedIssueKey, onSelectIssue, onSearch,
  items = [], loading = false,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(value), 300);
  }, [onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!items.length) return;
    const idx = items.findIndex(i => i.issue_key === selectedIssueKey);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < items.length - 1) onSelectIssue(items[idx + 1].issue_key); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) onSelectIssue(items[idx - 1].issue_key); }
  }, [items, selectedIssueKey, onSelectIssue]);

  return (
    <>
      {/* ── Sticky header ── */}
      <div className="awHeader">
        <div className="awLeftTop">
          <div className="awLeftTitle">
            <strong>{projectKey}</strong>
            <span>All work</span>
          </div>
          <button className="awChip" style={{ height: 24 }}>
            <ChevronDown style={{ width: 12, height: 12 }} />
          </button>
        </div>

        <div className="awSearchWrap">
          <input
            className="awSearch"
            placeholder="Search issues (key, summary, text)..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="awFilters">
          {['Type', 'Status', 'Assignee', 'Priority'].map(f => (
            <button key={f} className="awChip" type="button">
              {f} <ChevronDown style={{ width: 10, height: 10 }} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable list ── */}
      <div className="awBody" onKeyDown={handleKeyDown} tabIndex={0}>
        {loading && !items.length ? (
          <div className="awList">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="awRow" style={{ opacity: 0.4 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: '#E2E8F0' }} />
                <div className="awRowMain">
                  <div style={{ width: 60, height: 12, borderRadius: 3, background: '#E2E8F0', marginBottom: 6 }} />
                  <div style={{ width: '80%', height: 12, borderRadius: 3, background: '#E2E8F0' }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="awEmpty" style={{ padding: '40px 16px' }}>
            No issues found
            {searchQuery && (
              <button onClick={() => handleSearchChange('')} className="awLinkCta" style={{ marginTop: 8 }}>
                Reset search
              </button>
            )}
          </div>
        ) : (
          <div className="awList" role="listbox" aria-label="Issues">
            {items.map((item) => {
              const isSelected = item.issue_key === selectedIssueKey;
              return (
                <div
                  key={item.issue_key}
                  role="option"
                  aria-selected={isSelected}
                  className={`awRow ${isSelected ? 'awRowSelected' : ''}`}
                  onClick={() => onSelectIssue(item.issue_key)}
                >
                  <JiraIssueTypeIcon type={item.issue_type} size={16} />
                  <div className="awRowMain">
                    <div className="awRowTop">
                      <span className="awKey">{item.issue_key}</span>
                      <StatusLozenge status={item.status} />
                    </div>
                    <div className="awSummary">{item.summary}</div>
                    {item.assignee_display_name && (
                      <div className="awMeta">{item.assignee_display_name}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--aw-text-subtle)', textAlign: 'center' }}>
          {items.length} issue{items.length !== 1 ? 's' : ''}
        </div>
      </div>
    </>
  );
}
