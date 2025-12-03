import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EditModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export const EditModeToggle: React.FC<EditModeToggleProps> = ({ isActive, onToggle }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={onToggle}
            className={isActive ? 'bg-brand-gold text-white hover:bg-brand-gold/90' : ''}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Edit mode (Ctrl+E)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
