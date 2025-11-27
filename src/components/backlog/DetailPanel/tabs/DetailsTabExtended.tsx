import { useState } from 'react';
import { DescriptionEditor } from '../DescriptionEditor';
import { FormSelect } from '../FormSelect';
import { TagsInput } from '../TagsInput';
import { ProgressIndicators } from '../ProgressIndicators';
import { QuickActions } from '../QuickActions';
import { ContainedInLink } from '../ContainedInLink';
import { EpicDetail, Program, User, Theme, ProgramIncrement } from '@/types/backlog.types';
import { EPIC_TYPES, MVP_OPTIONS } from '@/data/epicDetailData';
import { ChevronRight, ChevronDown, Plus, X, Info } from 'lucide-react';
import { WSJFModal } from '../modals/WSJFModal';

interface DetailsTabExtendedProps {
  epic: EpicDetail;
  programs: Program[];
  users: User[];
  themes: Theme[];
  onUpdate: (updates: Partial<EpicDetail>) => void;
}

export function DetailsTabExtended({ epic, programs, users, themes, onUpdate }: DetailsTabExtendedProps) {
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(true);
  const [isWSJFModalOpen, setIsWSJFModalOpen] = useState(false);
  const [selectedWSJFPI, setSelectedWSJFPI] = useState<string | null>(null);

  const handleWSJFClick = (piId: string) => {
    setSelectedWSJFPI(piId);
    setIsWSJFModalOpen(true);
  };

  const handleWSJFUpdate = (piId: string, updates: any) => {
    const updatedScores = epic.wsjfScores.map(score => 
      score.piId === piId ? { ...score, ...updates } : score
    );
    onUpdate({ wsjfScores: updatedScores });
  };

  return (
    <>
      <div className="grid grid-cols-[1fr_280px] gap-6 p-6">
        {/* Main Column */}
        <div className="flex flex-col gap-5">
          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="text-[8px] text-destructive">■</span>
              Description: <span className="font-normal text-muted-foreground/70">(click to edit)</span>
            </label>
            <DescriptionEditor initialValue={epic.description} />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="text-[8px] text-destructive">■</span>
              Type:
            </label>
            <FormSelect
              value={epic.type}
              options={EPIC_TYPES.map(t => ({ value: t, label: t }))}
              onChange={() => {}}
            />
          </div>

          {/* MVP */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground">MVP:</label>
            <FormSelect
              value={epic.mvp ? 'Yes' : 'No'}
              options={MVP_OPTIONS.map(o => ({ value: o, label: o }))}
              onChange={() => {}}
            />
          </div>

          {/* Contained In */}
          {epic.containedIn && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Contained In:</label>
              <ContainedInLink
                id={epic.containedIn.id}
                name={epic.containedIn.name}
                type={epic.containedIn.type}
              />
            </div>
          )}

          {/* Primary Program */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="text-[8px] text-destructive">■</span>
              Primary Program:
            </label>
            <div className="flex items-center gap-2">
              <FormSelect
                value={epic.primaryProgram?.id || ''}
                options={programs.map(p => ({ value: p.id, label: p.name }))}
                onChange={() => {}}
              />
              <button className="p-2 text-primary hover:bg-primary/10 rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Additional Programs */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Additional Programs:</label>
            <TagsInput
              tags={epic.additionalPrograms}
              onRemove={() => {}}
              onAdd={() => {}}
            />
          </div>

          {/* Owner */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Owner:</label>
            <FormSelect
              value={epic.owner?.id || ''}
              options={users.map(u => ({ value: u.id, label: u.name }))}
              onChange={() => {}}
            />
          </div>

          {/* Theme */}
          {epic.theme && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Theme:</label>
              <FormSelect
                value={epic.theme.id}
                options={themes.map(t => ({ value: t.id, label: t.name }))}
                onChange={() => {}}
              />
            </div>
          )}

          {/* Program Increments */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Program Increments:</label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded min-h-[40px]">
              {epic.programIncrements.map((pi) => (
                <div key={pi.id} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs text-foreground">
                  <span>{pi.name}</span>
                  <button className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* WSJF Prioritization Rows */}
          <div className="flex flex-col gap-2 pt-4 border-t border-border">
            {epic.wsjfScores.map((score) => (
              <div key={score.piId} className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">{score.piName} WSJF Prioritization:</span>
                <div
                  onClick={() => handleWSJFClick(score.piId)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-muted group"
                  title="Use the WSJF method to prioritize work"
                >
                  <span className="text-lg">📊</span>
                  <span className="text-sm font-semibold text-foreground">{score.score}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Estimates */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                Initial Estimate (Points): <Info className="w-3.5 h-3.5" />
              </label>
              <input
                type="number"
                value={epic.initialEstimate || ''}
                className="w-24 px-3 py-1.5 text-sm text-right bg-background border border-border rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {epic.piEstimates.map((estimate) => (
              <div key={estimate.piId} className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">{estimate.piName} Estimate (Points):</label>
                <input
                  type="number"
                  value={estimate.points}
                  className="w-24 px-3 py-1.5 text-sm text-right bg-background border border-border rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-semibold text-foreground">Total Estimate:</span>
              <span className="text-sm font-semibold text-foreground">{epic.totalEstimate}</span>
            </div>
          </div>

          {/* Full Details Divider */}
          <div className="flex items-center gap-2 py-4 text-sm text-primary cursor-pointer hover:text-primary/80">
            <Plus className="w-4 h-4" />
            <span>Full Details</span>
          </div>

          {/* Features Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div
              onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
              className="flex items-center gap-2 px-4 py-3 bg-muted cursor-pointer hover:bg-muted/80"
            >
              {isFeaturesExpanded ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold text-foreground">Features ({epic.features.length})</span>
            </div>
            
            {isFeaturesExpanded && (
              <div className="p-4">
                {/* Add Feature Form */}
                <div className="grid grid-cols-[1fr_80px_140px_120px_auto] gap-2 mb-4">
                  <input placeholder="Add Feature" className="px-3 py-2 text-sm bg-background border border-border rounded" />
                  <input placeholder="Points" className="px-3 py-2 text-sm bg-background border border-border rounded" />
                  <select className="px-3 py-2 text-sm bg-background border border-border rounded">
                    <option>0 - Pending Ap...</option>
                  </select>
                  <select className="px-3 py-2 text-sm bg-background border border-border rounded">
                    <option>Mobile</option>
                  </select>
                  <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Add</button>
                </div>

                {/* Search */}
                <input
                  placeholder="Search existing Features (type the ID, External ID or Name you are...)"
                  className="w-full px-3 py-2 mb-4 text-sm bg-background border border-border rounded"
                />

                {/* Features Table */}
                <div className="border border-border rounded overflow-hidden">
                  <div className="grid grid-cols-[70px_70px_1fr_120px_40px] gap-2 px-4 py-2 bg-muted text-xs font-medium text-muted-foreground uppercase">
                    <div>ID</div>
                    <div>Ext ID</div>
                    <div>Title</div>
                    <div>Progress</div>
                    <div></div>
                  </div>
                  {epic.features.map((feature) => (
                    <div key={feature.id} className="grid grid-cols-[70px_70px_1fr_120px_40px] gap-2 px-4 py-3 border-t border-border hover:bg-muted/50 items-center">
                      <div className="text-sm text-foreground">{feature.numericId}</div>
                      <div className="text-sm text-muted-foreground">{feature.externalId || ''}</div>
                      <div className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
                        <span>📋</span>
                        {feature.title}
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${feature.progressPercent}%`,
                            backgroundColor: feature.progressPercent >= 70 ? '#36B37E' : '#DE350B'
                          }}
                        />
                      </div>
                      <button className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Column */}
        <div className="flex flex-col gap-5">
          <ProgressIndicators epic={epic} />
          <QuickActions discussionCount={epic.discussionCount} />
        </div>
      </div>

      {/* WSJF Modal */}
      <WSJFModal
        isOpen={isWSJFModalOpen}
        onClose={() => setIsWSJFModalOpen(false)}
        epicId={epic.numericId.toString()}
        epicTitle={epic.title}
        wsjfScores={epic.wsjfScores}
        onUpdate={handleWSJFUpdate}
      />
    </>
  );
}