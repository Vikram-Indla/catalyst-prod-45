// =====================================================
// RELEASES EMPTY STATE
// Shown when no releases match filters
// =====================================================

import { BoxIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onClearFilters: () => void;
}

export function ReleasesEmptyState({ onClearFilters }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
        <BoxIcon className="w-10 h-10 text-slate-300" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">No releases found</h3>
      <p className="text-sm text-slate-500 mb-6">Try adjusting your filters or search query</p>
      <Button 
        variant="outline" 
        onClick={onClearFilters} 
        className="border-primary text-primary hover:bg-blue-50"
      >
        Clear filters
      </Button>
    </div>
  );
}
