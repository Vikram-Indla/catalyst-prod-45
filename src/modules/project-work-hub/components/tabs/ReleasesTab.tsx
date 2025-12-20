import React from 'react';
import { Search, ChevronDown, MessageSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReleasesTabProps {
  projectId: string;
  onCreateVersion: () => void;
  onVersionClick: (version: any) => void;
}

export const ReleasesTab: React.FC<ReleasesTabProps> = ({ projectId, onCreateVersion, onVersionClick }) => {
  return (
    <div className="p-6 bg-background min-h-full">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative w-[200px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search"
                    disabled
                    className="pl-8 h-9"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Status Filter */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1" disabled>
                  All
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" disabled>
            <MessageSquare className="h-4 w-4" />
            Give feedback
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled>
                  Create version
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coming soon</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Coming Soon State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-medium text-foreground mb-2">
          Releases Coming Soon
        </h3>
        <p className="text-sm text-muted-foreground max-w-[400px]">
          Release version management is under development. You'll be able to create, track, and manage release versions here.
        </p>
      </div>
    </div>
  );
};
