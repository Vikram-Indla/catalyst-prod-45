/**
 * Data Tab - Parameterization and Datasets
 */

import React from 'react';
import { Plus, Trash2, Variable, Database, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TabProps } from './types';

interface DataTabProps extends TabProps {
  addVariable: () => void;
  removeVariable: (id: string) => void;
  addDataset: () => void;
  removeDataset: (id: string) => void;
}

export function DataTab({
  formData,
  setFormData,
  addVariable,
  removeVariable,
  addDataset,
  removeDataset,
}: DataTabProps) {
  const updateVariable = (varId: string, field: 'name' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map(v =>
        v.id === varId ? { ...v, [field]: value } : v
      ),
    }));
  };

  const updateDatasetName = (datasetId: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      datasets: prev.datasets.map(d =>
        d.id === datasetId ? { ...d, name } : d
      ),
    }));
  };

  const updateDatasetValue = (datasetId: string, variableId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      datasets: prev.datasets.map(d =>
        d.id === datasetId
          ? { ...d, values: { ...d.values, [variableId]: value } }
          : d
      ),
    }));
  };

  const runCount = formData.datasetsEnabled && formData.datasets.length > 0
    ? formData.datasets.length
    : 1;

  return (
    <div className="flex flex-col h-full">
      {/* Toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-1">
        <div className="flex items-center gap-3">
          <Switch
            id="datasets-enabled"
            checked={formData.datasetsEnabled}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, datasetsEnabled: checked }))}
          />
          <Label htmlFor="datasets-enabled" className="cursor-pointer">
            <span className="font-medium">Enable Data-Driven Testing</span>
            <p className="text-xs text-text-tertiary mt-0.5">
              Define variables and datasets to run this test multiple times with different data
            </p>
          </Label>
        </div>
        {formData.datasetsEnabled && (
          <div className="flex items-center gap-1 text-sm">
            <Database className="h-4 w-4 text-accent-primary" />
            <span className="text-text-secondary">This test will run</span>
            <span className="font-medium text-accent-primary">{runCount}</span>
            <span className="text-text-secondary">time{runCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {!formData.datasetsEnabled ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <Variable className="h-12 w-12 mx-auto mb-4 text-text-quaternary" />
            <h3 className="font-medium text-text-primary mb-2">Data-Driven Testing Disabled</h3>
            <p className="text-sm text-text-tertiary">
              Enable data-driven testing to define variables like {'{username}'}, {'{role}'}, {'{env}'} and create datasets with different values for each test run.
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Variables Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-sm">Variables</h3>
                  <p className="text-xs text-text-tertiary">
                    Define placeholders to use in your test steps: {'{variableName}'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={addVariable} className="h-7 gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add Variable
                </Button>
              </div>

              {formData.variables.length === 0 ? (
                <div className="p-4 border border-dashed border-border-default rounded-md text-center">
                  <p className="text-sm text-text-tertiary">No variables defined</p>
                  <Button size="sm" variant="link" onClick={addVariable} className="mt-1">
                    Add your first variable
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.variables.map((variable, idx) => (
                    <div
                      key={variable.id}
                      className="grid grid-cols-[1fr_2fr_40px] gap-2 items-center p-2 rounded-md bg-surface-2"
                    >
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-quaternary">{'{'}</span>
                        <Input
                          placeholder="name"
                          value={variable.name}
                          onChange={(e) => updateVariable(variable.id, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                          className="h-8 text-sm bg-surface-1 pl-5 pr-5"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-quaternary">{'}'}</span>
                      </div>
                      <Input
                        placeholder="Description (optional)"
                        value={variable.description}
                        onChange={(e) => updateVariable(variable.id, 'description', e.target.value)}
                        className="h-8 text-sm bg-surface-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-status-error"
                        onClick={() => removeVariable(variable.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Datasets Section */}
            {formData.variables.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-sm">Datasets</h3>
                    <p className="text-xs text-text-tertiary">
                      Each dataset represents one execution of this test case
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={addDataset} className="h-7 gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Add Dataset
                  </Button>
                </div>

                {formData.datasets.length === 0 ? (
                  <div className="p-4 border border-dashed border-border-default rounded-md text-center">
                    <p className="text-sm text-text-tertiary">No datasets defined</p>
                    <Button size="sm" variant="link" onClick={addDataset} className="mt-1">
                      Add your first dataset
                    </Button>
                  </div>
                ) : (
                  <div className="border border-border-default rounded-md overflow-hidden">
                    {/* Table Header */}
                    <div className={cn(
                      'grid gap-2 px-3 py-2 bg-surface-2 border-b border-border-default text-xs font-medium text-text-secondary',
                      `grid-cols-[200px_repeat(${formData.variables.length},1fr)_40px]`
                    )} style={{ gridTemplateColumns: `200px repeat(${formData.variables.length}, 1fr) 40px` }}>
                      <div>Dataset Name</div>
                      {formData.variables.map(v => (
                        <div key={v.id}>{'{' + v.name + '}'}</div>
                      ))}
                      <div></div>
                    </div>

                    {/* Dataset Rows */}
                    {formData.datasets.map((dataset, idx) => (
                      <div
                        key={dataset.id}
                        className="grid gap-2 px-3 py-2 border-b last:border-b-0 border-border-default"
                        style={{ gridTemplateColumns: `200px repeat(${formData.variables.length}, 1fr) 40px` }}
                      >
                        <Input
                          value={dataset.name}
                          onChange={(e) => updateDatasetName(dataset.id, e.target.value)}
                          className="h-8 text-sm bg-surface-2"
                        />
                        {formData.variables.map(v => (
                          <Input
                            key={v.id}
                            placeholder={`Value for {${v.name}}`}
                            value={dataset.values[v.id] || ''}
                            onChange={(e) => updateDatasetValue(dataset.id, v.id, e.target.value)}
                            className="h-8 text-sm bg-surface-2"
                          />
                        ))}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-status-error"
                          onClick={() => removeDataset(dataset.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Usage hint */}
            {formData.variables.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-accent-subtle border border-accent-primary/20">
                <AlertCircle className="h-4 w-4 text-accent-primary mt-0.5 shrink-0" />
                <div className="text-xs text-text-secondary">
                  <p className="font-medium text-text-primary mb-1">Using variables in steps</p>
                  <p>
                    Reference variables in your step actions or test data using the syntax:{' '}
                    {formData.variables.map((v, i) => (
                      <span key={v.id}>
                        <code className="bg-surface-2 px-1 py-0.5 rounded">{'{' + v.name + '}'}</code>
                        {i < formData.variables.length - 1 && ', '}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
