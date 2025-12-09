import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Folder, LayoutGrid, BookOpen } from 'lucide-react';

export type CreateType = 'program' | 'project' | 'work-item';

interface UnifiedCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: CreateType) => void;
}

const options: Array<{
  type: CreateType;
  label: string;
  description: string;
  Icon: typeof Folder;
  iconColor: string;
  iconBg: string;
}> = [
  {
    type: 'program',
    label: 'Program',
    description: 'Create a program to house epics',
    Icon: Folder,
    iconColor: '#FF991F',
    iconBg: '#FFF0B3',
  },
  {
    type: 'project',
    label: 'Project',
    description: 'Create a project linked to a program',
    Icon: LayoutGrid,
    iconColor: '#00B8D9',
    iconBg: '#B3F5FF',
  },
  {
    type: 'work-item',
    label: 'Work Item',
    description: 'Create epic, feature, story, defect, etc.',
    Icon: BookOpen,
    iconColor: '#4C9AFF',
    iconBg: '#DEEBFF',
  },
];

export function UnifiedCreateModal({
  isOpen,
  onClose,
  onSelectType,
}: UnifiedCreateModalProps) {
  
  const handleOptionClick = (type: CreateType) => {
    console.log('[UnifiedCreateModal] Option clicked:', type);
    // Call onSelectType first, then close
    onSelectType(type);
    // Use setTimeout to ensure state update happens before close
    setTimeout(() => {
      onClose();
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-[#172B4D]">
              Create
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-4">
          <p className="text-sm text-[#5E6C84] mb-4">
            What would you like to create?
          </p>

          <div className="space-y-0">
            {options.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => handleOptionClick(option.type)}
                className="w-full flex items-start gap-4 p-4 text-left hover:bg-[#F4F5F7] transition-colors border-b border-[#EBECF0] last:border-b-0"
              >
                <div
                  className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: option.iconBg }}
                >
                  <option.Icon size={20} color={option.iconColor} />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="text-sm font-semibold text-[#172B4D] mb-1">
                    {option.label}
                  </div>
                  <div className="text-xs text-[#5E6C84] leading-4">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 pt-2 border-t flex justify-end">
          <Button variant="ghost" onClick={onClose} className="text-[#5E6C84]">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
