import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  EpicBalancingEpic, 
  StrategicDriver, 
  AbilityToExecute,
  STRATEGIC_DRIVER_LABELS 
} from '../types';

interface EpicDetailsDrawerProps {
  epic: EpicBalancingEpic | null;
  open: boolean;
  onClose: () => void;
  onSave: (epic: EpicBalancingEpic) => void;
}

const DRIVERS: StrategicDriver[] = [
  'EXPAND', 'SUSTAIN', 'INNOVATE', 'CONTAIN', 'EXIT', 'UNKNOWN', 'NOT_SET'
];

const ABILITIES: AbilityToExecute[] = ['HIGH', 'MEDIUM', 'LOW'];

export function EpicDetailsDrawer({ epic, open, onClose, onSave }: EpicDetailsDrawerProps) {
  const [formData, setFormData] = useState({
    businessValue: '',
    timeCriticality: '',
    opportunityEnablement: '',
    jobSize: '',
    strategicDriver: 'NOT_SET' as StrategicDriver,
    abilityToExecute: 'MEDIUM' as AbilityToExecute,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (epic) {
      setFormData({
        businessValue: epic.businessValue?.toString() ?? '',
        timeCriticality: epic.timeCriticality?.toString() ?? '',
        opportunityEnablement: epic.opportunityEnablement?.toString() ?? '',
        jobSize: epic.jobSize?.toString() ?? '',
        strategicDriver: epic.strategicDriver,
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
    const bv = parseNumber(formData.businessValue) ?? 0;
    const tc = parseNumber(formData.timeCriticality) ?? 0;
    const opp = parseNumber(formData.opportunityEnablement) ?? 0;
    if (formData.businessValue === '' && formData.timeCriticality === '' && formData.opportunityEnablement === '') {
      return null;
    }
    return bv + tc + opp;
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
      // TODO: Replace with real API call
      // await fetch(`/api/epics/${epic.id}`, {
      //   method: 'PATCH',
      //   body: JSON.stringify(formData),
      // });

      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API

      const updatedEpic: EpicBalancingEpic = {
        ...epic,
        businessValue: parseNumber(formData.businessValue),
        timeCriticality: parseNumber(formData.timeCriticality),
        opportunityEnablement: parseNumber(formData.opportunityEnablement),
        jobSize: parseNumber(formData.jobSize),
        strategicDriver: formData.strategicDriver,
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
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-brand-gold">{epic.key}</span>
            <span className="text-foreground">{epic.name}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* WSJF Scoring Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Technical Score (WSJF) Inputs</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessValue">Business Value (1-20)</Label>
                <Input
                  id="businessValue"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.businessValue}
                  onChange={e => setFormData(prev => ({ ...prev, businessValue: e.target.value }))}
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
                <Label htmlFor="opportunityEnablement">Opportunity Enablement (1-20)</Label>
                <Input
                  id="opportunityEnablement"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.opportunityEnablement}
                  onChange={e => setFormData(prev => ({ ...prev, opportunityEnablement: e.target.value }))}
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
                <Label htmlFor="strategicDriver">Strategic Driver</Label>
                <Select
                  value={formData.strategicDriver}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, strategicDriver: v as StrategicDriver }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[100]">
                    {DRIVERS.map(driver => (
                      <SelectItem key={driver} value={driver}>
                        {STRATEGIC_DRIVER_LABELS[driver]}
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
