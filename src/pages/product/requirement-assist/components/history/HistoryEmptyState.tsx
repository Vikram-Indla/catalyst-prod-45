import React from 'react';
import { FileText, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HistoryEmptyStateProps {
  hasFilters: boolean;
  onNewGeneration: () => void;
}

export function HistoryEmptyState({ hasFilters, onNewGeneration }: HistoryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center mx-5">
      <div className="w-20 h-20 rounded-full bg-[#f1f5f9] flex items-center justify-center mb-5 relative">
        <FileText className="w-8 h-8 text-[#94a3b8]" />
        <Sparkles className="w-4 h-4 text-[#94a3b8] absolute top-4 right-4" />
      </div>
      
      <h3 className="text-lg font-semibold text-[#0f172a] mb-2">
        {hasFilters ? 'No generations found' : 'No generations yet'}
      </h3>
      
      <p className="text-sm text-[#64748b] mb-5 max-w-sm">
        {hasFilters
          ? 'Try adjusting your filters or create a new generation'
          : 'Create your first AI-powered generation'}
      </p>
      
      <Button
        onClick={onNewGeneration}
        className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Generation
      </Button>
    </div>
  );
}
