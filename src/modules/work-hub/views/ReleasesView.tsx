import React, { useState } from 'react';
import { Search, Plus, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';

// Types
type ReleaseStatus = 'RELEASED' | 'UNRELEASED' | 'ARCHIVED';

interface Release {
  id: string;
  name: string;
  status: ReleaseStatus;
  startDate: string | null;
  releaseDate: string | null;
  description: string;
  progress: {
    done: number;
    inProgress: number;
    toDo: number;
  };
}

// Mock data
const mockReleases: Release[] = [
  {
    id: 'v1',
    name: 'Version 1.0',
    status: 'RELEASED',
    startDate: '2024-10-01',
    releaseDate: '2024-11-15',
    description: 'Initial release with core features',
    progress: { done: 15, inProgress: 0, toDo: 0 },
  },
  {
    id: 'v2',
    name: 'Version 2.0',
    status: 'UNRELEASED',
    startDate: '2024-11-20',
    releaseDate: '2024-12-20',
    description: 'Major update with new dashboard',
    progress: { done: 8, inProgress: 5, toDo: 7 },
  },
  {
    id: 'v2.1',
    name: 'Version 2.1',
    status: 'UNRELEASED',
    startDate: '2024-12-15',
    releaseDate: '2024-12-08', // Overdue
    description: 'Bug fixes and improvements',
    progress: { done: 2, inProgress: 3, toDo: 10 },
  },
  {
    id: 'v0.9',
    name: 'Version 0.9 Beta',
    status: 'ARCHIVED',
    startDate: '2024-08-01',
    releaseDate: '2024-09-15',
    description: 'Beta testing release',
    progress: { done: 10, inProgress: 0, toDo: 0 },
  },
];

// Status pill component matching Jira's neutral/semantic lozenges
const statusStyles: Record<ReleaseStatus, string> = {
  UNRELEASED: 'bg-slate-100 text-slate-700',
  RELEASED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-slate-50 text-slate-500 border border-slate-200',
};

function ReleaseStatusPill({ status }: { status: ReleaseStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-[11px] leading-[16px] font-semibold uppercase tracking-wide',
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}

// Progress component
function ReleaseProgress({ release }: { release: Release }) {
  const total = release.progress.done + release.progress.inProgress + release.progress.toDo;
  
  if (total === 0) {
    return (
      <span className="text-[14px] leading-[20px] text-slate-500">
        No work items
      </span>
    );
  }

  const donePercent = (release.progress.done / total) * 100;
  const inProgressPercent = (release.progress.inProgress / total) * 100;

  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden flex">
        <div
          className="h-full bg-green-600"
          style={{ width: `${donePercent}%` }}
        />
        <div
          className="h-full bg-blue-500"
          style={{ width: `${inProgressPercent}%` }}
        />
      </div>
    </div>
  );
}

// Release row component
function ReleaseRow({ 
  release, 
  onClick,
  onEdit,
  onRelease,
  onDelete 
}: { 
  release: Release;
  onClick: () => void;
  onEdit: () => void;
  onRelease: () => void;
  onDelete: () => void;
}) {
  const isOverdue = release.status === 'UNRELEASED' && 
    release.releaseDate && 
    isPast(new Date(release.releaseDate));

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), 'MMM d, yyyy');
  };

  return (
    <div 
      className="flex items-center gap-6 border-t border-slate-200 py-3 text-[14px] leading-[20px] text-slate-900 hover:bg-slate-50 transition-colors"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* Version (link) - min-w for consistency */}
      <div className="min-w-[140px]">
        <button
          onClick={onClick}
          className="text-[14px] font-medium text-blue-700 hover:underline text-left"
        >
          {release.name}
        </button>
      </div>

      {/* Status lozenge */}
      <div className="min-w-[100px]">
        <ReleaseStatusPill status={release.status} />
      </div>

      {/* Progress */}
      <div className="min-w-[180px]">
        <ReleaseProgress release={release} />
      </div>

      {/* Start date */}
      <div className="min-w-[100px] text-[14px] text-slate-700">
        {formatDate(release.startDate)}
      </div>

      {/* Release date */}
      <div className={cn(
        "min-w-[100px] text-[14px]",
        isOverdue ? "text-red-600 font-medium" : "text-slate-700"
      )}>
        {formatDate(release.releaseDate)}
      </div>

      {/* Description - flexible width */}
      <div className="flex-1 text-[14px] text-slate-600 truncate">
        {release.description || '—'}
      </div>

      {/* More actions */}
      <div className="min-w-[40px] flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white z-50">
            <DropdownMenuItem onClick={onEdit}>
              Edit version
            </DropdownMenuItem>
            {release.status === 'UNRELEASED' && (
              <DropdownMenuItem onClick={onRelease}>
                Release
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-red-600 focus:text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Table header
function ReleaseTableHeader() {
  return (
    <div 
      className="flex items-center gap-6 py-2 text-[11px] leading-[16px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif" }}
    >
      <div className="min-w-[140px]">Version</div>
      <div className="min-w-[100px]">Status</div>
      <div className="min-w-[180px]">Progress</div>
      <div className="min-w-[100px]">Start date</div>
      <div className="min-w-[100px]">Release date</div>
      <div className="flex-1">Description</div>
      <div className="min-w-[40px]"></div>
    </div>
  );
}

export function ReleasesView() {
  const navigate = useNavigate();
  const { projectKey } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredReleases = mockReleases.filter((release) => {
    const matchesSearch = release.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || release.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReleaseClick = (releaseId: string) => {
    const basePath = projectKey ? `/projects/${projectKey}` : '/work-hub-test';
    navigate(`${basePath}/releases/${releaseId}`);
  };

  // Placeholder handlers - TODO: wire to actual backend
  const handleEdit = (releaseId: string) => {
    console.log('Edit release:', releaseId);
  };

  const handleRelease = (releaseId: string) => {
    console.log('Release version:', releaseId);
  };

  const handleDelete = (releaseId: string) => {
    console.log('Delete release:', releaseId);
  };

  return (
    <div 
      className="h-full flex flex-col bg-white"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* Toolbar Row */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search releases"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-[14px] border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-[14px] border-slate-300">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="released">Released</SelectItem>
              <SelectItem value="unreleased">Unreleased</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Create version button */}
        <Button 
          className="h-9 px-4 text-[14px] font-medium bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Create version
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {/* Section heading */}
        <h2 className="text-[20px] leading-[24px] font-semibold text-slate-900 mb-4">
          Release versions
        </h2>

        {/* Release list */}
        <div className="w-full">
          <ReleaseTableHeader />
          
          {filteredReleases.length > 0 ? (
            <div>
              {filteredReleases.map((release) => (
                <ReleaseRow
                  key={release.id}
                  release={release}
                  onClick={() => handleReleaseClick(release.id)}
                  onEdit={() => handleEdit(release.id)}
                  onRelease={() => handleRelease(release.id)}
                  onDelete={() => handleDelete(release.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-[14px]">
              <p>No releases found</p>
              <p className="text-[12px] mt-1">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReleasesView;
