import { BacklogSection as BacklogSectionType, Program } from '@/types/backlog.types';
import { QuickAddRow } from './QuickAddRow';
import { ColumnHeaders } from './ColumnHeaders';
import { EpicRow } from './EpicRow';
import { PIProgressBar } from './PIProgressBar';
import { Minus, Plus, Move } from 'lucide-react';

interface BacklogSectionProps {
  section: BacklogSectionType;
  programs: Program[];
  onToggleExpand: (sectionId: string) => void;
  onAddEpic: (title: string, programId: string) => void;
  onEpicClick: (epicId: string) => void;
}

export function BacklogSection({ 
  section, 
  programs, 
  onToggleExpand, 
  onAddEpic, 
  onEpicClick 
}: BacklogSectionProps) {
  return (
    <div className="mx-6 mb-4 border border-[#DFE1E6] rounded bg-white">
      {/* Section Header */}
      <div 
        className="flex items-center px-4 py-3 bg-white hover:bg-[#F4F5F7] cursor-pointer select-none transition-colors"
        onClick={() => onToggleExpand(section.id)}
      >
        <div className="w-5 h-5 flex items-center justify-center text-[#0052CC] mr-2">
          {section.isExpanded ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </div>
        
        <h3 className="text-sm font-semibold text-[#172B4D]">{section.title}</h3>
        
        <span className="ml-6 text-sm text-[#6B778C]">
          Total Items: <span className="text-[#0052CC] font-semibold">{section.itemCount}</span>
        </span>

        <div className="ml-auto flex items-center gap-4">
          <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-[#6B778C] hover:bg-[#EBECF0] hover:text-[#172B4D] rounded transition-colors">
            <span>⚡</span>
            Prioritize
          </button>
          
          <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-[#6B778C] hover:bg-[#EBECF0] hover:text-[#172B4D] rounded transition-colors">
            <span>📤</span>
            Export
          </button>

          {section.type === 'assigned' && section.progress !== undefined && (
            <PIProgressBar progress={section.progress} />
          )}
        </div>
      </div>

      {/* Section Content */}
      {section.isExpanded && (
        <>
          {section.items.length === 0 ? (
            <div className="flex items-center justify-center py-12 border-t border-[#EBECF0]">
              <div className="flex items-center gap-2 text-sm text-[#6B778C]">
                <Move className="w-5 h-5" />
                Drag & Drop Items Here
              </div>
            </div>
          ) : (
            <>
              <QuickAddRow programs={programs} onAdd={onAddEpic} />
              <ColumnHeaders />
              {section.items.map((epic) => (
                <EpicRow key={epic.id} epic={epic} onEpicClick={onEpicClick} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
