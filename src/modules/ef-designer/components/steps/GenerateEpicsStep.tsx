import React, { useState } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDAtoms, useEFDEpics } from '../../hooks/useEFDSession';
import { useGenerateEpics } from '../../hooks/useEFDAI';
import { useUpdateEpic, useToggleEpicSelection } from '../../hooks/useEFDMutations';
import { Sparkles, Loader2, CheckCircle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EditableEpicCard } from '../epics/EditableEpicCard';

export const GenerateEpicsStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: atoms = [] } = useEFDAtoms(session.id);
  const { data: epics = [], refetch } = useEFDEpics(session.id);
  const generateEpics = useGenerateEpics();
  const updateEpic = useUpdateEpic();
  const toggleEpicSelection = useToggleEpicSelection();
  const [progress, setProgress] = useState(0);

  const selectedAtoms = atoms.filter((a: any) => a.is_selected !== false && a.status !== 'excluded');

  const handleGenerate = async () => {
    if (selectedAtoms.length === 0) return;

    setProgress(10);
    
    try {
      await generateEpics.mutateAsync({
        sessionId: session.id,
        atoms: selectedAtoms.map((a: any) => ({
          id: a.atom_key,
          text: a.text,
          type: a.type,
          priority: a.priority,
        })),
      });
      setProgress(100);
      refetch();
    } catch (error) {
      setProgress(0);
    }
  };

  const handleUpdateEpic = (epicId: string, updates: Record<string, any>) => {
    updateEpic.mutate({ epicId, updates });
  };

  const handleToggleSelection = (epicId: string, selected: boolean) => {
    toggleEpicSelection.mutate({ epicId, isSelected: selected });
  };

  const isGenerating = generateEpics.isPending;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Generate Epics</h2>
        <p className="text-muted-foreground">
          AI will group your {selectedAtoms.length} requirements into SAFe Epics.
        </p>
      </div>

      {/* Generate Action */}
      {epics.length === 0 && !isGenerating && (
        <div className="border rounded-xl p-8 text-center bg-gradient-to-br from-violet-500/5 to-violet-500/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 mb-4">
            <Layers className="h-8 w-8 text-violet-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Generate SAFe Epics</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            The AI will analyze your requirements and create cohesive Epics 
            with hypotheses, acceptance criteria, and sizing.
          </p>
          <Button size="lg" onClick={handleGenerate} disabled={selectedAtoms.length === 0}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Epics from {selectedAtoms.length} Requirements
          </Button>
          {selectedAtoms.length === 0 && (
            <p className="text-sm text-amber-600 mt-3">Parse requirements first</p>
          )}
        </div>
      )}

      {/* Progress */}
      {isGenerating && (
        <div className="border rounded-xl p-8 bg-card">
          <div className="flex items-center gap-4 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            <div>
              <h3 className="font-semibold">Generating Epics...</h3>
              <p className="text-sm text-muted-foreground">Analyzing and grouping requirements</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Results */}
      {epics.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold">{epics.length} Epics Generated</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>

          <div className="grid gap-4">
            {epics.map((epic: any) => (
              <EditableEpicCard
                key={epic.id}
                epic={epic}
                onUpdate={handleUpdateEpic}
                onToggleSelection={handleToggleSelection}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};