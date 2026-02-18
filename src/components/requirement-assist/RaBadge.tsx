import { cn } from '@/lib/utils';
import type { RaDocumentType, RaStatus } from '@/types/requirement-assist';

const TYPE_STYLES: Record<RaDocumentType, { bg: string; text: string; label: string }> = {
  brd: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'BRD' },
  translation: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Translate' },
  epic: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Epic' },
  uat: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'UAT' },
};

const STATUS_STYLES: Record<RaStatus, { bg: string; text: string; label: string; pulse?: boolean }> = {
  complete: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Complete' },
  generating: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Generating', pulse: true },
  pending: { bg: 'bg-zinc-100', text: 'text-zinc-600', label: 'Pending' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
};

interface RaBadgeProps {
  type?: RaDocumentType;
  status?: RaStatus;
  className?: string;
}

export function RaBadge({ type, status, className }: RaBadgeProps) {
  const style = type ? TYPE_STYLES[type] : status ? STATUS_STYLES[status] : null;
  if (!style) return null;

  const pulse = status && STATUS_STYLES[status]?.pulse;

  return (
    <span
      className={cn(
        'inline-flex items-center px-[5px] py-[1px] rounded-md text-[9px] font-bold uppercase tracking-wide',
        style.bg,
        style.text,
        pulse && 'animate-pulse',
        className
      )}
    >
      {style.label}
    </span>
  );
}
