import React, { useState } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDAtoms, useEFDEpics, useEFDFeatures } from '../../hooks/useEFDSession';
import { useGenerateFeatures } from '../../hooks/useEFDAI';
import { useUpdateFeature } from '../../hooks/useEFDMutations';
import { Sparkles, Loader2, CheckCircle, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EditableFeatureCard } from '../features/EditableFeatureCard';

export const GenerateFeaturesStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: atoms = [] } = useEFDAtoms(session.id);
  const { data: epics = [] } = useEFDEpics(session.id);
  const { data: features = [], refetch } = useEFDFeatures(session.id);
  const generateFeatures = useGenerateFeatures();
  const updateFeature = useUpdateFeature();
  const [progress, setProgress] = useState(0);

  const selectedEpics = epics.filter((e: any) => e.is_selected_for_features);

  const handleGenerate = async () => {
    if (selectedEpics.length === 0) return;

    setProgress(10);
    
    try {
      await generateFeatures.mutateAsync({
        sessionId: session.id,
        epics: selectedEpics.map((e: any) => ({
          key: e.epic_key,
          title: e.name,
          description: e.description,
        })),
        atoms: atoms.map((a: any) => ({
          id: a.atom_key,
          text: a.text,
          type: a.type,
        })),
      });
      setProgress(100);
      refetch();
    } catch (error) {
      setProgress(0);
    }
  };

  const handleUpdateFeature = (featureId: string, updates: Record<string, any>) => {
    updateFeature.mutate({ featureId, updates });
  };

  const isGenerating = generateFeatures.isPending;

  // Group features by epic
  const featuresByEpic = features.reduce((acc: any, feature: any) => {
    const key = feature.parent_epic_key || feature.epic_id || 'unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(feature);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Generate Features</h2>
        <p className="text-muted-foreground">
          Decompose your {selectedEpics.length} Epics into deliverable Features.
        </p>
      </div>

      {/* Generate Action */}
      {features.length === 0 && !isGenerating && (
        <div className="border rounded-xl p-8 text-center bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
            <GitBranch className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Generate SAFe Features</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            The AI will break down each Epic into PI-sized Features with benefit 
            hypotheses and story point estimates.
          </p>
          <Button size="lg" onClick={handleGenerate} disabled={selectedEpics.length === 0}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Features from {selectedEpics.length} Epics
          </Button>
          {selectedEpics.length === 0 && (
            <p className="text-sm text-amber-600 mt-3">Generate and select Epics first</p>
          )}
        </div>
      )}

      {/* Progress */}
      {isGenerating && (
        <div className="border rounded-xl p-8 bg-card">
          <div className="flex items-center gap-4 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <div>
              <h3 className="font-semibold">Generating Features...</h3>
              <p className="text-sm text-muted-foreground">Decomposing Epics into deliverable Features</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Results */}
      {features.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold">{features.length} Features Generated</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>

          {Object.entries(featuresByEpic).map(([epicKey, epicFeatures]: [string, any]) => {
            const epic = epics.find((e: any) => e.epic_key === epicKey || e.id === epicKey);
            return (
              <div key={epicKey} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Badge variant="outline" className="font-mono">{epic?.epic_key || epicKey}</Badge>
                  <span className="font-medium">{epic?.name || 'Unknown Epic'}</span>
                  <span className="text-muted-foreground text-sm">
                    ({epicFeatures.length} features)
                  </span>
                </div>

                <div className="grid gap-3 pl-4 border-l-2 border-muted">
                  {epicFeatures.map((feature: any) => (
                    <EditableFeatureCard
                      key={feature.id}
                      feature={feature}
                      onUpdate={handleUpdateFeature}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};