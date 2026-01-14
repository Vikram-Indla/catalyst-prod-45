/**
 * Factor Weights Configuration
 * Sliders to adjust algorithm weights
 */

import React from 'react';
import { RotateCcw, Briefcase, Target, Zap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { DEFAULT_WEIGHTS, WEIGHT_PRESETS } from '@/lib/assignment-algorithm';
import type { AssignmentWeights } from '@/types/smart-assignment.types';

interface FactorWeightsProps {
  weights: AssignmentWeights;
  onWeightsChange: (weights: AssignmentWeights) => void;
  onWeightUpdate: (key: keyof AssignmentWeights, value: number) => void;
}

const FACTOR_CONFIG = [
  {
    key: 'workload' as const,
    label: 'Workload Balance',
    description: 'Distribute evenly based on current load',
    icon: Briefcase,
  },
  {
    key: 'skill' as const,
    label: 'Skill Match',
    description: 'Match expertise to test modules',
    icon: Target,
  },
  {
    key: 'performance' as const,
    label: 'Performance History',
    description: 'Consider pass rate & execution speed',
    icon: Zap,
  },
  {
    key: 'availability' as const,
    label: 'Availability',
    description: 'Check calendar for remaining days',
    icon: Calendar,
  },
];

export function FactorWeights({
  weights,
  onWeightsChange,
  onWeightUpdate,
}: FactorWeightsProps) {
  const handlePresetChange = (presetId: string) => {
    const preset = WEIGHT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      onWeightsChange(preset.weights);
    }
  };

  const handleReset = () => {
    onWeightsChange(DEFAULT_WEIGHTS);
  };

  // Find current matching preset
  const currentPreset = WEIGHT_PRESETS.find(p => 
    Math.abs(p.weights.workload - weights.workload) < 0.01 &&
    Math.abs(p.weights.skill - weights.skill) < 0.01 &&
    Math.abs(p.weights.performance - weights.performance) < 0.01 &&
    Math.abs(p.weights.availability - weights.availability) < 0.01
  );

  return (
    <div 
      className="p-4 border-t"
      style={{ borderColor: CATALYST_V5.slate[200] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 
          className="text-sm font-semibold"
          style={{ color: CATALYST_V5.slate[700] }}
        >
          Algorithm Weights
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleReset}
          style={{ color: CATALYST_V5.slate[500] }}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Presets Dropdown */}
      <div className="mb-4">
        <Label 
          className="text-xs font-medium mb-1.5 block"
          style={{ color: CATALYST_V5.slate[600] }}
        >
          Preset
        </Label>
        <Select
          value={currentPreset?.id || ''}
          onValueChange={handlePresetChange}
        >
          <SelectTrigger 
            className="h-8"
            style={{ borderColor: CATALYST_V5.slate[200] }}
          >
            <SelectValue placeholder="Custom" />
          </SelectTrigger>
          <SelectContent>
            {WEIGHT_PRESETS.map(preset => (
              <SelectItem key={preset.id} value={preset.id}>
                <div>
                  <div className="font-medium">{preset.name}</div>
                  <div 
                    className="text-[10px]"
                    style={{ color: CATALYST_V5.slate[500] }}
                  >
                    {preset.description}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weight Sliders */}
      <div className="space-y-4">
        {FACTOR_CONFIG.map(factor => {
          const Icon = factor.icon;
          const value = weights[factor.key];
          const percentage = Math.round(value * 100);

          return (
            <div key={factor.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon 
                    className="h-4 w-4" 
                    style={{ color: CATALYST_V5.slate[400] }} 
                  />
                  <div>
                    <Label 
                      className="text-xs font-medium"
                      style={{ color: CATALYST_V5.slate[700] }}
                    >
                      {factor.label}
                    </Label>
                  </div>
                </div>
                <span 
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: CATALYST_V5.primaryLight,
                    color: CATALYST_V5.primary,
                  }}
                >
                  {percentage}%
                </span>
              </div>
              
              <Slider
                value={[value * 100]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => onWeightUpdate(factor.key, v / 100)}
                className="w-full"
              />
              
              <p 
                className="text-[10px] mt-1"
                style={{ color: CATALYST_V5.slate[400] }}
              >
                {factor.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Total indicator */}
      <div 
        className="mt-4 pt-3 border-t flex items-center justify-between"
        style={{ borderColor: CATALYST_V5.slate[200] }}
      >
        <span 
          className="text-xs"
          style={{ color: CATALYST_V5.slate[500] }}
        >
          Total Weight
        </span>
        <span 
          className="text-xs font-semibold"
          style={{ color: CATALYST_V5.teal }}
        >
          100% (auto-normalized)
        </span>
      </div>
    </div>
  );
}
