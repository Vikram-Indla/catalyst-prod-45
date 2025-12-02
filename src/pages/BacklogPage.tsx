import { useState, useEffect } from 'react';
import { BacklogHeader } from '@/components/backlog/BacklogHeader';
import { BacklogSection } from '@/components/backlog/BacklogSection';
import { ContextMenu } from '@/components/backlog/ContextMenu';
import { PrioritizeModal } from '@/components/backlog/PrioritizeModal';
import { MoveToPositionModal } from '@/components/backlog/MoveToPositionModal';
import { DetailPanel } from '@/components/backlog/DetailPanel/DetailPanel';
import { ColumnConfig } from '@/components/backlog/ColumnsDropdown';
import { LabelConfig } from '@/components/backlog/LabelsDropdown';
import { ApplyWSJFToRankDialog } from '@/components/prioritization/ApplyWSJFToRankDialog';
import { PullRankDialog } from '@/components/backlog/PullRankDialog';
import { VIEWING_OPTIONS, BACKLOG_SECTIONS, PROGRAMS } from '@/data/backlogSeedData';
import { EPIC_DETAILS } from '@/data/epicDetailData';
import { BacklogSection as BacklogSectionType, Epic } from '@/types/backlog.types';
import { toast } from 'sonner';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'epic', label: 'Epic', visible: true, default: true },
  { id: 'points', label: 'Points', visible: true, default: true },
  { id: 'mvp', label: 'MVP', visible: true, default: true },
  { id: 'processStep', label: 'Process Step', visible: true, default: true },
  { id: 'program', label: 'Program', visible: false, default: false },
  { id: 'schedule', label: 'Schedule', visible: false, default: false },
];

const DEFAULT_LABEL_CONFIG: LabelConfig = {
  displayMode: 'abbreviated',
  showPITags: true,
  showCustomLabels: true,
  showThemeLabels: false,
};

