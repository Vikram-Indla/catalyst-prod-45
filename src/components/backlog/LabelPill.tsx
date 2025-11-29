import { Label } from '@/types/backlog.types';

interface LabelPillProps {
  label: Label;
  abbreviated?: boolean;
}

export function LabelPill({ label, abbreviated = false }: LabelPillProps) {
  const displayText = abbreviated && label.text.length > 6 
    ? label.text.substring(0, 6) + "..." 
    : label.text;

  const getColorStyles = () => {
    switch (label.color) {
      case 'orange':
        return 'bg-warning text-white';
      case 'teal':
        return 'bg-info text-white';
      case 'purple':
        return 'bg-workitem-theme text-white';
      case 'blue':
        return 'bg-primary text-white';
      case 'red':
        return 'bg-destructive text-white';
      case 'gray':
        return 'bg-muted-foreground text-white';
      case 'green':
        return 'bg-success text-white';
      case 'pink':
        return 'bg-workitem-epic text-white';
      default:
        return 'bg-muted-foreground text-white';
    }
  };

  return (
    <span 
      className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${getColorStyles()}`}
      title={label.text}
    >
      {displayText}
    </span>
  );
}