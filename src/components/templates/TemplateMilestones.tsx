/**
 * TemplateMilestones Component
 * Milestone builder with visual timeline
 * Catalyst V5 Design System
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Flag, CheckCircle, AlertCircle, GripVertical } from 'lucide-react';
import type { TemplateMilestone } from '@/types/template.types';
import { v4 as uuidv4 } from 'uuid';

interface TemplateMilestonesProps {
  duration: number;
  milestones: TemplateMilestone[];
  onChange: (milestones: TemplateMilestone[]) => void;
}

const MILESTONE_TYPES = [
  { value: 'checkpoint', label: 'Checkpoint', icon: Flag, color: '#2563eb' },
  { value: 'review', label: 'Review', icon: CheckCircle, color: '#0d9488' },
  { value: 'deadline', label: 'Deadline', icon: AlertCircle, color: '#ef4444' },
] as const;

export function TemplateMilestones({
  duration,
  milestones,
  onChange,
}: TemplateMilestonesProps) {
  const addMilestone = () => {
    const newMilestone: TemplateMilestone = {
      id: uuidv4(),
      name: `Milestone ${milestones.length + 1}`,
      day: Math.min(Math.floor(duration / 2), duration),
      type: 'checkpoint',
    };
    onChange([...milestones, newMilestone]);
  };
  
  const updateMilestone = (id: string, updates: Partial<TemplateMilestone>) => {
    onChange(milestones.map(m => m.id === id ? { ...m, ...updates } : m));
  };
  
  const removeMilestone = (id: string) => {
    onChange(milestones.filter(m => m.id !== id));
  };
  
  // Sort milestones by day for display
  const sortedMilestones = [...milestones].sort((a, b) => a.day - b.day);
  
  return (
    <div className="space-y-6">
      {/* Visual Timeline */}
      <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
        <h4 className="text-sm font-medium text-slate-700 mb-4">Timeline Preview</h4>
        
        <div className="relative">
          {/* Timeline bar */}
          <div className="h-2 bg-slate-200 rounded-full relative">
            {/* Milestones on timeline */}
            {sortedMilestones.map(milestone => {
              const position = ((milestone.day - 1) / (duration - 1)) * 100;
              const typeInfo = MILESTONE_TYPES.find(t => t.value === milestone.type);
              
              return (
                <div
                  key={milestone.id}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: typeInfo?.color }}
                    title={`${milestone.name} (Day ${milestone.day})`}
                  />
                </div>
              );
            })}
          </div>
          
          {/* Day labels */}
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-500">Day 1</span>
            <span className="text-xs text-slate-500">Day {duration}</span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
          {MILESTONE_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <div key={type.value} className="flex items-center gap-1.5 text-xs text-slate-600">
                <Icon className="w-3.5 h-3.5" style={{ color: type.color }} />
                <span>{type.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Milestone List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-slate-700">Milestones</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={addMilestone}
            className="text-[#2563eb] border-[#2563eb] hover:bg-[#eff6ff]"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Milestone
          </Button>
        </div>
        
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">
            No milestones defined. Add milestones to track progress.
          </div>
        ) : (
          <div className="space-y-2">
            {sortedMilestones.map((milestone, index) => {
              const typeInfo = MILESTONE_TYPES.find(t => t.value === milestone.type);
              const TypeIcon = typeInfo?.icon || Flag;
              
              return (
                <Card key={milestone.id} className="border-slate-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Drag handle */}
                      <div className="cursor-grab text-slate-400 hover:text-slate-600">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      
                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${typeInfo?.color}20` }}
                      >
                        <TypeIcon className="w-4 h-4" style={{ color: typeInfo?.color }} />
                      </div>
                      
                      {/* Name */}
                      <Input
                        value={milestone.name}
                        onChange={(e) => updateMilestone(milestone.id, { name: e.target.value })}
                        className="flex-1 h-8 text-sm"
                        placeholder="Milestone name"
                      />
                      
                      {/* Day */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Day</span>
                        <Input
                          type="number"
                          value={milestone.day}
                          onChange={(e) => {
                            const day = Math.min(Math.max(1, parseInt(e.target.value) || 1), duration);
                            updateMilestone(milestone.id, { day });
                          }}
                          className="w-16 h-8 text-sm text-center"
                          min={1}
                          max={duration}
                        />
                      </div>
                      
                      {/* Type */}
                      <Select
                        value={milestone.type}
                        onValueChange={(value: TemplateMilestone['type']) => 
                          updateMilestone(milestone.id, { type: value })
                        }
                      >
                        <SelectTrigger className="w-32 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {MILESTONE_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="w-3.5 h-3.5" style={{ color: type.color }} />
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMilestone(milestone.id)}
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
