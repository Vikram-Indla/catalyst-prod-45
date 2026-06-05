import React, { useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Badge from '@atlaskit/badge';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';

export interface KanbanColumn {
  key: string;
  label: string;
  color: string;
  badgeAppearance?: 'default' | 'primary' | 'added';
  emptyLabel?: string;
}

export interface KanbanColumnsProps<T> {
  items: T[];
  columns: KanbanColumn[];
  getCategory: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  groupBy?: (item: T) => string;
  groupLabel?: (key: string) => string;
  groupSort?: (a: string, b: string, countA: number, countB: number) => number;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { key: 'to_do', label: 'To do', color: token('color.text.warning', '#974F0C'), badgeAppearance: 'default', emptyLabel: 'Nothing here' },
  { key: 'in_progress', label: 'In progress', color: token('color.text.information', '#0055CC'), badgeAppearance: 'primary', emptyLabel: 'Nothing here' },
  { key: 'done', label: 'Done', color: token('color.text.success', '#216E4E'), badgeAppearance: 'added', emptyLabel: 'No completed items this period' },
];

function ColumnHeader({ col, count }: { col: KanbanColumn; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      paddingBottom: 8, marginBottom: 8,
      borderBottom: `2px solid ${col.color}`,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: col.color, flexShrink: 0,
      }} />
      <span style={{
        fontSize: 12, fontWeight: 600, letterSpacing: '0.01em',
        color: token('color.text', '#292A2E'),
      }}>
        {col.label}
      </span>
      <span style={{ marginLeft: 'auto' }}>
        <Badge appearance={col.badgeAppearance || 'default'}>{count}</Badge>
      </span>
    </div>
  );
}

function EmptyColumn({ label }: { label: string }) {
  return (
    <div style={{
      padding: '24px 16px', textAlign: 'center',
      fontSize: 12, color: token('color.text.subtlest', '#626F86'),
      border: `1px dashed ${token('color.border', '#DFE1E6')}`,
      borderRadius: 8,
    }}>
      {label}
    </div>
  );
}

function SwimlaneHeader({ label, count, collapsed, onToggle }: {
  label: string; count: number; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 4px',
        background: token('color.background.neutral.subtle', '#F7F8F9'),
        borderRadius: 4,
        cursor: 'pointer',
        marginBottom: collapsed ? 0 : 8,
        userSelect: 'none',
      }}
    >
      {collapsed
        ? <ChevronRightIcon label="" size="small" />
        : <ChevronDownIcon label="" size="small" />
      }
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: token('color.text', '#292A2E'),
      }}>
        {label}
      </span>
      <span style={{ marginLeft: 'auto' }}>
        <Badge appearance="default">{count} issues</Badge>
      </span>
    </div>
  );
}

function ColumnsGrid<T>({
  items, columns, getCategory, renderCard, getKey,
}: {
  items: T[]; columns: KanbanColumn[];
  getCategory: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, T[]> = {};
    columns.forEach(c => { map[c.key] = []; });
    items.forEach(item => {
      const cat = getCategory(item);
      const col = columns.find(c => c.key === cat) || columns[0];
      if (col) (map[col.key] ||= []).push(item);
    });
    return map;
  }, [items, columns, getCategory]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 16 }}>
      {columns.map(col => {
        const colItems = grouped[col.key] || [];
        return (
          <div key={col.key}>
            <ColumnHeader col={col} count={colItems.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {colItems.length === 0 && <EmptyColumn label={col.emptyLabel || 'Nothing here'} />}
              {colItems.map(item => (
                <React.Fragment key={getKey(item)}>{renderCard(item)}</React.Fragment>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function KanbanColumns<T>({
  items, columns = DEFAULT_COLUMNS, getCategory, renderCard, getKey,
  groupBy, groupLabel, groupSort,
}: KanbanColumnsProps<T>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  if (!groupBy) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <ColumnsGrid items={items} columns={columns} getCategory={getCategory} renderCard={renderCard} getKey={getKey} />
      </div>
    );
  }

  const groups = useMemo(() => {
    const map: Record<string, T[]> = {};
    items.forEach(item => {
      const key = groupBy(item);
      (map[key] ||= []).push(item);
    });
    const entries = Object.entries(map);
    const sorter = groupSort || ((_a, _b, countA, countB) => countB - countA);
    entries.sort(([ka, a], [kb, b]) => sorter(ka, kb, a.length, b.length));
    return entries;
  }, [items, groupBy, groupSort]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      {groups.map(([key, groupItems]) => (
        <div key={key}>
          <SwimlaneHeader
            label={groupLabel ? groupLabel(key) : key}
            count={groupItems.length}
            collapsed={!!collapsed[key]}
            onToggle={() => toggle(key)}
          />
          {!collapsed[key] && (
            <ColumnsGrid items={groupItems} columns={columns} getCategory={getCategory} renderCard={renderCard} getKey={getKey} />
          )}
        </div>
      ))}
    </div>
  );
}
