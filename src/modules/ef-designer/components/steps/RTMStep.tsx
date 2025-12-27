import React, { useState } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDEpics, useEFDFeatures, useEFDAtoms } from '../../hooks/useEFDSession';
import { 
  ChevronDown, ChevronRight, Layers, Box, Atom, 
  CheckCircle, AlertCircle, FileText, Link2 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const RTMStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: epics = [] } = useEFDEpics(session.id);
  const { data: features = [] } = useEFDFeatures(session.id);
  const { data: atoms = [] } = useEFDAtoms(session.id);
  
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set(epics.map((e: any) => e.id)));
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  const mappedAtoms = atoms.filter((a: any) => a.status === 'mapped');
  const coverage = atoms.length > 0 ? Math.round((mappedAtoms.length / atoms.length) * 100) : 0;

  // Build hierarchy
  const hierarchy = epics.map((epic: any) => {
    const epicFeatures = features.filter((f: any) => f.epic_id === epic.id);
    const featuresWithAtoms = epicFeatures.map((feature: any) => {
      const featureAtoms = atoms.filter((a: any) => a.mapped_to_feature_id === feature.id);
      return { ...feature, atoms: featureAtoms };
    });
    return { ...epic, features: featuresWithAtoms };
  });

  const orphanAtoms = atoms.filter((a: any) => !a.mapped_to_feature_id);

  const toggleEpic = (epicId: string) => {
    const next = new Set(expandedEpics);
    if (next.has(epicId)) {
      next.delete(epicId);
    } else {
      next.add(epicId);
    }
    setExpandedEpics(next);
  };

  const toggleFeature = (featureId: string) => {
    const next = new Set(expandedFeatures);
    if (next.has(featureId)) {
      next.delete(featureId);
    } else {
      next.add(featureId);
    }
    setExpandedFeatures(next);
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Requirements Traceability Matrix</h2>
        <p className="text-muted-foreground">
          Full hierarchy view: Strategic Theme → Epics → Features → Requirements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="border rounded-lg p-4 text-center bg-card">
          <div className={`text-2xl font-bold ${coverage >= 85 ? 'text-green-600' : coverage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {coverage}%
          </div>
          <div className="text-sm text-muted-foreground">Coverage</div>
          <Progress value={coverage} className="h-1 mt-2" />
        </div>
        <div className="border rounded-lg p-4 text-center bg-card">
          <Layers className="h-5 w-5 mx-auto mb-1 text-violet-500" />
          <div className="text-2xl font-bold">{epics.length}</div>
          <div className="text-sm text-muted-foreground">Epics</div>
        </div>
        <div className="border rounded-lg p-4 text-center bg-card">
          <Box className="h-5 w-5 mx-auto mb-1 text-teal-500" />
          <div className="text-2xl font-bold">{features.length}</div>
          <div className="text-sm text-muted-foreground">Features</div>
        </div>
        <div className="border rounded-lg p-4 text-center bg-card">
          <Atom className="h-5 w-5 mx-auto mb-1 text-purple-500" />
          <div className="text-2xl font-bold">{atoms.length}</div>
          <div className="text-sm text-muted-foreground">Requirements</div>
        </div>
        <div className="border rounded-lg p-4 text-center bg-card">
          <Link2 className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <div className="text-2xl font-bold">{mappedAtoms.length}</div>
          <div className="text-sm text-muted-foreground">Mapped</div>
        </div>
      </div>

      {/* Theme Header */}
      {session.theme_id && (
        <div className="p-4 bg-gradient-to-r from-violet-500/10 to-violet-500/5 border border-violet-200 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-sm font-medium text-violet-700">Strategic Theme Linked</span>
          </div>
        </div>
      )}

      {/* Hierarchy Tree */}
      <div className="border rounded-xl overflow-hidden">
        {hierarchy.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hierarchy to display. Generate epics and features first.</p>
          </div>
        ) : (
          <div className="divide-y">
            {hierarchy.map((epic: any) => (
              <div key={epic.id}>
                {/* Epic Row */}
                <div 
                  className="flex items-center gap-3 p-4 bg-violet-50/50 cursor-pointer hover:bg-violet-50"
                  onClick={() => toggleEpic(epic.id)}
                >
                  {expandedEpics.has(epic.id) ? (
                    <ChevronDown className="h-4 w-4 text-violet-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-violet-600" />
                  )}
                  <Layers className="h-5 w-5 text-violet-600" />
                  <span className="font-mono text-sm text-violet-600">{epic.epic_key}</span>
                  <span className="font-medium flex-1">{epic.name}</span>
                  <Badge variant="outline">{epic.features.length} features</Badge>
                  <Badge variant="secondary">
                    {epic.features.reduce((sum: number, f: any) => sum + f.atoms.length, 0)} reqs
                  </Badge>
                </div>

                {/* Features */}
                {expandedEpics.has(epic.id) && epic.features.map((feature: any) => (
                  <div key={feature.id}>
                    {/* Feature Row */}
                    <div 
                      className="flex items-center gap-3 p-4 pl-12 bg-teal-50/30 cursor-pointer hover:bg-teal-50/50"
                      onClick={() => toggleFeature(feature.id)}
                    >
                      {feature.atoms.length > 0 ? (
                        expandedFeatures.has(feature.id) ? (
                          <ChevronDown className="h-4 w-4 text-teal-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-teal-600" />
                        )
                      ) : (
                        <div className="w-4" />
                      )}
                      <Box className="h-4 w-4 text-teal-600" />
                      <span className="font-mono text-sm text-teal-600">{feature.feature_key}</span>
                      <span className="flex-1">{feature.name}</span>
                      {feature.atoms.length > 0 ? (
                        <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                          {feature.atoms.length} reqs
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          No reqs
                        </Badge>
                      )}
                    </div>

                    {/* Atoms */}
                    {expandedFeatures.has(feature.id) && feature.atoms.map((atom: any) => (
                      <div 
                        key={atom.id} 
                        className="flex items-center gap-3 p-3 pl-20 bg-background hover:bg-muted/30 border-l-2 border-teal-200"
                      >
                        <Atom className="h-4 w-4 text-purple-500" />
                        <span className="font-mono text-xs text-purple-600">{atom.atom_key}</span>
                        <span className="text-sm flex-1 line-clamp-1">{atom.text}</span>
                        <Badge variant="outline" className="text-xs">
                          {atom.type || 'FR'}
                        </Badge>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orphan Atoms */}
      {orphanAtoms.length > 0 && (
        <div className="border border-amber-200 rounded-xl overflow-hidden">
          <div className="p-4 bg-amber-50 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-700">
              {orphanAtoms.length} Unmapped Requirements
            </span>
          </div>
          <div className="divide-y">
            {orphanAtoms.slice(0, 10).map((atom: any) => (
              <div key={atom.id} className="flex items-center gap-3 p-3 bg-background">
                <Atom className="h-4 w-4 text-amber-500" />
                <span className="font-mono text-xs text-amber-600">{atom.atom_key}</span>
                <span className="text-sm flex-1 line-clamp-1">{atom.text}</span>
              </div>
            ))}
            {orphanAtoms.length > 10 && (
              <div className="p-3 text-center text-sm text-muted-foreground">
                +{orphanAtoms.length - 10} more unmapped requirements
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
