// ============================================================
// File: src/modules/priorities/pages/PriListsPage.tsx
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Tag, User, Calendar, Clock, MoreVertical,
} from 'lucide-react';
import { usePriLists, useCreatePriList } from '../hooks';
import { PriEmptyState } from '../components';
import type { PriListFull, PriTabView } from '../types';
import {
  pluralize, formatWeekRange, formatShortDate,
  getWorkstreamColor, getCompletionPercent, getProgressColor,
  filterListsByTab,
} from '../utils';
import styles from '../styles/priorities.module.css';

export function PriListsPage() {
  const navigate = useNavigate();
  const { data: lists = [], isLoading } = usePriLists();
  const createList = useCreatePriList();
  const [activeTab, setActiveTab] = useState<PriTabView>('this_week');
  const [search, setSearch] = useState('');

  const filteredLists = filterListsByTab(lists, activeTab).filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  const completedCount = lists.filter(
    (l) => l.status === 'active' && !l.current_week_id
  ).length;
  const archivedCount = lists.filter((l) => l.status === 'archived').length;

  const handleCreateList = () => {
    createList.mutate(
      { title: 'New Priority List' },
      { onSuccess: (data) => navigate(`/priorities/${data.id}`) }
    );
  };

  if (isLoading) {
    return (
      <div className={styles['pri-root']}>
        <div className={styles['pri-loading']}>
          <span className={styles['pri-spinner']} />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className={styles['pri-root']}>
      <div className={styles['pri-shell']}>
        {/* Header */}
        <header className={styles['pri-header']}>
          <div className={styles['pri-header-left']}>
            <span className={styles['pri-header-10']}>10</span>
            <div>
              <h1 className={styles['pri-header-title']}>Priorities</h1>
              <p className={styles['pri-header-subtitle']}>
                Priority Management
              </p>
            </div>
          </div>
          <div className={styles['pri-header-actions']}>
            <button
              className={`${styles['pri-btn']} ${styles['pri-btn-primary']}`}
              onClick={handleCreateList}
            >
              <Plus size={15} />
              New List
            </button>
          </div>
        </header>

        <main className={styles['pri-main']}>
          {/* Toolbar */}
          <div className={styles['pri-toolbar']}>
            <div className={styles['pri-search']}>
              <Search size={16} className={styles['pri-search-icon']} />
              <input
                className={styles['pri-search-input']}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lists, task number, or keyword..."
              />
            </div>
            <div className={styles['pri-filters']}>
              <button className={styles['pri-filter-chip']}><Tag size={14} /> Label</button>
              <button className={styles['pri-filter-chip']}><User size={14} /> Assigned To</button>
              <button className={styles['pri-filter-chip']}><Calendar size={14} /> Date Range</button>
              <button className={styles['pri-filter-chip']}><Clock size={14} /> Status</button>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles['pri-tabs']}>
            <button
              className={`${styles['pri-tab']} ${activeTab === 'this_week' ? styles['pri-tab-active'] : ''}`}
              onClick={() => setActiveTab('this_week')}
            >
              This Week
              <span className={`${styles['pri-tab-count']} ${
                filteredLists.length > 0 ? styles['pri-tab-count-active'] : styles['pri-tab-count-zero']
              }`}>
                {activeTab === 'this_week' ? filteredLists.length : lists.filter(l => l.status === 'active' && l.current_week_id).length}
              </span>
            </button>
            <button
              className={`${styles['pri-tab']} ${activeTab === 'completed' ? styles['pri-tab-active'] : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed
              <span className={`${styles['pri-tab-count']} ${
                completedCount > 0 ? '' : styles['pri-tab-count-zero']
              }`}>
                {completedCount}
              </span>
            </button>
            <button
              className={`${styles['pri-tab']} ${activeTab === 'archived' ? styles['pri-tab-active'] : ''}`}
              onClick={() => setActiveTab('archived')}
            >
              Archived
              <span className={`${styles['pri-tab-count']} ${
                archivedCount > 0 ? '' : styles['pri-tab-count-zero']
              }`}>
                {archivedCount}
              </span>
            </button>
          </div>

          {/* Section header */}
          <div className={styles['pri-section-header']}>
            <span className={styles['pri-section-label']}>Priority Lists</span>
            <span className={styles['pri-section-count']}>
              {pluralize(filteredLists.length, 'list')}
            </span>
          </div>

          {/* List cards */}
          {filteredLists.map((list, index) => (
            <ListCard
              key={list.id}
              list={list}
              index={index}
              onClick={() => navigate(`/priorities/${list.id}`)}
            />
          ))}

          {/* Empty states */}
          {filteredLists.length === 0 && (
            <PriEmptyState type="lists" onAction={handleCreateList} />
          )}
        </main>
      </div>
    </div>
  );
}

// ---- Internal ListCard sub-component ----

function ListCard({
  list, index, onClick,
}: {
  list: PriListFull;
  index: number;
  onClick: () => void;
}) {
  const percent = getCompletionPercent(
    list.completed_item_count,
    list.active_item_count
  );
  const progressColor = getProgressColor(percent);
  const wsColor = getWorkstreamColor(list.workstream);
  const hasItems = list.active_item_count > 0;

  return (
    <div className={styles['pri-list-card']} onClick={onClick}>
      {/* Workstream indicator */}
      <div className={styles['pri-ws-indicator']} style={{ background: wsColor }} />

      {/* ID */}
      <span className={styles['pri-list-id']}>
        T10-{String(index + 1).padStart(3, '0')}
      </span>

      {/* Body */}
      <div className={styles['pri-list-body']}>
        <div className={styles['pri-list-title']}>{list.title}</div>
        <div className={styles['pri-list-meta']}>
          {list.current_week_start && list.current_week_end && (
            <>
              <span className={styles['pri-list-meta-item']}>
                <Calendar size={13} />
                <span className={styles['pri-list-meta-date']}>
                  {formatWeekRange(list.current_week_start, list.current_week_end)}
                </span>
              </span>
              <span className={styles['pri-list-meta-sep']} />
            </>
          )}
          <span className={styles['pri-list-meta-item']}>
            Created {formatShortDate(list.created_at)}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className={styles['pri-list-right']}>
        <div className={styles['pri-list-progress']}>
          <span className={styles['pri-list-progress-text']}>
            <strong>{list.active_item_count}</strong> / 10 priorities
          </span>
          {hasItems && (
            <div className={styles['pri-progress-bar']}>
              <div
                className={`${styles['pri-progress-fill']} ${styles[`pri-progress-${progressColor}`]}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>

        <span className={`${styles['pri-status-badge']} ${styles[`pri-status-${list.status}`]}`}>
          {list.status === 'active' ? 'Active' : 'Archived'}
        </span>

        <button
          className={styles['pri-kebab']}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
}
