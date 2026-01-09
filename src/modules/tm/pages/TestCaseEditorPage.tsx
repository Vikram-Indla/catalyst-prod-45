/**
 * Test Case Editor Page - Full page matching design exactly
 */

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  TestCaseEditorHeader,
  RichTextToolbar,
  CollapsibleSection,
  QualityChecklist,
  SidePanel,
  TestStepRow,
} from '../components/TestCaseEditor';
import { toast } from 'sonner';

export function TestCaseEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === 'new';

  // Form state
  const [objective, setObjective] = useState('');
  const [preconditions, setPreconditions] = useState<string[]>([]);
  const [steps, setSteps] = useState<{ action: string; expected: string }[]>([]);

  // Quality checklist items
  const checklistItems = [
    { id: 'title', label: 'Title provided', required: true, completed: false },
    { id: 'objective', label: 'Objective defined', required: false, completed: objective.length > 0 },
    { id: 'preconditions', label: 'Preconditions specified', required: false, completed: preconditions.length > 0 },
    { id: 'steps', label: 'Has test steps', required: true, completed: steps.length > 0 },
    { id: 'expected', label: 'All steps have expected results', required: true, completed: steps.length > 0 && steps.every(s => s.expected) },
    { id: 'requirement', label: 'Linked to requirement', required: true, completed: false },
    { id: 'priority', label: 'Priority set', required: false, completed: false },
  ];

  const handleSave = () => {
    toast.success('Test case saved');
  };

  const handleAddPrecondition = () => {
    setPreconditions([...preconditions, '']);
  };

  const handleAddStep = () => {
    setSteps([...steps, { action: '', expected: '' }]);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-1)]">
      {/* Header */}
      <TestCaseEditorHeader
        isNew={isNew}
        status="draft"
        folderPath="Root"
        onSave={handleSave}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left - Form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Rich Text Toolbar */}
          <RichTextToolbar
            onAIAssist={() => toast.info('AI Assist coming soon')}
          />

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto py-6 px-6 space-y-4">
              {/* Objective Text Area */}
              <div 
                className="rounded-lg border bg-[var(--bg-0)]" 
                style={{ borderColor: 'var(--stroke-1)', borderRadius: '8px', boxShadow: 'var(--shadow-1)' }}
              >
                <Textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Describe the objective of this test case..."
                  className="min-h-[120px] border-0 resize-none focus-visible:ring-0 text-sm bg-transparent"
                  style={{ padding: '16px', color: 'var(--text-1)' }}
                />
                <div
                  className="flex items-center justify-between px-4 py-2 border-t text-xs"
                  style={{ borderColor: 'var(--stroke-1)', color: 'var(--text-4)' }}
                >
                  <span>{objective.length} characters</span>
                  <span>Tip: Be specific about expected behavior</span>
                </div>
              </div>

              {/* Preconditions Section */}
              <CollapsibleSection
                title="PRECONDITIONS"
                count={preconditions.length}
                actionLabel="+ Add"
                onAction={handleAddPrecondition}
              >
                {preconditions.length === 0 ? (
                  <button
                    onClick={handleAddPrecondition}
                    className="text-brand-primary hover:text-brand-primary-hover text-sm font-medium flex items-center gap-1 transition-colors"
                    style={{ transitionDuration: '150ms' }}
                  >
                    <span>+</span> Add precondition
                  </button>
                ) : (
                  <div className="space-y-2">
                    {preconditions.map((p, i) => (
                      <input
                        key={i}
                        type="text"
                        value={p}
                        onChange={(e) => {
                          const next = [...preconditions];
                          next[i] = e.target.value;
                          setPreconditions(next);
                        }}
                        placeholder="Enter precondition..."
                        className="w-full px-3 py-2 text-sm border rounded-md bg-[var(--bg-0)] text-[var(--text-1)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary-light transition-colors"
                        style={{ borderColor: 'var(--stroke-1)', borderRadius: '6px', transitionDuration: '150ms' }}
                      />
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Test Steps Section */}
              <CollapsibleSection
                title="TEST STEPS"
                count={steps.length}
                actionLabel="+ Add Step"
                onAction={handleAddStep}
              >
                <TestStepRow isEmpty={steps.length === 0} onAdd={handleAddStep} />
              </CollapsibleSection>

              {/* Quality Checklist */}
              <QualityChecklist
                items={checklistItems}
                onFix={(itemId) => toast.info(`Fix: ${itemId}`)}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Right - Side Panel */}
        <SidePanel />
      </div>
    </div>
  );
}

export default TestCaseEditorPage;
