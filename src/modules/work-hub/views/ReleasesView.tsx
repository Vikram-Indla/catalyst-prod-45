import React, { useState } from 'react';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Release {
  id: string;
  name: string;
  status: 'released' | 'unreleased' | 'archived';
  startDate: string | null;
  releaseDate: string | null;
  description: string;
  progress: {
    done: number;
    inProgress: number;
    toDo: number;
  };
}

const mockReleases: Release[] = [
  {
    id: 'v1',
    name: 'Version 1.0',
    status: 'released',
    startDate: '2024-10-01',
    releaseDate: '2024-11-15',
    description: 'Initial release with core features',
    progress: { done: 15, inProgress: 0, toDo: 0 },
  },
  {
    id: 'v2',
    name: 'Version 2.0',
    status: 'unreleased',
    startDate: '2024-11-20',
    releaseDate: '2024-12-20',
    description: 'Major update with new dashboard',
    progress: { done: 8, inProgress: 5, toDo: 7 },
  },
  {
    id: 'v2.1',
    name: 'Version 2.1',
    status: 'unreleased',
    startDate: '2024-12-15',
    releaseDate: '2024-12-08', // Overdue
    description: 'Bug fixes and improvements',
    progress: { done: 2, inProgress: 3, toDo: 10 },
  },
  {
    id: 'v0.9',
    name: 'Version 0.9 Beta',
    status: 'archived',
    startDate: '2024-08-01',
    releaseDate: '2024-09-15',
    description: 'Beta testing release',
    progress: { done: 10, inProgress: 0, toDo: 0 },
  },
];

const statusColors: Record<string, string> = {
  released: 'bg-green-500/10 text-green-600 border-green-200',
  unreleased: 'bg-blue-500/10 text-blue-600 border-blue-200',
  archived: 'bg-muted text-muted-foreground border-border',
};

export function ReleasesView() {
  const navigate = useNavigate();
  const { projectKey } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isOverdue = (release: Release) => {
    if (release.status !== 'unreleased' || !release.releaseDate) return false;
    return new Date(release.releaseDate) < new Date();
  };

  const getProgress = (release: Release) => {
    const total = release.progress.done + release.progress.inProgress + release.progress.toDo;
    if (total === 0) return 0;
    return Math.round((release.progress.done / total) * 100);
  };

  const filteredReleases = mockReleases.filter((release) => {
    const matchesSearch = release.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || release.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReleaseClick = (releaseId: string) => {
    const basePath = projectKey ? `/projects/${projectKey}` : '/work-hub-test';
    navigate(`${basePath}/releases/${releaseId}`);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Controls */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search releases"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="released">Released</SelectItem>
              <SelectItem value="unreleased">Unreleased</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create version
        </Button>
      </div>

      {/* Releases List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {filteredReleases.map((release) => (
            <div
              key={release.id}
              onClick={() => handleReleaseClick(release.id)}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-foreground">{release.name}</h3>
                    <Badge variant="outline" className={cn('text-xs', statusColors[release.status])}>
                      {release.status === 'released' ? 'Released' :
                       release.status === 'unreleased' ? 'Unreleased' : 'Archived'}
                    </Badge>
                    {isOverdue(release) && (
                      <Badge variant="destructive" className="text-xs">Overdue</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{release.description}</p>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Start: {release.startDate || '-'}</span>
                    <span className={cn(isOverdue(release) && 'text-destructive font-medium')}>
                      Release: {release.releaseDate || '-'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-48">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{getProgress(release)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="bg-green-500 h-full"
                        style={{ width: `${(release.progress.done / (release.progress.done + release.progress.inProgress + release.progress.toDo)) * 100}%` }}
                      />
                      <div
                        className="bg-blue-500 h-full"
                        style={{ width: `${(release.progress.inProgress / (release.progress.done + release.progress.inProgress + release.progress.toDo)) * 100}%` }}
                      />
                      <div
                        className="bg-muted-foreground/30 h-full"
                        style={{ width: `${(release.progress.toDo / (release.progress.done + release.progress.inProgress + release.progress.toDo)) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{release.progress.done} done</span>
                      <span>{release.progress.inProgress} in progress</span>
                      <span>{release.progress.toDo} to do</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}

          {filteredReleases.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No releases found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReleasesView;
