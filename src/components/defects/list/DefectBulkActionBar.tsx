// =====================================================
// DEFECT BULK ACTION BAR
// Floating bar at bottom for bulk operations
// =====================================================

import { X, CheckCircle, UserPlus, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATALYST_V5 } from '@/lib/catalyst-colors';

interface DefectBulkActionBarProps {
  selectedCount: number;
  onChangeStatus: () => void;
  onAssign: () => void;
  onClose: () => void;
}

export function DefectBulkActionBar({
  selectedCount,
  onChangeStatus,
  onAssign,
  onClose,
}: DefectBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2.5 rounded-lg shadow-xl z-50"
      style={{ backgroundColor: CATALYST_V5.slate[900] }}
    >
      <span className="text-sm font-medium text-white">
        {selectedCount} selected
      </span>
      
      <div className="w-px h-5 bg-slate-700" />
      
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-slate-800"
        onClick={onChangeStatus}
      >
        <CheckCircle className="h-4 w-4 mr-1.5" />
        Status
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-slate-800"
        onClick={onAssign}
      >
        <UserPlus className="h-4 w-4 mr-1.5" />
        Assign
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-slate-800"
        onClick={onClose}
      >
        <XCircle className="h-4 w-4 mr-1.5" />
        Close
      </Button>
      
      <div className="w-px h-5 bg-slate-700" />
      
      <button
        onClick={onClose}
        className="p-1 text-slate-400 hover:text-white transition-colors"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
