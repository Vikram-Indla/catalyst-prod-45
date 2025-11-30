// Risks Toolbar - Actions and filters for risks grid
// Source: Implementation Spec Section 5.10

import { Download, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RisksToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateClick: () => void;
  onFiltersClick: () => void;
  onExportClick: () => void;
  selectedCount: number;
}

export function RisksToolbar({
  searchQuery,
  onSearchChange,
  onCreateClick,
  onFiltersClick,
  onExportClick,
  selectedCount,
}: RisksToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-card">
      <div className="flex items-center gap-3 flex-1">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search risks..."
          className="max-w-md"
        />
        <Button variant="outline" size="sm" onClick={onFiltersClick}>
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <span className="text-sm text-text-muted mr-2">
            {selectedCount} selected
          </span>
        )}
        <Button variant="outline" size="sm" onClick={onExportClick}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          size="sm"
          onClick={onCreateClick}
          className="bg-brand-gold hover:bg-brand-gold-hover text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Risk
        </Button>
      </div>
    </div>
  );
}
