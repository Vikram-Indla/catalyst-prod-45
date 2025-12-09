import { useNavigate } from 'react-router-dom';
import { Factory } from 'lucide-react';

interface DemandSelectorDropdownProps {
  onClose: () => void;
}

export function DemandSelectorDropdown({ onClose }: DemandSelectorDropdownProps) {
  const navigate = useNavigate();

  const handleSelect = () => {
    navigate('/industry/industry');
    onClose();
  };

  return (
    <div className="w-64 bg-popover border rounded-md shadow-lg z-[60]">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground">DEMAND</p>
      </div>
      <div className="p-2">
        <button
          onClick={handleSelect}
          className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm"
        >
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 font-medium">Industry</span>
          </div>
        </button>
      </div>
    </div>
  );
}
