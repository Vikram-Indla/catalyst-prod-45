/**
 * TemplateAssignmentRules Component
 * Assignment configuration for templates
 * Catalyst V5 Design System
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, RotateCcw, Hand, Scale, GraduationCap, History, Calendar } from 'lucide-react';
import type { AssignmentRules, AssignmentMethod } from '@/types/template.types';

interface TemplateAssignmentRulesProps {
  rules: AssignmentRules;
  onChange: (rules: AssignmentRules) => void;
}

const ASSIGNMENT_METHODS: Array<{
  value: AssignmentMethod;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: 'smart',
    label: 'Smart Assignment',
    description: 'AI-powered distribution based on workload, skills, and availability',
    icon: Brain,
  },
  {
    value: 'round_robin',
    label: 'Round Robin',
    description: 'Distribute tests evenly across team members',
    icon: RotateCcw,
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'No auto-assignment, tests remain unassigned',
    icon: Hand,
  },
];

export function TemplateAssignmentRules({
  rules,
  onChange,
}: TemplateAssignmentRulesProps) {
  const updateMethod = (method: AssignmentMethod) => {
    onChange({ ...rules, method });
  };
  
  const updateWeight = (key: keyof NonNullable<AssignmentRules['weights']>, value: number) => {
    onChange({
      ...rules,
      weights: {
        ...rules.weights,
        workload: rules.weights?.workload || 30,
        skill: rules.weights?.skill || 40,
        history: rules.weights?.history || 15,
        availability: rules.weights?.availability || 15,
        [key]: value,
      },
    });
  };
  
  // Normalize weights to 100%
  const normalizeWeights = () => {
    const weights = rules.weights;
    if (!weights) return;
    
    const total = weights.workload + weights.skill + weights.history + weights.availability;
    if (total === 100) return;
    
    const factor = 100 / total;
    onChange({
      ...rules,
      weights: {
        workload: Math.round(weights.workload * factor),
        skill: Math.round(weights.skill * factor),
        history: Math.round(weights.history * factor),
        availability: Math.round(weights.availability * factor),
      },
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Method Selection */}
      <div>
        <Label className="text-sm font-medium text-slate-700 mb-4 block">
          Assignment Method
        </Label>
        <RadioGroup
          value={rules.method}
          onValueChange={(value) => updateMethod(value as AssignmentMethod)}
          className="space-y-3"
        >
          {ASSIGNMENT_METHODS.map(method => {
            const Icon = method.icon;
            const isSelected = rules.method === method.value;
            
            return (
              <label
                key={method.value}
                className={`
                  flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] bg-[var(--ds-background-selected,var(--ds-background-selected, #eff6ff))]' 
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <RadioGroupItem value={method.value} className="mt-1" />
                <div className="flex items-start gap-3 flex-1">
                  <div 
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'bg-[#dbeafe]' : 'bg-slate-100'}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <div className={`font-medium ${isSelected ? 'text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]' : 'text-slate-900'}`}>
                      {method.label}
                    </div>
                    <div className="text-sm text-slate-500">
                      {method.description}
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </div>
      
      {/* Additional Settings */}
      {rules.method !== 'manual' && (
        <Card className="border-slate-200">
          <CardContent className="p-5 space-y-4">
            <h4 className="font-medium text-slate-900">Additional Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-slate-500" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Balance Workload</div>
                  <div className="text-xs text-slate-500">Prevent overloading team members</div>
                </div>
              </div>
              <Switch
                checked={rules.balanceWorkload}
                onCheckedChange={(checked) => onChange({ ...rules, balanceWorkload: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-slate-500" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Respect Skills</div>
                  <div className="text-xs text-slate-500">Match tests to user expertise</div>
                </div>
              </div>
              <Switch
                checked={rules.respectSkills}
                onCheckedChange={(checked) => onChange({ ...rules, respectSkills: checked })}
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Smart Assignment Weights */}
      {rules.method === 'smart' && (
        <Card className="border-slate-200">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-900">Algorithm Weights</h4>
              <button
                onClick={normalizeWeights}
                className="text-xs text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:underline"
              >
                Normalize to 100%
              </button>
            </div>
            
            {/* Workload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <Scale className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700">Workload Balance</span>
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {rules.weights?.workload || 30}%
                </span>
              </div>
              <Slider
                value={[rules.weights?.workload || 30]}
                onValueChange={([value]) => updateWeight('workload', value)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            
            {/* Skill */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700">Skill Match</span>
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {rules.weights?.skill || 40}%
                </span>
              </div>
              <Slider
                value={[rules.weights?.skill || 40]}
                onValueChange={([value]) => updateWeight('skill', value)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            
            {/* History */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <History className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700">Past Performance</span>
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {rules.weights?.history || 15}%
                </span>
              </div>
              <Slider
                value={[rules.weights?.history || 15]}
                onValueChange={([value]) => updateWeight('history', value)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            
            {/* Availability */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700">Availability</span>
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {rules.weights?.availability || 15}%
                </span>
              </div>
              <Slider
                value={[rules.weights?.availability || 15]}
                onValueChange={([value]) => updateWeight('availability', value)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            
            {/* Total indicator */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Weight</span>
                <span className={`font-medium ${
                  (rules.weights?.workload || 30) + 
                  (rules.weights?.skill || 40) + 
                  (rules.weights?.history || 15) + 
                  (rules.weights?.availability || 15) === 100
                    ? 'text-[#0d9488]'
                    : 'text-[var(--ds-text-warning,var(--ds-text-warning, #d97706))]'
                }`}>
                  {(rules.weights?.workload || 30) + 
                   (rules.weights?.skill || 40) + 
                   (rules.weights?.history || 15) + 
                   (rules.weights?.availability || 15)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
