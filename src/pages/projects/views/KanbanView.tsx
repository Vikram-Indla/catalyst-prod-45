import React from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import { ProjectData } from '../../../types/project.types';

interface KanbanViewProps {
  project: ProjectData;
}

export default function KanbanView({ project }: KanbanViewProps) {
  const columns = [
    { id: 'TO DO', title: 'TO DO', status: 'TO DO' },
    { id: 'IN PROGRESS', title: 'IN PROGRESS', status: 'IN PROGRESS' },
    { id: 'DONE', title: 'DONE', status: 'DONE' },
    { id: 'EMPTY', title: '0', status: null },
  ];

  const getItemsForColumn = (status: string | null) => {
    if (!status) return [];
    
    const items: any[] = [];
    
    project.features.forEach(feature => {
      if (feature.status === status) {
        items.push({ ...feature, type: 'feature' });
      }
      feature.stories.forEach(story => {
        if (story.status === status) {
          items.push({ ...story, type: 'story', parentKey: feature.key });
        }
      });
    });
    
    return items;
  };

  return (
    <div style={{
      padding: token('space.300'),
      height: 'calc(100vh - 200px)',
      overflowX: 'auto',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 300px)',
        gap: token('space.200'),
        minWidth: 'fit-content',
      }}>
        {columns.map((column) => {
          const items = getItemsForColumn(column.status);
          
          return (
            <div
              key={column.id}
              style={{
                background: token('elevation.surface.sunken'),
                borderRadius: token('border.radius'),
                padding: token('space.150'),
                minHeight: '400px',
              }}
            >
              {/* COLUMN HEADER */}
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: token('color.text.subtlest'),
                marginBottom: token('space.150'),
                padding: `${token('space.100')} ${token('space.050')}`,
              }}>
                {column.title}
              </div>

              {/* CARDS */}
              {items.length === 0 ? (
                <div style={{
                  padding: token('space.300'),
                  textAlign: 'center',
                  fontSize: '14px',
                  color: token('color.text.subtlest'),
                }}>
                  No items
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: token('space.100'),
                }}>
                  {items.map((item) => (
                    <KanbanCard
                      key={item.key}
                      itemKey={item.key}
                      summary={item.summary}
                      assignee={item.assignee}
                      type={item.type}
                      parentKey={item.parentKey}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({ itemKey, summary, assignee, type, parentKey }: any) {
  return (
    <div style={{
      background: token('elevation.surface'),
      border: `1px solid ${token('color.border')}`,
      borderRadius: token('border.radius'),
      padding: token('space.150'),
      cursor: 'pointer',
      transition: 'box-shadow 150ms',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = token('elevation.shadow.raised');
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      {/* SUMMARY */}
      <div style={{
        fontSize: '14px',
        color: token('color.text'),
        marginBottom: token('space.100'),
        lineHeight: '20px',
      }}>
        {summary}
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
          gap: token('space.050'),
        }}>
          <span style={{ fontSize: '16px' }}>
            {type === 'feature' ? '📦' : '📗'}
          </span>
          <a
            href={`/browse/${itemKey}`}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: token('color.text.subtlest'),
            }}
          >
            {itemKey}
          </a>
          {parentKey && (
            <span style={{
              fontSize: '12px',
              color: token('color.text.subtlest'),
            }}>
              ({parentKey})
            </span>
          )}
        </div>
        <Avatar size="small" name={assignee} />
      </div>
    </div>
  );
}
