// ═══════════════════════════════════════════════════════════════════════════════
// OKR Linked Cell — Shared Presentational Component
// Badge showing "X KRs · Y Work" format
// ═══════════════════════════════════════════════════════════════════════════════

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
    text = `${workItemCount} Work`;
  } else {
    return null;
  }

  return (
    <span 
      className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-transparent border border-border text-foreground whitespace-nowrap"
    >
      {text}
    </span>
  );
}
