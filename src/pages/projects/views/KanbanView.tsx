import React from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import { ProjectData } from '../../../types/project.types';

interface KanbanViewProps {
  project: ProjectData;
}

interface KanbanItem {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  type: 'feature' | 'story';
  parentKey?: string;
}

export default function KanbanView({ project }: KanbanViewProps) {
  const columns = [
    { id: 'TO DO', title: 'TO DO' },
    { id: 'IN PROGRESS', title: 'IN PROGRESS' },
    { id: 'DONE', title: 'DONE' },
    { id: 'EMPTY', title: '0' },
  ];

  const getItemsForColumn = (columnId: string): KanbanItem[] => {
    if (columnId === 'EMPTY') return [];
    
    const items: KanbanItem[] = [];
    
    project.features.forEach(feature => {
      if (feature.status === columnId) {
        items.push({
          key: feature.key,
          summary: feature.summary,
          status: feature.status,
          assignee: feature.assignee,
          type: 'feature',
        });
      }
      feature.stories.forEach(story => {
        if (story.status === columnId) {
          items.push({
            key: story.key,
            summary: story.summary,
            status: story.status,
            assignee: story.assignee,
            type: 'story',
            parentKey: feature.key,
          });
        }
      });
    });
    
    return items;
  };

  return (
    <div style={{
      padding: '24px',
      background: token('elevation.surface.sunken'),
      minHeight: 'calc(100vh - 180px)',
      overflowX: 'auto',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 280px)',
        gap: '16px',
        minWidth: 'fit-content',
      }}>
        {columns.map((column) => {
          const items = getItemsForColumn(column.id);
          
          return (
            <div
              key={column.id}
              style={{
                background: token('color.background.neutral'),
                borderRadius: '4px',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* COLUMN HEADER */}
              <div style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${token('color.border')}`,
              }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: token('color.text.subtlest'),
                  letterSpacing: '0.5px',
                }}>
                  {column.title}
                  {items.length > 0 && (
                    <span style={{ marginLeft: '8px', fontWeight: 400 }}>
                      {items.length}
                    </span>
                  )}
                </span>
              </div>

              {/* CARDS CONTAINER */}
              <div style={{
                padding: '8px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {items.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100px',
                    color: token('color.text.subtlest'),
                    fontSize: '14px',
                  }}>
                    No items
                  </div>
                ) : (
                  items.map((item) => (
                    <KanbanCard key={item.key} item={item} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({ item }: { item: KanbanItem }) {
  return (
    <div style={{
      background: token('elevation.surface'),
      border: `1px solid ${token('color.border')}`,
      borderRadius: '4px',
      padding: '12px',
      cursor: 'pointer',
      boxShadow: '0 1px 1px rgba(9, 30, 66, 0.08)',
      transition: 'box-shadow 0.2s ease, background 0.2s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 8px rgba(9, 30, 66, 0.16)';
      e.currentTarget.style.background = token('elevation.surface.hovered');
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 1px 1px rgba(9, 30, 66, 0.08)';
      e.currentTarget.style.background = token('elevation.surface');
    }}
    >
      {/* SUMMARY */}
      <div style={{
        fontSize: '14px',
        color: token('color.text'),
        marginBottom: '12px',
        lineHeight: '20px',
        fontWeight: 400,
      }}>
        {item.summary}
      </div>

      {/* FOOTER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '14px' }}>
            {item.type === 'feature' ? '📦' : '📗'}
          </span>
          <a
            href={`/browse/${item.key}`}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: token('color.text.subtlest'),
              textDecoration: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {item.key}
          </a>
        </div>
        <Avatar size="small" name={item.assignee} />
      </div>
    </div>
  );
}
