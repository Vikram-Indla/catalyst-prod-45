import { useEffect, useState } from 'react';
import { PanelHeader } from './PanelHeader';
import { PanelTabs } from './PanelTabs';
import { DetailsTab } from './DetailsTab';
import { DesignTab } from './tabs/DesignTab';
import { IntakeTab } from './tabs/IntakeTab';
import { BenefitsTab } from './tabs/BenefitsTab';
import { ValueTab } from './tabs/ValueTab';
import { MilestonesTab } from './tabs/MilestonesTab';
import { SpendTab } from './tabs/SpendTab';
import { EpicForecastTab } from '@/components/epic-backlog/EpicForecastTab';
import { LinksTab } from './tabs/LinksTab';
import { WSJFModal } from './modals/WSJFModal';
import { EpicDetail, WSJFScore } from '@/types/backlog.types';
import { Button } from '@/components/ui/button';
import { useUpdateWSJF } from '@/hooks/useWSJF';

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
  const [showWSJFModal, setShowWSJFModal] = useState(false);
  const updateWSJF = useUpdateWSJF();

  // WSJF scores - empty until populated from database
  const wsjfScores: WSJFScore[] = [];

  const handleWSJFUpdate = (piId: string, updates: Partial<WSJFScore>) => {
    if (!epic) return;
    
    const field = Object.keys(updates)[0];
    const value = Object.values(updates)[0] as number;
    
    updateWSJF.mutate({
      epicId: epic.id,
      piId,
      field,
      value,
    });
  };

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
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[720px] bg-background shadow-[-4px_0_24px_rgba(0,0,0,0.15)] z-[1000] flex flex-col transition-transform duration-300 ${
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
          {activeTab === 'design' && <DesignTab />}
          {activeTab === 'intake' && (
            <IntakeTab 
              fields={[
                { id: '1', number: 1, label: 'Business Need', value: '', required: false },
                { id: '2', number: 2, label: 'Expected Outcome', value: '', required: false },
                { id: '3', number: 3, label: 'Success Criteria', value: '', required: false },
              ]}
              onFieldChange={() => {}}
            />
          )}
          {activeTab === 'benefits' && <BenefitsTab />}
          {activeTab === 'value' && (
            <ValueTab 
              fields={[
                { 
                  id: '1', 
                  number: 1, 
                  label: 'Time Criticality', 
                  value: 'Medium', 
                  options: ['Low', 'Medium', 'High'], 
                  score: 50 
                },
                { 
                  id: '2', 
                  number: 2, 
                  label: 'Business Value', 
                  value: 'High', 
                  options: ['Low', 'Medium', 'High'], 
                  score: 75 
                },
              ]} 
              valueScore={65}
              onFieldChange={() => {}}
            />
          )}
          {activeTab === 'milestones' && (
            <MilestonesTab 
              milestones={[]}
              onAddMilestone={() => {}}
              onUpdateMilestone={() => {}}
            />
          )}
          {activeTab === 'spend' && (
            <SpendTab 
              budget={100000}
              acceptedSpend={25000}
              forecastedSpend={80000}
              estimatedSpend={90000}
              remaining={75000}
              acceptedStories={[]}
            />
          )}
          {activeTab === 'forecast' && <EpicForecastTab epicId={epic.id} />}
          {activeTab === 'links' && <LinksTab />}
          {activeTab === 'wsjf' && (
            <div className="px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s6)]">
              <Button 
                onClick={() => setShowWSJFModal(true)}
                variant="outline"
                className="w-full"
              >
                Configure WSJF Scores
              </Button>
            </div>
          )}
        </div>
      </div>

      <WSJFModal
        isOpen={showWSJFModal}
        onClose={() => setShowWSJFModal(false)}
        epicId={epic.id}
        epicTitle={epic.title}
        wsjfScores={wsjfScores}
        onUpdate={handleWSJFUpdate}
      />
    </>
  );
}
