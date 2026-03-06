/**
 * WorkItemsTab — Filtered table with shadcn Select dropdowns
 */

import { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useR360WorkItems } from '@/hooks/useR360Profile';
import { StatusLozenge } from '../R360StatusLozenge';
import { WorkItemIcon } from '../R360WorkItemIcons';

interface WorkItemsTabProps {
  resourceId: string;
}

export function WorkItemsTab({ resourceId }: WorkItemsTabProps) {
  const [hubFilter, setHubFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: allItems = [] } = useR360WorkItems(resourceId, statusFilter);

  const filtered = useMemo(() => {
    let items = allItems;
    if (hubFilter !== 'all') {
      items = items.filter((i) => i.hubSource === hubFilter);
    }
    if (typeFilter !== 'all') {
      items = items.filter((i) => i.itemType === typeFilter);
    }
    return items;
  }, [allItems, hubFilter, typeFilter]);

  // Extract unique hubs and types for filters
  const hubs = useMemo(() => {
    const set = new Set(allItems.map((i) => i.hubSource));
    return Array.from(set).sort();
  }, [allItems]);

  const types = useMemo(() => {
    const set = new Set(allItems.map((i) => i.itemType));
    return Array.from(set).sort();
  }, [allItems]);

  const openCount = filtered.filter((i) => i.status !== 'DONE').length;

  return (
    <div className="r3p-section" style={{ borderBottom: 'none' }}>
      {/* Toolbar */}
      <div className="r3p-toolbar">
        <Select value={hubFilter} onValueChange={setHubFilter}>
          <SelectTrigger
            style={{
              height: 32, borderRadius: 6, fontSize: 12, fontFamily: 'var(--ff-body)',
              border: '1px solid var(--bd-default)', width: 140,
            }}
          >
            <SelectValue placeholder="All Hubs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hubs</SelectItem>
            {hubs.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            style={{
              height: 32, borderRadius: 6, fontSize: 12, fontFamily: 'var(--ff-body)',
              border: '1px solid var(--bd-default)', width: 130,
            }}
          >
            <SelectValue placeholder="Open Items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open Items</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger
            style={{
              height: 32, borderRadius: 6, fontSize: 12, fontFamily: 'var(--ff-body)',
              border: '1px solid var(--bd-default)', width: 130,
            }}
          >
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="r3p-toolbar-count">{openCount} open items</span>
      </div>

      {/* Table */}
      <div className="r3p-table-wrap">
        <table className="r3p-table">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Item</th>
              <th style={{ width: '15%' }}>Type</th>
              <th style={{ width: '20%' }}>Status</th>
              <th style={{ width: '15%' }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="r3p-item-cell">
                    <span className="r3p-tl-key">{item.itemKey}</span>
                    <span className="r3p-item-title">{item.title}</span>
                  </div>
                </td>
                <td>
                  <WorkItemIcon type={item.itemType} />
                </td>
                <td>
                  <StatusLozenge status={item.status} />
                </td>
                <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--tx-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--tx-muted)', fontSize: 12, height: 60 }}>
                  No items match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="r3p-table-footer">
          <Info size={16} style={{ color: 'var(--tx-muted)', flexShrink: 0 }} />
          <span>Items without a Jira type are classified as Tasks by default.</span>
        </div>
      </div>
    </div>
  );
}
