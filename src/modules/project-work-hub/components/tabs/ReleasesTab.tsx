import React, { useState } from 'react';
import { Search, ChevronDown, MoreHorizontal, MessageSquare } from 'lucide-react';
import { useReleaseVersions } from '../../hooks/useReleaseVersions';
import { ReleaseVersion } from '../../types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReleasesTabProps {
  projectId: string;
  onCreateVersion: () => void;
  onVersionClick: (version: ReleaseVersion) => void;
}

export const ReleasesTab: React.FC<ReleasesTabProps> = ({ projectId, onCreateVersion, onVersionClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'UNRELEASED' | 'RELEASED' | undefined>('UNRELEASED');
  
  const { data: versions, isLoading } = useReleaseVersions(projectId, statusFilter);

  const filteredVersions = versions?.filter(v => 
    !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-background min-h-full">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                {statusFilter || 'All'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter(undefined)}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('UNRELEASED')}>Unreleased</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('RELEASED')}>Released</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Give feedback
          </Button>

          <Button onClick={onCreateVersion}>
            Create version
          </Button>
        </div>
      </div>

      {/* Release Versions Table */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">
          Release versions
        </h3>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="p-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Version
              </th>
              <th className="p-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="p-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Progress
              </th>
              <th className="p-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Start date
              </th>
              <th className="p-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Release date
              </th>
              <th className="p-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </th>
              <th className="p-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                More actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredVersions?.map((version) => (
              <tr 
                key={version.id}
                className="border-b border-border cursor-pointer hover:bg-muted/50"
                onClick={() => onVersionClick(version)}
              >
                <td className="p-3">
                  <a 
                    href="#" 
                    className="text-primary font-medium hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    {version.name}
                  </a>
                </td>
                <td className="p-3">
                  <Badge variant={version.status === 'RELEASED' ? 'default' : 'secondary'}>
                    {version.status}
                  </Badge>
                </td>
                <td className="p-3 w-[200px]">
                  <div className="flex h-2 rounded overflow-hidden bg-muted">
                    <div 
                      className="bg-green-500"
                      style={{ width: `${version.progress * 0.6}%` }} 
                    />
                    <div 
                      className="bg-primary"
                      style={{ width: `${version.progress * 0.4}%` }} 
                    />
                  </div>
                </td>
                <td className="p-3 text-sm text-foreground">
                  {version.startDate ? format(new Date(version.startDate), 'MMMM d, yyyy') : ''}
                </td>
                <td className={`p-3 text-sm ${
                  version.releaseDate && new Date(version.releaseDate) < new Date() 
                    ? 'text-destructive' 
                    : 'text-primary'
                }`}>
                  {version.releaseDate ? format(new Date(version.releaseDate), 'MMMM d, yyyy') : ''}
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {version.description || ''}
                </td>
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Release</DropdownMenuItem>
                      <DropdownMenuItem>Archive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!filteredVersions || filteredVersions.length === 0) && (
          <div className="py-12 text-center text-muted-foreground">
            No release versions found
          </div>
        )}
      </div>
    </div>
  );
};
