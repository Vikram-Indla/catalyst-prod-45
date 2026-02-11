// =====================================================
// QUALITY GATE EDITOR
// Configure quality gates for release readiness
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  useReleaseQualityGates,
  useCreateQualityGate,
  useUpdateQualityGate,
  useDeleteQualityGate,
  QualityGate,
} from '@/hooks/releases/useReleaseQualityGates';

interface QualityGateEditorProps {
  releaseId: string;
}

const GATE_TYPES = [
  { value: 'pass_rate', label: 'Pass Rate %', icon: ShieldCheck },
  { value: 'execution_rate', label: 'Execution Rate %', icon: Shield },
  { value: 'defect_count', label: 'Open Defects', icon: ShieldAlert },
  { value: 'blocker_count', label: 'Open Blockers', icon: ShieldAlert },
  { value: 'coverage', label: 'Test Coverage', icon: Shield },
];

const OPERATORS = [
  { value: '>=', label: '≥ (at least)' },
  { value: '<=', label: '≤ (at most)' },
  { value: '>', label: '> (more than)' },
  { value: '<', label: '< (less than)' },
  { value: '=', label: '= (exactly)' },
];

export function QualityGateEditor({ releaseId }: QualityGateEditorProps) {
  const { data: gates = [], isLoading } = useReleaseQualityGates(releaseId);
  const createGate = useCreateQualityGate();
  const updateGate = useUpdateQualityGate();
  const deleteGate = useDeleteQualityGate();

  const [isAdding, setIsAdding] = useState(false);
  const [newGate, setNewGate] = useState({
    gate_name: '',
    gate_type: 'pass_rate' as QualityGate['gate_type'],
    threshold_operator: '>=' as QualityGate['threshold_operator'],
    threshold_value: 80,
    is_blocking: true,
  });

  const handleAddGate = () => {
    createGate.mutate(
      {
        release_id: releaseId,
        ...newGate,
        description: null,
        sort_order: gates.length,
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewGate({
            gate_name: '',
            gate_type: 'pass_rate',
            threshold_operator: '>=',
            threshold_value: 80,
            is_blocking: true,
          });
        },
      }
    );
  };

  const handleToggleBlocking = (gate: QualityGate) => {
    updateGate.mutate({ id: gate.id, is_blocking: !gate.is_blocking });
  };

  const handleDelete = (gate: QualityGate) => {
    deleteGate.mutate({ id: gate.id, releaseId });
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Quality Gates
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Gate
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {gates.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No quality gates configured</p>
            <p className="text-sm">Add gates to define release readiness criteria</p>
          </div>
        )}

        {gates.map((gate) => {
          const gateType = GATE_TYPES.find((t) => t.value === gate.gate_type);
          const Icon = gateType?.icon || Shield;

          return (
            <div
              key={gate.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <Icon className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{gate.gate_name}</div>
                <div className="text-sm text-muted-foreground">
                  {gateType?.label} {gate.threshold_operator} {gate.threshold_value}
                  {gate.gate_type.includes('rate') && '%'}
                </div>
              </div>
              <Badge variant={gate.is_blocking ? 'destructive' : 'secondary'}>
                {gate.is_blocking ? 'Blocking' : 'Warning'}
              </Badge>
              <Switch
                checked={gate.is_blocking}
                onCheckedChange={() => handleToggleBlocking(gate)}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(gate)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })}

        {isAdding && (
          <div className="p-4 border rounded-lg bg-card space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Gate Name</Label>
                <Input
                  value={newGate.gate_name}
                  onChange={(e) => setNewGate({ ...newGate, gate_name: e.target.value })}
                  placeholder="e.g., Minimum Pass Rate"
                />
              </div>
              <div>
                <Label>Metric Type</Label>
                <Select
                  value={newGate.gate_type}
                  onValueChange={(v) => setNewGate({ ...newGate, gate_type: v as QualityGate['gate_type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Operator</Label>
                  <Select
                    value={newGate.threshold_operator}
                    onValueChange={(v) => setNewGate({ ...newGate, threshold_operator: v as QualityGate['threshold_operator'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={newGate.threshold_value}
                    onChange={(e) => setNewGate({ ...newGate, threshold_value: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  id="is-blocking"
                  checked={newGate.is_blocking}
                  onCheckedChange={(checked) => setNewGate({ ...newGate, is_blocking: checked })}
                />
                <Label htmlFor="is-blocking">Blocking gate (must pass for release approval)</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddGate} disabled={!newGate.gate_name || createGate.isPending}>
                Add Gate
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
