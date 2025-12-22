/**
 * Filter Dialog for the Product Roadmap
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { X, RotateCcw } from 'lucide-react';
import type { RoadmapFilters } from '../types/roadmap';
import { EMPTY_FILTERS, STATUS_CONFIG, PRIORITY_CONFIG } from '../types/roadmap';
import { useProducts } from '../hooks/useProducts';

interface RoadmapFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filters: RoadmapFilters;
  onApply: (filters: RoadmapFilters) => void;
}

const HEALTH_OPTIONS = [
  { value: 'on_track', label: 'On Track', color: 'text-green-600' },
  { value: 'at_risk', label: 'At Risk', color: 'text-amber-600' },
  { value: 'off_track', label: 'Off Track', color: 'text-red-600' },
];

const PLATFORM_OPTIONS = [
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'api', label: 'API' },
  { value: 'backend', label: 'Backend' },
];

export function RoadmapFilterDialog({
  isOpen,
  onClose,
  filters,
  onApply,
}: RoadmapFilterDialogProps) {
  const [localFilters, setLocalFilters] = useState<RoadmapFilters>(filters);
  const { data: products = [] } = useProducts();

  // Sync with prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleToggleStatus = (status: string) => {
    setLocalFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleTogglePriority = (priority: string) => {
    setLocalFilters(prev => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter(p => p !== priority)
        : [...prev.priority, priority],
    }));
  };

  const handleToggleProduct = (productId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(p => p !== productId)
        : [...prev.product_ids, productId],
    }));
  };

  const handleToggleHealth = (health: string) => {
    setLocalFilters(prev => ({
      ...prev,
      health: prev.health.includes(health)
        ? prev.health.filter(h => h !== health)
        : [...prev.health, health],
    }));
  };

  const handleTogglePlatform = (platform: string) => {
    setLocalFilters(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleReset = () => {
    setLocalFilters(EMPTY_FILTERS);
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const activeCount = 
    localFilters.status.length + 
    localFilters.priority.length + 
    localFilters.product_ids.length +
    localFilters.health.length +
    localFilters.platforms.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {activeCount}
                </Badge>
              )}
            </DialogTitle>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 gap-1 text-muted-foreground"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Status */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={localFilters.status.includes(key)}
                      onCheckedChange={() => handleToggleStatus(key)}
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-sm">{config.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Priority */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Priority</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={localFilters.priority.includes(key)}
                      onCheckedChange={() => handleTogglePriority(key)}
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-sm">{config.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Products */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Products</Label>
              <div className="grid grid-cols-2 gap-2">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={localFilters.product_ids.includes(product.id)}
                      onCheckedChange={() => handleToggleProduct(product.id)}
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: product.color }}
                    />
                    <span className="text-sm truncate">{product.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Health */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Health</Label>
              <div className="grid grid-cols-3 gap-2">
                {HEALTH_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={localFilters.health.includes(option.value)}
                      onCheckedChange={() => handleToggleHealth(option.value)}
                    />
                    <span className={`text-sm ${option.color}`}>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Platform */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Platform</Label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={localFilters.platforms.includes(option.value)}
                      onCheckedChange={() => handleTogglePlatform(option.value)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
