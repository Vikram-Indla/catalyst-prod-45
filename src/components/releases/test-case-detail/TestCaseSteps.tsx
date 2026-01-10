/**
 * Test Case Steps Component
 * Displays and manages test steps with drag-and-drop
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, 
  Plus, 
  Sparkles, 
  MoreHorizontal,
  Pencil,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  Paperclip,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TestStep } from '@/data/testCaseDetailData';

interface TestCaseStepsProps {
  steps: TestStep[];
}

export function TestCaseSteps({ steps: initialSteps }: TestCaseStepsProps) {
  const [steps, setSteps] = useState(initialSteps);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStep, setNewStep] = useState({ action: '', expectedResult: '' });

  const handleAddStep = () => {
    if (newStep.action.trim() && newStep.expectedResult.trim()) {
      const step: TestStep = {
        id: `step-${steps.length + 1}`,
        action: newStep.action,
        expectedResult: newStep.expectedResult,
        attachments: [],
      };
      setSteps([...steps, step]);
      setNewStep({ action: '', expectedResult: '' });
      setShowAddForm(false);
    }
  };

  const estimatedTime = `${steps.length * 0.5 + 2} min`;

  return (
    <div className="space-y-4">
      {/* Steps Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Test Steps</h3>
          <p className="text-sm text-muted-foreground">
            {steps.length} steps · Est. {estimatedTime}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            AI Generate Steps
          </Button>
          <Button size="sm" className="h-8" onClick={() => setShowAddForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Step
          </Button>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <StepCard key={step.id} step={step} index={index} />
        ))}
      </div>

      {/* Add Step Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="flex gap-4 p-4 bg-card border border-border rounded-lg border-dashed border-primary/50">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0">
                {steps.length + 1}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Action <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder="Describe the action to perform..."
                    className="min-h-[80px]"
                    value={newStep.action}
                    onChange={(e) => setNewStep({ ...newStep, action: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Expected Result <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder="Describe the expected outcome..."
                    className="min-h-[80px]"
                    value={newStep.expectedResult}
                    onChange={(e) => setNewStep({ ...newStep, expectedResult: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Attachments
                  </label>
                  <div className="border border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop files or{' '}
                      <span className="text-primary cursor-pointer hover:underline">browse</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewStep({ action: '', expectedResult: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddStep}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface StepCardProps {
  step: TestStep;
  index: number;
}

function StepCard({ step, index }: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex gap-4 p-4 bg-card border border-border rounded-lg hover:shadow-sm hover:border-primary/30 transition-all group"
    >
      {/* Drag Handle */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="cursor-grab hover:bg-muted rounded p-1 text-muted-foreground">
          <GripVertical className="w-4 h-4" />
        </div>
        {/* Step Number */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-medium">
          {index + 1}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Action */}
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Action
          </span>
          <p className="text-sm text-foreground mt-1">{step.action}</p>
        </div>

        {/* Expected Result */}
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Expected Result
          </span>
          <p className="text-sm text-foreground mt-1">{step.expectedResult}</p>
        </div>

        {/* Attachments */}
        {step.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {step.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Paperclip className="w-3 h-3" />
                {att.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArrowUp className="w-4 h-4 mr-2" />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArrowDown className="w-4 h-4 mr-2" />
              Move Down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
