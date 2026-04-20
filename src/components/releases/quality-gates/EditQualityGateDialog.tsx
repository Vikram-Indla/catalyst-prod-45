import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Lozenge } from '@/components/ads';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface GateRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  warningThreshold?: number;
  weight: number;
  isRequired: boolean;
}

interface QualityGate {
  id: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  status: string;
  score: number;
  rules: GateRule[];
  isActive: boolean;
}

interface EditQualityGateDialogProps {
  open: boolean;
  gate: QualityGate | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const metricOptions = [
  { value: 'pass_rate', label: 'Test Pass Rate' },
  { value: 'execution_complete', label: 'Execution Complete %' },
  { value: 'critical_pass_rate', label: 'Critical Pass Rate' },
  { value: 'overall_coverage', label: 'Overall Coverage' },
  { value: 'critical_coverage', label: 'Critical Coverage' },
  { value: 'defect_count', label: 'Defect Count' },
  { value: 'blocker_count', label: 'Blocker Count' },
  { value: 'page_load_ms', label: 'Page Load Time (ms)' },
  { value: 'api_response_ms', label: 'API Response Time (ms)' },
];

const operatorOptions = [
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '==', label: '=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
];

const categoryOptions = [
  { value: 'blocking', label: 'Blocking' },
  { value: 'warning', label: 'Warning' },
  { value: 'informational', label: 'Informational' },
];

const typeOptions = [
  { value: 'execution', label: 'Execution' },
  { value: 'coverage', label: 'Coverage' },
  { value: 'defect', label: 'Defect' },
  { value: 'performance', label: 'Performance' },
  { value: 'security', label: 'Security' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'custom', label: 'Custom' },
];

export function EditQualityGateDialog({ open, gate, onOpenChange, onSuccess }: EditQualityGateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('execution');
  const [category, setCategory] = useState('blocking');
  const [isActive, setIsActive] = useState(true);
  const [rules, setRules] = useState<GateRule[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (gate) {
      setName(gate.name);
      setDescription(gate.description || '');
      setType(gate.type);
      setCategory(gate.category);
      setIsActive(gate.isActive);
      setRules(gate.rules.map(r => ({ ...r })));
    }
  }, [gate]);
  
  const addRule = () => {
    const newRule: GateRule = {
      id: `new-${Date.now()}`,
      name: '',
      metric: 'pass_rate',
      operator: '>=',
      threshold: 90,
      weight: 1,
      isRequired: false
    };
    setRules([...rules, newRule]);
  };
  
  const updateRule = (index: number, updates: Partial<GateRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };
  
  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Gate name is required');
      return;
    }
    
    if (rules.length === 0) {
      toast.error('At least one condition is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Quality gate updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update quality gate');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Quality Gate</DialogTitle>
          <DialogDescription>
            Configure gate conditions and thresholds
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="gate-name">Gate Name *</Label>
              <Input
                id="gate-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter gate name"
                className="mt-1"
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="gate-description">Description</Label>
              <Textarea
                id="gate-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this gate validates"
                className="mt-1"
                rows={2}
              />
            </div>
            
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Enable or disable this gate</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          
          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label>Conditions</Label>
                <p className="text-xs text-muted-foreground">Define rules that must be met</p>
              </div>
              <Button variant="outline" size="sm" onClick={addRule}>
                <Plus className="w-4 h-4 mr-1" />
                Add Condition
              </Button>
            </div>
            
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div 
                  key={rule.id} 
                  className="border rounded-lg p-3 space-y-3 bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <Input
                      value={rule.name}
                      onChange={(e) => updateRule(index, { name: e.target.value })}
                      placeholder="Condition name"
                      className="flex-1"
                    />
                    {rule.isRequired && (
                      <Lozenge appearance="default">Required</Lozenge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeRule(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <Select 
                      value={rule.metric} 
                      onValueChange={(v) => updateRule(index, { metric: v })}
                    >
                      <SelectTrigger className="col-span-2">
                        <SelectValue placeholder="Metric" />
                      </SelectTrigger>
                      <SelectContent>
                        {metricOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={rule.operator} 
                      onValueChange={(v) => updateRule(index, { operator: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Input
                      type="number"
                      value={rule.threshold}
                      onChange={(e) => updateRule(index, { threshold: Number(e.target.value) })}
                      placeholder="Value"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`weight-${rule.id}`} className="text-xs text-muted-foreground">Weight:</Label>
                      <Input
                        id={`weight-${rule.id}`}
                        type="number"
                        min={1}
                        max={5}
                        value={rule.weight}
                        onChange={(e) => updateRule(index, { weight: Number(e.target.value) })}
                        className="w-16 h-8"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id={`required-${rule.id}`}
                        checked={rule.isRequired}
                        onCheckedChange={(v) => updateRule(index, { isRequired: v })}
                      />
                      <Label htmlFor={`required-${rule.id}`} className="text-xs text-muted-foreground">Required</Label>
                    </div>
                  </div>
                </div>
              ))}
              
              {rules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  No conditions defined. Click "Add Condition" to create one.
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
