import { useEffect } from 'react';
import { PanelHeader } from './PanelHeader';
import { PanelTabs } from './PanelTabs';
import { DetailsTab } from './DetailsTab';
import { EpicDetail } from '@/types/backlog.types';

interface DetailPanelProps {
  epic: EpicDetail | null;
  isOpen: boolean;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onClose: () => void;
  onSave: () => void;
  hasChanges: boolean;
}

export function DetailPanel({
  epic,
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  onSave,
  hasChanges,
}: DetailPanelProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!epic) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-[rgba(9,30,66,0.54)] z-[900] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[720px] bg-background shadow-[-4px_0_24px_rgba(0,0,0,0.15)] z-[1000] flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <PanelHeader
          epic={epic}
          onClose={onClose}
          onSave={onSave}
          hasChanges={hasChanges}
        />

        <PanelTabs activeTab={activeTab} onTabChange={onTabChange} />

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && <DetailsTab epic={epic} />}
          {activeTab === 'design' && (
            <div className="p-6 text-muted-foreground">Design tab content coming soon...</div>
          )}
          {activeTab === 'intake' && (
            <div className="p-6 text-muted-foreground">Intake tab content coming soon...</div>
          )}
          {activeTab === 'benefits' && (
            <div className="p-6 text-muted-foreground">Benefits tab content coming soon...</div>
          )}
          {activeTab === 'value' && (
            <div className="p-6 text-muted-foreground">Value tab content coming soon...</div>
          )}
          {activeTab === 'milestones' && (
            <div className="p-6 text-muted-foreground">Milestones tab content coming soon...</div>
          )}
          {activeTab === 'spend' && (
            <div className="p-6 text-muted-foreground">Spend tab content coming soon...</div>
          )}
          {activeTab === 'forecast' && (
            <div className="p-6 text-muted-foreground">Forecast tab content coming soon...</div>
          )}
          {activeTab === 'links' && (
            <div className="p-6 text-muted-foreground">Links tab content coming soon...</div>
          )}
        </div>
      </div>
    </>
  );
}
