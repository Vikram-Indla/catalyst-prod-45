import React from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import { ProjectData } from '../../../types/project.types';

interface KanbanViewProps {
  project: ProjectData;
}

export default function KanbanView({ project }: KanbanViewProps) {
  const columns = [
    { key: 'TO DO', title: 'To Do', color: '#42526E' },
    { key: 'IN PROGRESS', title: 'In Progress', color: '#0052CC' },
    { key: 'DONE', title: 'Done', color: '#00875A' },
  ];

  // Flatten all items
  const allItems = project.features.flatMap(feature => [
    { ...feature, type: 'Feature' as const },
    ...feature.stories.flatMap(story => [
      { ...story, type: 'Story' as const },
      ...story.subtasks.map(subtask => ({ ...subtask, type: 'Subtask' as const })),
    ]),
  ]);

  return (
    <div style={{
      padding: token('space.300'),
      display: 'flex',
      gap: token('space.200'),
      overflow: 'auto',
      height: '100%',
    }}>
      {columns.map(column => {
        const columnItems = allItems.filter(item => item.status === column.key);
        
        return (
          <div
            key={column.key}
            style={{
              minWidth: '280px',
              maxWidth: '320px',
              background: token('color.background.neutral'),
              borderRadius: token('border.radius'),
              padding: token('space.100'),
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Column Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: token('space.100'),
              padding: token('space.100'),
              marginBottom: token('space.100'),
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: column.color,
              }} />
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: token('color.text'),
              }}>
                {column.title}
              </span>
              <span style={{
                fontSize: '12px',
                color: token('color.text.subtlest'),
                marginLeft: 'auto',
              }}>
                {columnItems.length}
              </span>
            </div>

            {/* Column Cards */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: token('space.100'),
              overflow: 'auto',
              flex: 1,
            }}>
              {columnItems.map(item => (
                <KanbanCard key={item.key} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ item }: { item: { key: string; summary: string; type: string; assignee: string; priority: string } }) {
  const typeIcon = item.type === 'Feature' ? '📦' : item.type === 'Story' ? '📗' : '☑️';
  
  return (
    <div style={{
      background: token('elevation.surface'),
      border: `1px solid ${token('color.border')}`,
      borderRadius: token('border.radius'),
      padding: token('space.150'),
      cursor: 'pointer',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.100'),
        marginBottom: token('space.100'),
      }}>
        <span style={{ fontSize: '14px' }}>{typeIcon}</span>
        <a href={`/browse/${item.key}`} style={{
          fontSize: '12px',
          fontWeight: 500,
          color: token('color.link'),
          textDecoration: 'none',
        }}>
          {item.key}
        </a>
      </div>
      
      <p style={{
        fontSize: '14px',
        color: token('color.text'),
        marginBottom: token('space.100'),
        lineHeight: '20px',
      }}>
        {item.summary}
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Lozenge appearance="default">{item.priority}</Lozenge>
        <Avatar size="small" name={item.assignee} />
      </div>
    </div>
  );
}
