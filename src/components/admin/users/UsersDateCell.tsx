/**
 * UsersDateCell — Date cell with 3-line format
 * Per LOVABLE-USERS-MODULE-REDESIGN.md spec
 */

import { format, parseISO, isValid } from 'date-fns';

interface UsersDateCellProps {
  date: string | null | undefined;
}

export function UsersDateCell({ date }: UsersDateCellProps) {
  if (!date) {
    return <span className="text-[hsl(var(--users-text-muted))]">—</span>;
  }
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date);
    
    if (!isValid(parsedDate)) {
      return <span className="font-mono text-xs text-slate-600">{date}</span>;
    }
    
    const day = format(parsedDate, 'dd');
    const month = format(parsedDate, 'MMM');
    const year = format(parsedDate, 'yyyy');
    
    return (
      <div className="font-mono text-xs text-slate-600 leading-tight">
        <div>{day}</div>
        <div>{month}</div>
        <div>{year}</div>
      </div>
    );
  } catch {
    return <span className="font-mono text-xs text-slate-600">{date}</span>;
  }
}
