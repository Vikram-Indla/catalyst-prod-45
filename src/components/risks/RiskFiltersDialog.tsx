// Risk Filters Dialog
// Source: Implementation Spec Section 5.11

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiskGridFilters } from "@/types/risks";
import { RISK_STATUSES, ROAM_STATUSES, SEVERITY_LEVELS } from "@/constants/risks";

interface RiskFiltersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filters: RiskGridFilters;
  onFiltersChange: (filters: RiskGridFilters) => void;
}

export function RiskFiltersDialog({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
}: RiskFiltersDialogProps) {
  const handleClearAll = () => {
    onFiltersChange({
      program_increment_id: null,
      owner_id: null,
      status: null,
      resolution_method: null,
      occurrence: null,
      impact: null,
      critical_path: null,
    });
  };

  const handleApply = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filter Risks</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Filter */}
          <div>
            <Label className="text-sm mb-2">Status</Label>
            <Select
              value={filters.status || undefined}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, status: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {RISK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution Method Filter */}
          <div>
            <Label className="text-sm mb-2">Resolution Method (ROAM)</Label>
            <Select
              value={filters.resolution_method || undefined}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, resolution_method: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {ROAM_STATUSES.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Occurrence Filter */}
          <div>
            <Label className="text-sm mb-2">Occurrence</Label>
            <Select
              value={filters.occurrence || undefined}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, occurrence: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {SEVERITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Impact Filter */}
          <div>
            <Label className="text-sm mb-2">Impact</Label>
            <Select
              value={filters.impact || undefined}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, impact: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {SEVERITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Critical Path Filter */}
          <div>
            <Label className="text-sm mb-2">Critical Path</Label>
            <Select
              value={filters.critical_path || undefined}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, critical_path: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClearAll}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
