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
        return 'bg-[#FF8B00] text-white';
      case 'teal':
        return 'bg-[#00B8D9] text-white';
      case 'purple':
        return 'bg-[#6554C0] text-white';
      case 'blue':
        return 'bg-[#0052CC] text-white';
      case 'red':
        return 'bg-[#DE350B] text-white';
      case 'gray':
        return 'bg-[#6B778C] text-white';
      case 'green':
        return 'bg-[#36B37E] text-white';
      case 'pink':
        return 'bg-[#E774BB] text-white';
      default:
        return 'bg-[#6B778C] text-white';
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