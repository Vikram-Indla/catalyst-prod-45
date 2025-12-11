import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
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

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '';

  return (
    <div className="p-6 bg-muted/50 min-h-[calc(100vh-180px)] overflow-x-auto">
      <div className="grid grid-cols-4 gap-4 min-w-fit" style={{ gridTemplateColumns: 'repeat(4, 280px)' }}>
        {columns.map((column) => {
          const items = getItemsForColumn(column.id);
          
          return (
            <div
              key={column.id}
              className="bg-muted rounded min-h-[400px] flex flex-col"
            >
              {/* COLUMN HEADER */}
              <div className="px-4 py-3 border-b border-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {column.title}
                  {items.length > 0 && (
                    <span className="ml-2 font-normal">{items.length}</span>
                  )}
                </span>
              </div>

              {/* CARDS CONTAINER */}
              <div className="p-2 flex-1 flex flex-col gap-2">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                    No items
                  </div>
                ) : (
                  items.map((item) => (
                    <Card key={item.key} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        {/* SUMMARY */}
                        <div className="text-sm text-foreground mb-3 leading-5">
                          {item.summary}
                        </div>

                        {/* FOOTER */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{item.type === 'feature' ? '📦' : '📗'}</span>
                            <a
                              href={`/browse/${item.key}`}
                              className="text-xs font-medium text-muted-foreground hover:text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.key}
                            </a>
                          </div>
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px]">{getInitials(item.assignee)}</AvatarFallback>
                          </Avatar>
                        </div>
                      </CardContent>
                    </Card>
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
