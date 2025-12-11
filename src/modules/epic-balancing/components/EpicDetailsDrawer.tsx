import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';
import { 
  EpicBalancingEpic, 
  PriorityToExecute,
  AbilityToExecute,
  PRIORITY_TO_EXECUTE_LABELS 
} from '../types';

interface EpicDetailsDrawerProps {
  epic: EpicBalancingEpic | null;
  open: boolean;
  onClose: () => void;
  onSave: (epic: EpicBalancingEpic) => void;
}

const PRIORITIES: PriorityToExecute[] = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW'];
const ABILITIES: AbilityToExecute[] = ['HIGH', 'MEDIUM', 'LOW'];

export function EpicDetailsDrawer({ epic, open, onClose, onSave }: EpicDetailsDrawerProps) {
  const [formData, setFormData] = useState({
    businessAlignment: '',
    timeCriticality: '',
    investorEnablement: '',
    jobSize: '',
    priorityToExecute: 'MEDIUM' as PriorityToExecute,
    abilityToExecute: 'MEDIUM' as AbilityToExecute,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (epic) {
      setFormData({
        businessAlignment: epic.businessAlignment?.toString() ?? '',
        timeCriticality: epic.timeCriticality?.toString() ?? '',
        investorEnablement: epic.investorEnablement?.toString() ?? '',
        jobSize: epic.jobSize?.toString() ?? '',
        priorityToExecute: epic.priorityToExecute,
        abilityToExecute: epic.abilityToExecute,
      });
    }
  }, [epic]);

  if (!epic) return null;

  const parseNumber = (value: string): number | null => {
    const num = parseInt(value, 10);
    return isNaN(num) ? null : Math.min(20, Math.max(1, num));
  };

  const costOfDelay = (() => {
    const ba = parseNumber(formData.businessAlignment) ?? 0;
    const tc = parseNumber(formData.timeCriticality) ?? 0;
    const ie = parseNumber(formData.investorEnablement) ?? 0;
    if (formData.businessAlignment === '' && formData.timeCriticality === '' && formData.investorEnablement === '') {
      return null;
    }
    return ba + tc + ie;
  })();

  const technicalScore = (() => {
    const js = parseNumber(formData.jobSize);
    if (js && js > 0 && costOfDelay !== null) {
      return costOfDelay / js;
    }
    return null;
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API

      const updatedEpic: EpicBalancingEpic = {
        ...epic,
        businessAlignment: parseNumber(formData.businessAlignment),
        timeCriticality: parseNumber(formData.timeCriticality),
        investorEnablement: parseNumber(formData.investorEnablement),
        jobSize: parseNumber(formData.jobSize),
        priorityToExecute: formData.priorityToExecute,
        abilityToExecute: formData.abilityToExecute,
        costOfDelay,
        technicalScore,
      };

      onSave(updatedEpic);
      toast.success('Epic updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update epic');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 pr-8">
            <span className="text-brand-gold flex-shrink-0">{epic.key}</span>
            <span className="text-foreground truncate" title={epic.name}>{epic.name}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Linked Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Linked Items</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-accent/30 rounded-md">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Theme:</span>
                <span className="text-sm font-medium text-foreground truncate">
                  {epic.themeName || 'Not linked'}
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-accent/30 rounded-md">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Business Request:</span>
                <span className="text-sm font-medium text-foreground truncate">
                  {epic.businessRequestTitle || 'Not linked'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* WSJF Scoring Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Technical Score (WSJF) Inputs</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessAlignment">Business Alignment (1-20)</Label>
                <Input
                  id="businessAlignment"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.businessAlignment}
                  onChange={e => setFormData(prev => ({ ...prev, businessAlignment: e.target.value }))}
                  placeholder="1-20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeCriticality">Time Criticality (1-20)</Label>
                <Input
                  id="timeCriticality"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.timeCriticality}
                  onChange={e => setFormData(prev => ({ ...prev, timeCriticality: e.target.value }))}
                  placeholder="1-20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="investorEnablement">Investor Enablement (1-20)</Label>
                <Input
                  id="investorEnablement"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.investorEnablement}
                  onChange={e => setFormData(prev => ({ ...prev, investorEnablement: e.target.value }))}
                  placeholder="1-20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jobSize">Job Size (1-20)</Label>
                <Input
                  id="jobSize"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.jobSize}
                  onChange={e => setFormData(prev => ({ ...prev, jobSize: e.target.value }))}
                  placeholder="1-20"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Strategic Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Strategic Classification</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priorityToExecute">Priority to Execute</Label>
                <Select
                  value={formData.priorityToExecute}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priorityToExecute: v as PriorityToExecute }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[100]">
                    {PRIORITIES.map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_TO_EXECUTE_LABELS[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="abilityToExecute">Ability to Execute</Label>
                <Select
                  value={formData.abilityToExecute}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, abilityToExecute: v as AbilityToExecute }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[100]">
                    {ABILITIES.map(ability => (
                      <SelectItem key={ability} value={ability}>
                        {ability}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Calculated Values */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Calculated Values</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-accent/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Cost of Delay</div>
                <div className="text-lg font-semibold text-foreground">
                  {costOfDelay !== null ? costOfDelay : 'N/A'}
                </div>
              </div>
              
              <div className="p-3 bg-brand-gold/10 rounded-lg">
                <div className="text-xs text-muted-foreground">Technical Score</div>
                <div className="text-lg font-semibold text-brand-gold">
                  {technicalScore !== null ? technicalScore.toFixed(2) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-brand-gold hover:bg-brand-gold/90">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}