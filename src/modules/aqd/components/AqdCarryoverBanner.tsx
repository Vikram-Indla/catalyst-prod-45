// Aqd¹⁰ Carryover Banner
import React from 'react';
import { RefreshCw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AqdItem } from '@/types/aqd';

interface AqdCarryoverBannerProps {
  carryoverItems: AqdItem[];
  onConfirmAll: () => void;
  onDismissAll: () => void;
}

export function AqdCarryoverBanner({ carryoverItems, onConfirmAll, onDismissAll }: AqdCarryoverBannerProps) {
  if (carryoverItems.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {carryoverItems.length} {carryoverItems.length === 1 ? 'priority' : 'priorities'} carried over from last week
            </div>
            <div className="text-sm text-gray-600">
              Review and confirm which items to continue this week
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="gap-1 border-green-500 text-green-700 hover:bg-green-50"
            onClick={onConfirmAll}
          >
            <Check className="h-3.5 w-3.5" />
            Confirm All
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            className="gap-1"
            onClick={onDismissAll}
          >
            <X className="h-3.5 w-3.5" />
            Dismiss All
          </Button>
        </div>
      </div>
    </div>
  );
}
