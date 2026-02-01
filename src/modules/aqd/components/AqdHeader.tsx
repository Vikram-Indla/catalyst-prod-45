// Aqd¹⁰ Header Component
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AqdHeaderProps {
  onCreateList: () => void;
}

export function AqdHeader({ onCreateList }: AqdHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-1">
          AQD<sup className="text-sm font-bold">10</sup>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Executive Priority Management
        </p>
      </div>
      <Button onClick={onCreateList} className="gap-2">
        <Plus className="h-4 w-4" />
        New List
      </Button>
    </div>
  );
}