export default function BacklogPage() {
  const [selectedViewingId, setSelectedViewingId] = useState('epic');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'kanban' | 'unassigned'>('list');
  const [sections, setSections] = useState<BacklogSectionType[]>(BACKLOG_SECTIONS);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [expandedEpicIds, setExpandedEpicIds] = useState<Set<string>>(new Set());
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [labelConfig, setLabelConfig] = useState<LabelConfig>(DEFAULT_LABEL_CONFIG);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetEpic: Epic | null;
    targetSection: string | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    targetEpic: null,
    targetSection: null,
  });

  // Prioritize modal state
  const [prioritizeModal, setPrioritizeModal] = useState<{
    isOpen: boolean;
    sectionId: string | null;
  }>({ isOpen: false, sectionId: null });

  // Move to position modal state
  const [moveToPositionModal, setMoveToPositionModal] = useState<{
    isOpen: boolean;
    epic: Epic | null;
    currentPosition: number;
    totalItems: number;
  }>({ isOpen: false, epic: null, currentPosition: 0, totalItems: 0 });

  // Drag state
  const [dragState, setDragState] = useState<{
    draggedEpic: Epic | null;
    draggedFromSection: string | null;
  }>({ draggedEpic: null, draggedFromSection: null });

  // Detail panel state
  const [detailPanelState, setDetailPanelState] = useState<{
    isOpen: boolean;
    epicId: string | null;
    activeTab: string;
    hasChanges: boolean;
  }>({ isOpen: false, epicId: null, activeTab: 'details', hasChanges: false });

  // WSJF and Pull Rank dialogs
  const [wsjfDialogOpen, setWsjfDialogOpen] = useState(false);
  const [pullRankDialogOpen, setPullRankDialogOpen] = useState(false);


  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedEpicId) return;

      const allEpics = sections.flatMap(s => s.items);
      const currentIndex = allEpics.findIndex(e => e.id === selectedEpicId);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setSelectedEpicId(allEpics[currentIndex - 1].id);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < allEpics.length - 1) {
            setSelectedEpicId(allEpics[currentIndex + 1].id);
          }
          break;
        case 'Escape':
          setSelectedEpicId(null);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEpicId, sections]);

  const handleToggleExpand = (sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, isExpanded: !section.isExpanded }
        : section
    ));
  };

  const handleToggleEpicExpand = (epicId: string) => {
    setExpandedEpicIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(epicId)) {
        newSet.delete(epicId);
      } else {
        newSet.add(epicId);
      }
      return newSet;
    });
  };

  const handleAddEpic = (title: string, programId: string) => {
    toast.success(`Epic "${title}" added to program ${programId}`);
  };

  const handleEpicClick = (epicId: string) => {
    setSelectedEpicId(epicId);
    // Open detail panel
    setDetailPanelState({
      isOpen: true,
      epicId,
      activeTab: 'details',
      hasChanges: false,
    });
  };

  const handleDragStart = (e: React.DragEvent, epic: Epic, sectionId: string) => {
    setDragState({ draggedEpic: epic, draggedFromSection: sectionId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, epicId: string, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetEpicId: string, targetSectionId: string) => {
    e.preventDefault();
    if (!dragState.draggedEpic) return;

    toast.success(`Moved epic "${dragState.draggedEpic.title}" to new position`);
    setDragState({ draggedEpic: null, draggedFromSection: null });
  };

  const handleContextMenu = (e: React.MouseEvent, epic: Epic, sectionId: string) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetEpic: epic,
      targetSection: sectionId,
    });
  };

  const handleContextMenuAction = (actionId: string) => {
    const { targetEpic, targetSection } = contextMenu;
    if (!targetEpic || !targetSection) return;

    const section = sections.find(s => s.id === targetSection);
    const totalItems = section?.itemCount || 0;

    switch (actionId) {
      case 'open-tab':
        window.open(`/epic/${targetEpic.id}`, '_blank');
        break;
      case 'duplicate':
        toast.success(`Duplicated epic "${targetEpic.title}"`);
        break;
      case 'move-top':
        toast.success(`Moved epic "${targetEpic.title}" to top`);
        break;
      case 'move-bottom':
        toast.success(`Moved epic "${targetEpic.title}" to bottom`);
        break;
      case 'move-position':
        setMoveToPositionModal({
          isOpen: true,
          epic: targetEpic,
          currentPosition: targetEpic.rank,
          totalItems,
        });
        break;
      case 'recycle-bin':
        toast.success(`Moved epic "${targetEpic.title}" to recycle bin`);
        break;
      case 'parking-lot':
        toast.success(`Moved epic "${targetEpic.title}" to parking lot`);
        break;
      default:
        if (actionId.startsWith('pi-')) {
          toast.success(`Moved epic "${targetEpic.title}" to ${actionId}`);
        }
    }

    setContextMenu({ ...contextMenu, isOpen: false });
  };

  const handlePrioritize = (sectionId: string) => {
    setPrioritizeModal({ isOpen: true, sectionId });
  };

  const handleExport = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Create CSV content
    const headers = ['Rank', 'ID', 'Title', 'Status', 'Points', 'MVP', 'Process Step'];
    const rows = section.items.map(epic => [
      epic.rank,
      epic.numericId,
      epic.title,
      epic.status,
      epic.points,
      epic.mvp ? 'Yes' : 'No',
      epic.processStep,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${section.title.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${section.title} to CSV`);
  };

  const visibleColumns = columnConfig.filter(c => c.visible).map(c => c.id);

  const contextMenuItems = [
    { id: 'open-tab', label: 'Open in new tab' },
    { id: 'duplicate', label: 'Duplicate', dividerAfter: true },
    { id: 'move-top', label: 'Move To Top' },
    { id: 'move-bottom', label: 'Move To Bottom' },
    { id: 'move-position', label: 'Move To Position', dividerAfter: true },
    { id: 'recycle-bin', label: 'Move to Recycle Bin', destructive: true },
    { id: 'parking-lot', label: 'Move to Parking Lot' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <BacklogHeader 
        viewingOptions={VIEWING_OPTIONS}
        selectedViewingId={selectedViewingId}
        onViewingSelect={setSelectedViewingId}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeView={activeView}
        onViewChange={setActiveView}
        columnConfig={columnConfig}
        onColumnConfigChange={setColumnConfig}
        labelConfig={labelConfig}
        onLabelConfigChange={setLabelConfig}
        onApplyWSJF={() => setWsjfDialogOpen(true)}
        onPullRank={() => setPullRankDialogOpen(true)}
      />

      <div className="px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s6)]">
        <h2 className="text-2xl font-semibold text-[#172B4D] mb-[var(--s6)]">
          All Programs for Digital Services
        </h2>

        {sections.map((section) => (
          <BacklogSection 
            key={section.id}
            section={section}
            programs={PROGRAMS}
            selectedEpicId={selectedEpicId}
            expandedEpicIds={expandedEpicIds}
            visibleColumns={visibleColumns}
            labelConfig={labelConfig}
            onToggleExpand={handleToggleExpand}
            onToggleEpicExpand={handleToggleEpicExpand}
            onAddEpic={handleAddEpic}
            onEpicClick={handleEpicClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onContextMenu={handleContextMenu}
            onPrioritize={handlePrioritize}
            onExport={handleExport}
            onLabelConfigChange={setLabelConfig}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
          onAction={handleContextMenuAction}
        />
      )}

      {/* Prioritize Modal */}
      {prioritizeModal.isOpen && prioritizeModal.sectionId && (
        <PrioritizeModal
          sectionTitle={sections.find(s => s.id === prioritizeModal.sectionId)?.title || ''}
          items={sections.find(s => s.id === prioritizeModal.sectionId)?.items || []}
          onClose={() => setPrioritizeModal({ isOpen: false, sectionId: null })}
          onSave={(reorderedItems) => {
            toast.success('Priority order saved');
          }}
        />
      )}

      {/* Move To Position Modal */}
      {moveToPositionModal.isOpen && moveToPositionModal.epic && (
        <MoveToPositionModal
          currentPosition={moveToPositionModal.currentPosition}
          totalItems={moveToPositionModal.totalItems}
          onClose={() => setMoveToPositionModal({ ...moveToPositionModal, isOpen: false })}
          onMove={(newPosition) => {
            toast.success(`Moved epic to position ${newPosition}`);
          }}
        />
      )}

      {/* Detail Panel */}
      <DetailPanel
        epic={detailPanelState.epicId ? EPIC_DETAILS[detailPanelState.epicId] : null}
        isOpen={detailPanelState.isOpen}
        activeTab={detailPanelState.activeTab}
        onTabChange={(tabId) => setDetailPanelState({ ...detailPanelState, activeTab: tabId })}
        onClose={() => setDetailPanelState({ ...detailPanelState, isOpen: false })}
        onSave={() => {
          toast.success('Changes saved');
          setDetailPanelState({ ...detailPanelState, hasChanges: false });
        }}
        hasChanges={detailPanelState.hasChanges}
      />

      {/* WSJF and Pull Rank Dialogs */}
      <ApplyWSJFToRankDialog
        open={wsjfDialogOpen}
        onOpenChange={setWsjfDialogOpen}
        workItemType="epic"
      />

      <PullRankDialog
        open={pullRankDialogOpen}
        onOpenChange={setPullRankDialogOpen}
        workItemType="epic"
        currentItemId={selectedEpicId || undefined}
      />
    </div>
  );
}