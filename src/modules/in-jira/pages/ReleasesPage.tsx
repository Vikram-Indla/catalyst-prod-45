/**
 * Releases Page
 * Version management with progress bars and create version CTA
 */

import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  MoreHorizontal,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Version } from '../types';

// Mock versions
const MOCK_VERSIONS: Version[] = [
  {
    id: 'v1',
    name: 'v2.5.0',
    description: 'Q1 2024 Feature Release - User authentication improvements and payment integration',
    startDate: '2024-01-01',
    releaseDate: '2024-03-15',
    released: false,
    archived: false,
    projectId: 'proj-1',
    issueCount: 45,
    doneCount: 32,
    inProgressCount: 8,
    toDoCount: 5,
  },
  {
    id: 'v2',
    name: 'v2.4.2',
    description: 'Hotfix release for critical security vulnerabilities',
    startDate: '2024-01-10',
    releaseDate: '2024-01-20',
    released: true,
    archived: false,
    projectId: 'proj-1',
    issueCount: 12,
    doneCount: 12,
    inProgressCount: 0,
    toDoCount: 0,
  },
  {
    id: 'v3',
    name: 'v2.4.1',
    description: 'Bug fixes and performance improvements',
    startDate: '2023-12-15',
    releaseDate: '2024-01-05',
    released: true,
    archived: false,
    projectId: 'proj-1',
    issueCount: 23,
    doneCount: 23,
    inProgressCount: 0,
    toDoCount: 0,
  },
  {
    id: 'v4',
    name: 'v2.6.0',
    description: 'Q2 2024 Major Release - Mobile app MVP and new reporting features',
    startDate: '2024-03-16',
    releaseDate: '2024-06-30',
    released: false,
    archived: false,
    projectId: 'proj-1',
    issueCount: 78,
    doneCount: 5,
    inProgressCount: 12,
    toDoCount: 61,
  },
  {
    id: 'v5',
    name: 'v2.4.0',
    description: 'Dark mode support and accessibility improvements',
    startDate: '2023-11-01',
    releaseDate: '2023-12-10',
    released: true,
    archived: true,
    projectId: 'proj-1',
    issueCount: 34,
    doneCount: 34,
    inProgressCount: 0,
    toDoCount: 0,
  },
];

// Filter options
type FilterType = 'all' | 'unreleased' | 'released' | 'archived';

export function ReleasesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredVersions = MOCK_VERSIONS.filter(v => {
    // Apply text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!v.name.toLowerCase().includes(query) && 
          !v.description?.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Apply filter
    switch (filter) {
      case 'unreleased':
        return !v.released && !v.archived;
      case 'released':
        return v.released && !v.archived;
      case 'archived':
        return v.archived;
      default:
        return true;
    }
  });

  const getVersionStatus = (version: Version) => {
    if (version.archived) return { label: 'Archived', icon: Archive, color: 'text-slate-500' };
    if (version.released) return { label: 'Released', icon: CheckCircle2, color: 'text-green-500' };
    
    const progress = (version.doneCount / version.issueCount) * 100;
    if (progress >= 75) return { label: 'On Track', icon: Clock, color: 'text-blue-500' };
    if (progress >= 50) return { label: 'In Progress', icon: Clock, color: 'text-yellow-500' };
    return { label: 'At Risk', icon: AlertCircle, color: 'text-orange-500' };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-1">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search versions"
              className="pl-8 w-64 h-8"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center border border-border-default rounded-md">
            {(['all', 'unreleased', 'released', 'archived'] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 rounded-none capitalize",
                  f === 'all' && "rounded-l-md",
                  f === 'archived' && "rounded-r-md"
                )}
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateModal(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create version
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filteredVersions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No versions found</h3>
              <p className="text-sm text-text-tertiary mb-4">
                {searchQuery ? 'Try adjusting your search query' : 'Create your first version to get started'}
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create version
              </Button>
            </div>
          ) : (
            filteredVersions.map((version) => {
              const status = getVersionStatus(version);
              const progress = version.issueCount > 0 
                ? Math.round((version.doneCount / version.issueCount) * 100) 
                : 0;

              return (
                <Card key={version.id} className="bg-surface-2 border-border-default">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-surface-3 rounded-lg">
                          <Package className="h-5 w-5 text-text-secondary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-text-primary">
                              {version.name}
                            </h3>
                            <Badge 
                              variant="secondary" 
                              className={cn("text-xs", status.color)}
                            >
                              <status.icon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-text-secondary mt-0.5">
                            {version.description}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit version</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!version.released && (
                            <DropdownMenuItem>Release</DropdownMenuItem>
                          )}
                          {!version.archived ? (
                            <DropdownMenuItem>Archive</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>Unarchive</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-6 mb-3 text-sm text-text-tertiary">
                      {version.startDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>Start: {version.startDate}</span>
                        </div>
                      )}
                      {version.releaseDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>Release: {version.releaseDate}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Progress</span>
                        <span className="text-text-primary font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center gap-4 text-xs text-text-tertiary">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Done: {version.doneCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          In Progress: {version.inProgressCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-slate-400" />
                          To Do: {version.toDoCount}
                        </span>
                        <span className="ml-auto">
                          Total: {version.issueCount} issues
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ReleasesPage;
