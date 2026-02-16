import { Search, X, Download, LayoutGrid, Clock, Table2 } from 'lucide-react';
import type { ViewMode, ReleaseStatusV2 } from '@/hooks/releases/useReleasesV2';
import type { ReleaseV2 } from '@/hooks/releases/useReleasesV2';
import { exportReleasesToCSV } from '@/lib/releases/export-utils';
import styles from '@/styles/release-hub.module.css';

const STATUS_OPTIONS: { value: ReleaseStatusV2; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'development', label: 'Dev' },
  { value: 'staging', label: 'Staging' },
  { value: 'testing', label: 'Testing' },
  { value: 'uat', label: 'UAT' },
  { value: 'released', label: 'Released' },
];

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: ReleaseStatusV2[];
  onToggleStatus: (s: ReleaseStatusV2) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  releases: ReleaseV2[];
}

export function ReleaseToolbar({ search, onSearchChange, statusFilter, onToggleStatus, view, onViewChange, releases }: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            id="rh-search"
            className={styles.searchInput}
            placeholder="Search releases... ⌘K"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            aria-label="Search releases"
          />
          {search && (
            <button className={styles.searchClear} onClick={() => onSearchChange('')}>
              <X size={14} />
            </button>
          )}
        </div>
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            className={`${styles.filterChip} ${statusFilter.includes(s.value) ? styles.filterChipActive : ''}`}
            onClick={() => onToggleStatus(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className={styles.toolbarRight}>
        <button className={styles.btnOutline} onClick={() => exportReleasesToCSV(releases)}>
          <Download size={14} /> Export
        </button>
        <div className={styles.viewSwitcher} role="tablist" aria-label="View mode">
          {([
            { key: 'cards' as ViewMode, icon: <LayoutGrid size={14} />, label: 'Cards' },
            { key: 'timeline' as ViewMode, icon: <Clock size={14} />, label: 'Timeline' },
            { key: 'table' as ViewMode, icon: <Table2 size={14} />, label: 'Table' },
          ]).map(v => (
            <button
              key={v.key}
              className={`${styles.viewSwitcherBtn} ${view === v.key ? styles.viewSwitcherBtnActive : ''}`}
              onClick={() => onViewChange(v.key)}
              role="tab"
              aria-selected={view === v.key}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
