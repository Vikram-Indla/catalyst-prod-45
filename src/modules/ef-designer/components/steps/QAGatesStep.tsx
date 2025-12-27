import React, { useMemo } from 'react';
import { EFDSession } from '../../types/efd.types';
import { useEFDEpics, useEFDFeatures, useEFDAtoms } from '../../hooks/useEFDSession';
import { CheckCircle, XCircle, AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface QAGate {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'completeness' | 'quality' | 'safe';
  severity: 'critical' | 'warning' | 'info';
  check: (data: { epics: any[]; features: any[]; atoms: any[]; session: EFDSession }) => boolean;
}

const QA_GATES: QAGate[] = [
  {
    id: 'atoms-exist',
    name: 'Requirements extracted',
    description: 'At least one requirement has been parsed from input',
    category: 'structure',
    severity: 'critical',
    check: ({ atoms }) => atoms.length > 0,
  },
  {
    id: 'epics-exist',
    name: 'Epics generated',
    description: 'At least one epic has been created',
    category: 'structure',
    severity: 'critical',
    check: ({ epics }) => epics.length > 0,
  },
  {
    id: 'features-exist',
    name: 'Features generated',
    description: 'At least one feature has been created',
    category: 'structure',
    severity: 'critical',
    check: ({ features }) => features.length > 0,
  },
  {
    id: 'theme-linked',
    name: 'Strategic theme linked',
    description: 'Session is linked to a strategic theme',
    category: 'safe',
    severity: 'critical',
    check: ({ session }) => !!session.theme_id,
  },
  {
    id: 'coverage-minimum',
    name: 'Minimum coverage (50%)',
    description: 'At least 50% of requirements are mapped',
    category: 'completeness',
    severity: 'warning',
    check: ({ atoms }) => {
      if (atoms.length === 0) return false;
      const mapped = atoms.filter((a: any) => a.status === 'mapped').length;
      return (mapped / atoms.length) >= 0.5;
    },
  },
  {
    id: 'coverage-target',
    name: 'Target coverage (85%)',
    description: 'At least 85% of requirements are mapped',
    category: 'completeness',
    severity: 'info',
    check: ({ atoms }) => {
      if (atoms.length === 0) return false;
      const mapped = atoms.filter((a: any) => a.status === 'mapped').length;
      return (mapped / atoms.length) >= 0.85;
    },
  },
  {
    id: 'epics-selected',
    name: 'Epics selected for features',
    description: 'At least one epic is selected for feature generation',
    category: 'structure',
    severity: 'warning',
    check: ({ epics }) => epics.some((e: any) => e.is_selected_for_features),
  },
  {
    id: 'epics-have-hypothesis',
    name: 'Epics have Lean Business Case',
    description: 'All epics have LBC hypothesis defined',
    category: 'safe',
    severity: 'warning',
    check: ({ epics }) => epics.length > 0 && epics.every((e: any) => e.lbc_hypothesis),
  },
  {
    id: 'epics-have-size',
    name: 'Epics are sized',
    description: 'All epics have T-shirt size assigned',
    category: 'quality',
    severity: 'info',
    check: ({ epics }) => epics.length > 0 && epics.every((e: any) => e.size),
  },
  {
    id: 'epics-have-mvp',
    name: 'Epics have MVP definition',
    description: 'All epics have MVP defined',
    category: 'safe',
    severity: 'info',
    check: ({ epics }) => epics.length > 0 && epics.every((e: any) => e.mvp_definition),
  },
  {
    id: 'features-have-benefit',
    name: 'Features have benefit hypothesis',
    description: 'All features have benefit hypothesis',
    category: 'safe',
    severity: 'info',
    check: ({ features }) => features.length > 0 && features.every((f: any) => f.benefit_hypothesis),
  },
  {
    id: 'no-orphan-features',
    name: 'No orphan features',
    description: 'All features are linked to an epic',
    category: 'structure',
    severity: 'warning',
    check: ({ features }) => features.length === 0 || features.every((f: any) => f.epic_id),
  },
];

export const QAGatesStep: React.FC<{ session: EFDSession }> = ({ session }) => {
  const { data: epics = [] } = useEFDEpics(session.id);
  const { data: features = [] } = useEFDFeatures(session.id);
  const { data: atoms = [] } = useEFDAtoms(session.id);

  const gateResults = useMemo(() => {
    return QA_GATES.map(gate => ({
      ...gate,
      passed: gate.check({ epics, features, atoms, session }),
    }));
  }, [epics, features, atoms, session]);

  const passedCount = gateResults.filter(g => g.passed).length;
  const criticalFailed = gateResults.filter(g => !g.passed && g.severity === 'critical');
  const warningFailed = gateResults.filter(g => !g.passed && g.severity === 'warning');
  const allCriticalPassed = criticalFailed.length === 0;
  const score = Math.round((passedCount / QA_GATES.length) * 100);

  const categoryGroups = {
    structure: gateResults.filter(g => g.category === 'structure'),
    completeness: gateResults.filter(g => g.category === 'completeness'),
    quality: gateResults.filter(g => g.category === 'quality'),
    safe: gateResults.filter(g => g.category === 'safe'),
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'structure': return '🏗️';
      case 'completeness': return '📊';
      case 'quality': return '✨';
      case 'safe': return '🎯';
      default: return '📋';
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Quality Gates</h2>
        <p className="text-muted-foreground">
          Validate your session meets SAFe standards before publishing
        </p>
      </div>

      {/* Score Card */}
      <div className={`rounded-xl p-6 ${
        allCriticalPassed 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
          : 'bg-gradient-to-r from-red-50 to-amber-50 border border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {allCriticalPassed ? (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold">
                {passedCount} of {QA_GATES.length} gates passed
              </h3>
              <p className={allCriticalPassed ? 'text-green-700' : 'text-red-700'}>
                {allCriticalPassed 
                  ? 'All critical gates passed. Ready for approval!'
                  : `${criticalFailed.length} critical gate(s) failing`
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{score}%</div>
            <div className="text-sm text-muted-foreground">Quality Score</div>
          </div>
        </div>
        <Progress 
          value={score} 
          className={`h-2 mt-4 ${allCriticalPassed ? 'bg-green-200' : 'bg-red-200'}`} 
        />
      </div>

      {/* Category Sections */}
      {Object.entries(categoryGroups).map(([category, gates]) => (
        <div key={category} className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-muted/50 flex items-center gap-2">
            <span className="text-lg">{getCategoryIcon(category)}</span>
            <h3 className="font-semibold capitalize">{category}</h3>
            <Badge variant="secondary" className="ml-auto">
              {gates.filter(g => g.passed).length}/{gates.length}
            </Badge>
          </div>
          <div className="divide-y">
            {gates.map((gate) => (
              <div 
                key={gate.id} 
                className={`flex items-center gap-4 p-4 ${
                  gate.passed ? 'bg-green-50/50' : 
                  gate.severity === 'critical' ? 'bg-red-50' :
                  gate.severity === 'warning' ? 'bg-amber-50' : 'bg-background'
                }`}
              >
                {gate.passed ? (
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                ) : gate.severity === 'critical' ? (
                  <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      gate.passed ? 'text-green-700' : 
                      gate.severity === 'critical' ? 'text-red-700' : 
                      gate.severity === 'warning' ? 'text-amber-700' : ''
                    }`}>
                      {gate.name}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        gate.severity === 'critical' ? 'border-red-300 text-red-600' :
                        gate.severity === 'warning' ? 'border-amber-300 text-amber-600' :
                        'border-blue-300 text-blue-600'
                      }`}
                    >
                      {gate.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{gate.description}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  gate.passed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {gate.passed ? 'Passed' : 'Failed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
