/**
 * AI Generate Modal - Phase 1 Spec Compliant
 * Purple gradient icon, test type chips (multi-select), coverage chips (single-select)
 * Progress state, results with checkboxes
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { TestCaseType, TestCasePriority, AIGeneratedTestCase } from '../types';

interface AIGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCases: (cases: AIGeneratedTestCase[]) => void;
}

const testTypes: { id: TestCaseType; label: string }[] = [
  { id: 'functional', label: 'Functional' },
  { id: 'negative', label: 'Negative' },
  { id: 'edge', label: 'Edge Cases' },
  { id: 'security', label: 'Security' },
];

const coverageLevels: { id: 'minimal' | 'standard' | 'comprehensive'; label: string }[] = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'standard', label: 'Standard' },
  { id: 'comprehensive', label: 'Comprehensive' },
];

export function AIGenerateModal({ open, onOpenChange, onAddCases }: AIGenerateModalProps) {
  const [requirement, setRequirement] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<TestCaseType>>(new Set(['functional', 'negative']));
  const [coverage, setCoverage] = useState<'minimal' | 'standard' | 'comprehensive'>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<AIGeneratedTestCase[] | null>(null);
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());

  const handleTypeToggle = (type: TestCaseType) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setSelectedTypes(next);
  };

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      toast.error('Please enter a requirement');
      return;
    }

    setIsGenerating(true);

    // Simulate AI generation (replace with actual API call)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock results
    const mockResults: AIGeneratedTestCase[] = [
      { title: 'Verify user can successfully log in with valid credentials', type: 'functional', priority: 'P1' },
      { title: 'Verify error message for invalid email format', type: 'negative', priority: 'P2' },
      { title: 'Verify login with empty password field', type: 'negative', priority: 'P2' },
      { title: 'Verify session timeout after 30 minutes of inactivity', type: 'security', priority: 'P1' },
      { title: 'Verify login with special characters in password', type: 'edge', priority: 'P3' },
    ];

    setResults(mockResults);
    setSelectedResults(new Set(mockResults.map((_, i) => i)));
    setIsGenerating(false);
  };

  const handleAddSelected = () => {
    if (selectedResults.size === 0) {
      toast.error('Please select at least one test case');
      return;
    }

    const selected = results?.filter((_, i) => selectedResults.has(i)) || [];
    onAddCases(selected);
    toast.success(`${selected.length} test case(s) added`);
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setRequirement('');
    setSelectedTypes(new Set(['functional', 'negative']));
    setCoverage('standard');
    setResults(null);
    setSelectedResults(new Set());
    setIsGenerating(false);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const priorityStyles: Record<TestCasePriority, { bg: string; text: string }> = {
    P1: { bg: 'bg-[rgba(220,38,38,0.1)]', text: 'text-[#dc2626]' },
    P2: { bg: 'bg-[rgba(217,119,6,0.1)]', text: 'text-[#d97706]' },
    P3: { bg: 'bg-[rgba(37,99,235,0.1)]', text: 'text-[#2563eb]' },
    P4: { bg: 'bg-[var(--bg-2)]', text: 'text-[var(--text-3)]' },
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-xl"
        style={{ borderRadius: '12px', padding: 0 }}
      >
        {/* Header - 20px 24px */}
        <DialogHeader
          className="px-6 pt-5 pb-4 border-b"
          style={{ borderColor: 'var(--stroke-1)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
              }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-[var(--text-1)]">
                Catalyst - AI Generator
              </DialogTitle>
              <p className="text-sm text-[var(--text-3)] mt-0.5">
                Generate test cases from requirements using AI
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body - 24px padding */}
        <div className="p-6">
          {!results && !isGenerating && (
            <>
              {/* Requirement Input */}
              <div className="mb-4">
                <label className="text-sm font-medium text-[var(--text-1)] mb-2 block">
                  Requirement
                </label>
                <Textarea
                  placeholder="e.g., User can log in with email and password. Password must be at least 8 characters."
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Test Types - Multi-select chips */}
              <div className="mb-4">
                <label className="text-sm font-medium text-[var(--text-1)] mb-2 block">
                  Test Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {testTypes.map((type) => {
                    const isSelected = selectedTypes.has(type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleTypeToggle(type.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                          isSelected
                            ? 'bg-[#7c3aed] text-white'
                            : 'bg-[var(--bg-2)] text-[var(--text-2)] hover:bg-[var(--bg-3)]'
                        )}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coverage - Single-select chips */}
              <div className="mb-6">
                <label className="text-sm font-medium text-[var(--text-1)] mb-2 block">
                  Coverage Level
                </label>
                <div className="flex gap-2">
                  {coverageLevels.map((level) => {
                    const isSelected = coverage === level.id;
                    return (
                      <button
                        key={level.id}
                        onClick={() => setCoverage(level.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                          isSelected
                            ? 'bg-[#7c3aed] text-white'
                            : 'bg-[var(--bg-2)] text-[var(--text-2)] hover:bg-[var(--bg-3)]'
                        )}
                      >
                        {level.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                className="w-full h-10 text-white"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Test Cases
              </Button>
            </>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 text-[#7c3aed] animate-spin mb-4" />
              <p className="text-sm font-medium text-[var(--text-1)]">Generating test cases...</p>
              <p className="text-xs text-[var(--text-3)] mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Results */}
          {results && !isGenerating && (
            <>
              {/* Success Header */}
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-[#059669]" />
                <span className="font-medium text-[var(--text-1)]">
                  {results.length} test cases generated
                </span>
              </div>

              {/* Result Items */}
              <div className="space-y-2 mb-6 max-h-64 overflow-auto">
                {results.map((tc, index) => {
                  const isSelected = selectedResults.has(index);
                  const priority = priorityStyles[tc.priority];
                  return (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                        isSelected
                          ? 'border-[#7c3aed] bg-[rgba(124,58,237,0.05)]'
                          : 'border-[var(--stroke-1)] hover:border-[var(--stroke-2)]'
                      )}
                      onClick={() => {
                        const next = new Set(selectedResults);
                        if (next.has(index)) {
                          next.delete(index);
                        } else {
                          next.add(index);
                        }
                        setSelectedResults(next);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-1)]">{tc.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            className={cn('text-[10px] uppercase', priority.bg, priority.text)}
                            style={{ borderRadius: '4px' }}
                          >
                            {tc.priority}
                          </Badge>
                          <Badge
                            className="text-[10px] uppercase bg-[var(--bg-2)] text-[var(--text-3)]"
                            style={{ borderRadius: '4px' }}
                          >
                            {tc.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Selected Button */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 h-10"
                >
                  Generate More
                </Button>
                <Button
                  onClick={handleAddSelected}
                  className="flex-1 h-10 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                  }}
                >
                  Add Selected ({selectedResults.size})
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AIGenerateModal;
