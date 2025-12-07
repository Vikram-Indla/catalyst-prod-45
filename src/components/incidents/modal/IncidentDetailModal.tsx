import { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, Share2, MoreHorizontal, Maximize2, Minimize2, Plus, Flag, Copy, Move, Archive, Trash2, Printer, FileSpreadsheet, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Incident } from '@/types/release';
import { IncidentModalMain } from './IncidentModalMain';
import { IncidentModalSidebar } from './IncidentModalSidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface IncidentDetailModalProps {
  incident: Incident;
  isOpen: boolean;
  onClose: () => void;
  parentIncidentId?: string;
}

export default function IncidentDetailModal({ incident, isOpen, onClose, parentIncidentId }: IncidentDetailModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localIncident, setLocalIncident] = useState<Incident>(incident);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Focus close button on open
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Sync local incident with prop
  useEffect(() => {
    setLocalIncident(incident);
  }, [incident]);

  const handleFieldChange = useCallback((field: keyof Incident, value: any) => {
    setLocalIncident(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'flag':
        toast.success('Flag added');
        break;
      case 'clone':
        toast.success('Issue cloned');
        break;
      case 'move':
        toast.info('Move dialog opened');
        break;
      case 'archive':
        toast.success('Issue archived');
        break;
      case 'delete':
        toast.error('Issue deleted');
        onClose();
        break;
      case 'print':
        window.print();
        break;
      case 'excel':
        toast.success('Exported to Excel');
        break;
      case 'word':
        toast.success('Exported to Word');
        break;
    }
  }, [onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1000] flex justify-center items-start pt-8 overflow-y-auto"
      style={{ background: 'rgba(9, 30, 66, 0.54)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={cn(
          "bg-white rounded-lg shadow-2xl w-full flex flex-col relative",
          "max-h-[calc(100vh-64px)]",
          isExpanded ? "max-w-[calc(100vw-64px)]" : "max-w-[1000px]"
        )}
        style={{ 
          boxShadow: '0 0 0 1px rgba(9, 30, 66, 0.08), 0 2px 1px rgba(9, 30, 66, 0.08), 0 0 20px -6px rgba(9, 30, 66, 0.31)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#DFE1E6] shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#42526E]">
            {parentIncidentId && (
              <>
                <a href="#" className="flex items-center gap-1 hover:text-[#0052CC] hover:underline">
                  <span className="text-sm">◇</span>
                  <span>{parentIncidentId}</span>
                </a>
                <span className="text-[#A5ADBA]">/</span>
              </>
            )}
            <a href="#" className="flex items-center gap-1 hover:text-[#0052CC] hover:underline">
              <span className="text-sm">▢</span>
              <span>{incident.id}</span>
            </a>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1">
            <button 
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] hover:text-[#172B4D]"
              title="Watch"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button 
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] hover:text-[#172B4D]"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            
            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] hover:text-[#172B4D]"
                  title="More actions"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border-[#DFE1E6]">
                <DropdownMenuItem onClick={() => handleMenuAction('flag')} className="text-[#172B4D] hover:bg-[#F4F5F7]">
                  <Flag className="w-4 h-4 mr-2 text-[#42526E]" />
                  Add flag
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('clone')} className="text-[#172B4D] hover:bg-[#F4F5F7]">
                  <Copy className="w-4 h-4 mr-2 text-[#42526E]" />
                  Clone
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('move')} className="text-[#172B4D] hover:bg-[#F4F5F7]">
                  <Move className="w-4 h-4 mr-2 text-[#42526E]" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('archive')} className="text-[#172B4D] hover:bg-[#F4F5F7]">
                  <Archive className="w-4 h-4 mr-2 text-[#42526E]" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('delete')} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#DFE1E6]" />
                <DropdownMenuItem onClick={() => handleMenuAction('print')} className="text-[#172B4D] hover:bg-[#F4F5F7]">
                  <Printer className="w-4 h-4 mr-2 text-[#42526E]" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('excel')} className="text-[#172B4D] hover:bg-[#F4F5F7]">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-[#42526E]" />
                  Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('word')} className="text-[#172B4D] hover:bg-[#F4F5F7]">
                  <FileText className="w-4 h-4 mr-2 text-[#42526E]" />
                  Export Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button 
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] hover:text-[#172B4D]"
              title={isExpanded ? "Collapse" : "Expand"}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button 
              ref={closeButtonRef}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] hover:text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#C69C6D] focus:ring-offset-2"
              title="Close"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Two Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <IncidentModalMain 
            incident={localIncident} 
            onFieldChange={handleFieldChange}
          />

          {/* Sidebar */}
          <IncidentModalSidebar 
            incident={localIncident}
            onFieldChange={handleFieldChange}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
