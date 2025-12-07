import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter, Download, List, LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/release/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function IncidentsList() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-full flex flex-col bg-white">
      <PageHeader 
        title="Incidents" 
        subtitle="Manage and track all incidents"
      />

      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-[#E8E8E8] bg-white">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8C8C]" />
            <Input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-[#E8E8E8] focus:border-[#C69C6D] focus:ring-[#C69C6D]"
            />
          </div>

          {/* Pagination */}
          <div className="flex items-center border border-[#E8E8E8] rounded-md">
            <button className="px-2 py-1.5 hover:bg-[#FAFAFA] text-[#5C5C5C]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm text-[#5C5C5C] border-x border-[#E8E8E8]">
              1-20 of 38
            </span>
            <button className="px-2 py-1.5 hover:bg-[#FAFAFA] text-[#5C5C5C]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex border border-[#E8E8E8] rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors",
                viewMode === 'list' 
                  ? "text-[#C69C6D]" 
                  : "text-[#5C5C5C] hover:bg-[#FAFAFA]"
              )}
              style={viewMode === 'list' ? { backgroundColor: 'rgba(198, 156, 109, 0.1)' } : undefined}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors border-l border-[#E8E8E8]",
                viewMode === 'kanban' 
                  ? "text-[#C69C6D]" 
                  : "text-[#5C5C5C] hover:bg-[#FAFAFA]"
              )}
              style={viewMode === 'kanban' ? { backgroundColor: 'rgba(198, 156, 109, 0.1)' } : undefined}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
          </div>

          {/* Filters */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-[#E8E8E8] text-[#5C5C5C] hover:bg-[#FAFAFA] hover:text-[#1A1A1A]"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
          </Button>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-[#E8E8E8] text-[#5C5C5C] hover:bg-[#FAFAFA] hover:text-[#1A1A1A]"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-center h-full border-2 border-dashed border-[#E8E8E8] rounded-lg bg-[#FAFAFA]">
          <p className="text-[#8C8C8C] text-sm">
            Incidents table will be implemented in the next step.
          </p>
        </div>
      </div>
    </div>
  );
}
