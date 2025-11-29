import { BacklogSection as BacklogSectionType, Epic, Program } from '@/types/backlog.types';
import { QuickAddRow } from './QuickAddRow';
import { ColumnHeaders } from './ColumnHeaders';
import { EpicRow } from './EpicRow';
import { PIProgressBar } from './PIProgressBar';
import { LabelsDropdown, LabelConfig } from './LabelsDropdown';
import { Minus, Plus, Move, Zap, Upload } from 'lucide-react';

interface BacklogSectionProps {
  section: BacklogSectionType;
  programs: Program[];
  selectedEpicId: string | null;
  expandedEpicIds: Set<string>;
  visibleColumns: string[];
  labelConfig: LabelConfig;
  onToggleExpand: (sectionId: string) => void;
  onToggleEpicExpand: (epicId: string) => void;
  onAddEpic: (title: string, programId: string) => void;
  onEpicClick: (epicId: string) => void;
  onDragStart: (e: React.DragEvent, epic: Epic, sectionId: string) => void;
  onDragOver: (e: React.DragEvent, epicId: string, sectionId: string) => void;
  onDrop: (e: React.DragEvent, epicId: string, sectionId: string) => void;
  onContextMenu: (e: React.MouseEvent, epic: Epic, sectionId: string) => void;
  onPrioritize: (sectionId: string) => void;
  onExport: (sectionId: string) => void;
  onLabelConfigChange: (config: LabelConfig) => void;
}

export function BacklogSection({ 
  section, 
  programs, 
  selectedEpicId,
  expandedEpicIds,
  visibleColumns,
  labelConfig,
  onToggleExpand,
  onToggleEpicExpand,
  onAddEpic, 
  onEpicClick,
  onDragStart,
  onDragOver,
  onDrop,
  onContextMenu,
  onPrioritize,
  onExport,
  onLabelConfigChange
}: BacklogSectionProps) {
  return (
    <div className="mx-6 mb-4 border rounded bg-card">
      {/* Section Header */}
      <div 
        className="flex items-center px-4 py-3 bg-card hover:bg-accent cursor-pointer select-none transition-colors"
        onClick={() => onToggleExpand(section.id)}
      >
        <div className="w-5 h-5 flex items-center justify-center text-primary mr-2">
          {section.isExpanded ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </div>
        
        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
        
        <span className="ml-6 text-sm text-muted-foreground">
          Total Items: <span className="text-primary font-semibold">{section.itemCount}</span>
        </span>

        <div className="ml-auto flex items-center gap-4">
          <button 
            className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onPrioritize(section.id);
            }}
          >
            <Zap className="w-4 h-4" />
            Prioritize
          </button>
          
          <button 
            className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onExport(section.id);
            }}
          >
            <Upload className="w-4 h-4" />
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
            <div className="flex items-center justify-center py-12 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Move className="w-5 h-5" />
                Drag & Drop Items Here
              </div>
            </div>
          ) : (
            <>
              <QuickAddRow programs={programs} onAdd={onAddEpic} />
              <LabelsDropdown 
                config={labelConfig}
                onChange={onLabelConfigChange}
              />
              <ColumnHeaders />
              {section.items.map((epic) => (
                <EpicRow 
                  key={epic.id} 
                  epic={epic}
                  isSelected={selectedEpicId === epic.id}
                  isExpanded={expandedEpicIds.has(epic.id)}
                  visibleColumns={visibleColumns}
                  labelDisplayMode={labelConfig.displayMode}
                  onEpicClick={onEpicClick}
                  onToggleExpand={onToggleEpicExpand}
                  onDragStart={(e) => onDragStart(e, epic, section.id)}
                  onDragOver={(e) => onDragOver(e, epic.id, section.id)}
                  onDrop={(e) => onDrop(e, epic.id, section.id)}
                  onContextMenu={(e) => onContextMenu(e, epic, section.id)}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}