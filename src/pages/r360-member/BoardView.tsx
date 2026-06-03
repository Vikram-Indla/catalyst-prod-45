/**
 * R360 Board View — ADS-compliant rewrite
 * Cards use @atlaskit/tokens exclusively. No custom --cp-* tokens.
 * Age displayed as subtle meta text, not large colored numbers.
 * Priority uses text label (no colored dots).
 * Status uses StatusLozenge (token-based).
 */
import React, { useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import Badge from '@atlaskit/badge';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { R360WorkItem } from '@/types/r360';
import { StatusLozenge } from './StatusLozenge';

export function BoardView({ items, onSelect }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void }) {
  const columns = useMemo(() => [
    {
      key: 'to_do',
      label: 'To do',
      color: token('color.text.warning', '#974F0C'),
      items: items.filter(i => i.status_category === 'to_do' || i.status_category === 'blocked'),
    },
    {
      key: 'in_progress',
      label: 'In progress',
      color: token('color.text.information', '#0055CC'),
      items: items.filter(i => i.status_category === 'in_progress' || i.status_category === 'in_qa'),
    },
    {
      key: 'done',
      label: 'Done',
      color: token('color.text.success', '#216E4E'),
      items: items.filter(i => i.status_category === 'done'),
    },
  ], [items]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '0 0 24px' }}>
      {columns.map(col => (
        <div key={col.key}>
          {/* Column header */}
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
              <Badge appearance={col.key === 'done' ? 'added' : col.key === 'in_progress' ? 'primary' : 'default'}>
                {col.items.length}
              </Badge>
            </span>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {col.items.length === 0 && (
              <div style={{
                padding: '24px 16px', textAlign: 'center',
                fontSize: 12, color: token('color.text.subtlest', '#626F86'),
                border: `1px dashed ${token('color.border', '#091E4224')}`,
                borderRadius: 8,
              }}>
                {col.key === 'done' ? 'No completed items this period' : 'Nothing here'}
              </div>
            )}
            {col.items.map(item => (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                style={{
                  background: token('elevation.surface', '#FFFFFF'),
                  border: `1px solid ${token('color.border', '#091E4224')}`,
                  borderRadius: 8,
                  padding: 12,
                  cursor: 'pointer',
                  transition: 'box-shadow 150ms cubic-bezier(0.2, 0, 0, 1), border-color 150ms cubic-bezier(0.2, 0, 0, 1)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.25), 0 0 1px 0 rgba(9,30,66,0.31)');
                  (e.currentTarget as HTMLElement).style.borderColor = token('color.border.focused', '#388BFF');
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.borderColor = token('color.border', '#091E4224');
                }}
              >
                {/* Row 1: Type icon + key + age as subtle text */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <JiraIssueTypeIcon type={item.item_type} size={16} />
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: token('color.text.brand', '#0052CC'),
                  }}>
                    {item.item_key}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11,
                    color: token('color.text.subtlest', '#626F86'),
                  }}>
                    {item.age_days}d
                  </span>
                </div>

                {/* Row 2: Title */}
                <div style={{
                  fontSize: 14, fontWeight: 400, lineHeight: '20px',
                  color: token('color.text', '#292A2E'),
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  marginBottom: 8,
                }}>
                  {item.title}
                </div>

                {/* Row 3: Priority + Status + Carried-from */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 500,
                    color: token('color.text.subtle', '#44546F'),
                  }}>
                    {item.priority}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <StatusLozenge status={item.status} statusCategory={item.status_category} />
                    {item.carried_from_label && (
                      <span data-cp-lozenge-jira-parity>
                        <Lozenge appearance="moved" isBold={false}>
                          {item.carried_from_label}
                        </Lozenge>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
