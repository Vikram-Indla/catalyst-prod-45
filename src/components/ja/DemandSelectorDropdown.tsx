import { useNavigate } from 'react-router-dom';
import { Factory } from 'lucide-react';

interface DemandSelectorDropdownProps {
  onClose: () => void;
}

export function DemandSelectorDropdown({ onClose }: DemandSelectorDropdownProps) {
  const navigate = useNavigate();

  const handleSelect = () => {
    navigate('/industry');
    onClose();
  };

  return (
    <div className="w-64 bg-popover border border-border rounded-md shadow-lg">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          DEMAND
        </p>
      </div>
      <div className="p-2">
        <button
          onClick={handleSelect}
          className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2 hover:bg-muted transition-colors"
        >
          <Factory className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 text-sm font-medium text-foreground">
            Industry
          </span>
        </button>
      </div>
    </div>
  );
}
