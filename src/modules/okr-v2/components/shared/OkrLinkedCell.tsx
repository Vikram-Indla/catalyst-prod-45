// ═══════════════════════════════════════════════════════════════════════════════
// OKR Linked Cell — Shared Presentational Component
// Renders the chip for linked KRs/work ("2 KRs · 1 Work" or "2 KRs")
// Used by both OKRHubV1 (Objectives Table) and OKRHubV2 (Strategy Tree)
// ═══════════════════════════════════════════════════════════════════════════════

import { Badge } from '@/components/ui/badge';

interface OkrLinkedCellProps {
  krCount?: number;
  workItemCount?: number;
  itemType?: 'objective' | 'keyResult' | 'workItem';
}

export function OkrLinkedCell({ krCount = 0, workItemCount = 0, itemType = 'objective' }: OkrLinkedCellProps) {
  let text: string;
  
  if (itemType === 'objective') {
    text = workItemCount > 0
      ? `${krCount} KRs · ${workItemCount} Work`
      : `${krCount} KRs`;
  } else if (itemType === 'keyResult') {
    text = `${workItemCount} items`;
  } else {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className="text-[10px] font-medium bg-muted/50 border-border whitespace-nowrap"
    >
      {text}
    </Badge>
  );
}
