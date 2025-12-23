import { format } from 'date-fns';

interface DateCellProps {
  date: string | null | undefined;
}

export function DateCell({ date }: DateCellProps) {
  if (!date) {
    return <span className="text-muted-foreground">—</span>;
  }
  
  try {
    const formatted = format(new Date(date), 'dd MMM yyyy');
    return <span className="text-sm text-foreground">{formatted}</span>;
  } catch {
    return <span className="text-muted-foreground">—</span>;
  }
}
