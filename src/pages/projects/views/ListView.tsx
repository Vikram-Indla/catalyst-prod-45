import React, { useState } from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Search, Filter, MoreHorizontal, ChevronRight, ChevronDown } from 'lucide-react';
import { ProjectData } from '../../../types/project.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, Lozenge, type LozengeAppearance } from '@/components/ads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ListViewProps {
  project: ProjectData;
}

export default function ListView({ project }: ListViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['FEAT-1', 'FEAT-3', 'STORY-1', 'STORY-6']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getStatusAppearance = (status: string): LozengeAppearance => {
    switch (status) {
      case 'DONE': return 'success';
      case 'IN PROGRESS': return 'inprogress';
      case 'TO DO': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="p-6 bg-card min-h-[calc(100vh-180px)]">
      {/* TOOLBAR */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative w-[280px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="ghost" size="sm">
          <Filter className="w-4 h-4 mr-1" />
          Filter
        </Button>
      </div>

      {/* TABLE */}
      <div className="border border-border rounded overflow-hidden">
        {/* TABLE HEADER */}
        <div className="grid grid-cols-[40px_50px_90px_1fr_120px_100px_80px_100px_50px] bg-muted border-b border-border px-3 py-2">
          <div><Checkbox /></div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Type</div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Key</div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Summary</div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Status</div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Assignee</div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Priority</div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Created</div>
          <div></div>
        </div>

        {/* TABLE BODY */}
        <div>
          {project.features.map((feature) => {
            const isFeatureExpanded = expandedRows.has(feature.key);
            
            return (
              <React.Fragment key={feature.key}>
                {/* FEATURE ROW */}
                <div className="grid grid-cols-[40px_50px_90px_1fr_120px_100px_80px_100px_50px] px-3 py-2.5 border-b border-border bg-card items-center">
                  <div><Checkbox /></div>
                  <div><JiraIssueTypeIcon type="Feature" size={16} /></div>
                  <a href={`/browse/${feature.key}`} className="text-sm font-medium text-primary no-underline hover:underline">
                    {feature.key}
                  </a>
                  <div className="flex items-center gap-1.5">
                    {feature.stories.length > 0 && (
                      <button
                        onClick={(e) => toggleExpand(feature.key, e)}
                        className="bg-transparent border-none cursor-pointer p-0 flex items-center"
                      >
                        {isFeatureExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <span className="text-sm text-foreground">{feature.summary}</span>
                  </div>
                  <div><Lozenge appearance={getStatusAppearance(feature.status)}>{feature.status}</Lozenge></div>
                  <div>
                    <Avatar name={feature.assignee} size="xsmall" />
                  </div>
                  <div className="text-sm text-foreground">{feature.priority}</div>
                  <div className="text-sm text-muted-foreground">{feature.created}</div>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* STORY ROWS */}
                {isFeatureExpanded && feature.stories.map((story) => {
                  const isStoryExpanded = expandedRows.has(story.key);
                  
                  return (
                    <React.Fragment key={story.key}>
                      <div className="grid grid-cols-[40px_50px_90px_1fr_120px_100px_80px_100px_50px] px-3 py-2.5 border-b border-border bg-card items-center">
                        <div><Checkbox /></div>
                        <div className="pl-6"><JiraIssueTypeIcon type="Story" size={16} /></div>
                        <a href={`/browse/${story.key}`} className="text-sm font-medium text-primary no-underline hover:underline">
                          {story.key}
                        </a>
                        <div className="flex items-center gap-1.5 pl-6">
                          {story.subtasks.length > 0 && (
                            <button
                              onClick={(e) => toggleExpand(story.key, e)}
                              className="bg-transparent border-none cursor-pointer p-0 flex items-center"
                            >
                              {isStoryExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <span className="text-sm text-foreground">{story.summary}</span>
                        </div>
                        <div><Lozenge appearance={getStatusAppearance(story.status)}>{story.status}</Lozenge></div>
                        <div>
                          <Avatar name={story.assignee} size="xsmall" />
                        </div>
                        <div className="text-sm text-foreground">{story.priority}</div>
                        <div className="text-sm text-muted-foreground">{story.created}</div>
                        <div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* SUBTASK ROWS */}
                      {isStoryExpanded && story.subtasks.map((subtask) => (
                        <div 
                          key={subtask.key}
                          className="grid grid-cols-[40px_50px_90px_1fr_120px_100px_80px_100px_50px] px-3 py-2.5 border-b border-border bg-card items-center"
                        >
                          <div><Checkbox /></div>
                          <div className="pl-12"><JiraIssueTypeIcon type="Subtask" size={16} /></div>
                          <a href={`/browse/${subtask.key}`} className="text-sm font-medium text-primary no-underline hover:underline">
                            {subtask.key}
                          </a>
                          <div className="pl-12">
                            <span className="text-sm text-foreground">{subtask.summary}</span>
                          </div>
                          <div><Lozenge appearance={getStatusAppearance(subtask.status)}>{subtask.status}</Lozenge></div>
                          <div>
                            <Avatar name={subtask.assignee} size="xsmall" />
                          </div>
                          <div className="text-sm text-foreground">{subtask.priority}</div>
                          <div className="text-sm text-muted-foreground">{subtask.created}</div>
                          <div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}