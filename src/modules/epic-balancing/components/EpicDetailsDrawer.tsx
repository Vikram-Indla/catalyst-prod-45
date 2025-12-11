import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EpicBalancingEpic } from '../types';

interface EpicDetailsDrawerProps {
  epic: EpicBalancingEpic | null;
  open: boolean;
  onClose: () => void;
  onSave: (epic: EpicBalancingEpic) => void;
}

export function EpicDetailsDrawer({ epic, open, onClose, onSave }: EpicDetailsDrawerProps) {
  const [formData, setFormData] = useState({
    businessAlignment: '',
    timeCriticality: '',
    investorEnablement: '',
    jobSize: '',
    themeId: '',
    businessRequestId: '',
  });
  const [saving, setSaving] = useState(false);

  // Fetch themes from database
  const { data: themes = [] } = useQuery({
    queryKey: ['strategic-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch business requests from database
  const { data: businessRequests = [] } = useQuery({
    queryKey: ['business-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, title, request_key')
        .order('request_key');
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (epic) {
      setFormData({
        businessAlignment: epic.businessAlignment?.toString() ?? '',
        timeCriticality: epic.timeCriticality?.toString() ?? '',
        investorEnablement: epic.investorEnablement?.toString() ?? '',
        jobSize: epic.jobSize?.toString() ?? '',
        themeId: epic.themeId ?? '',
        businessRequestId: epic.businessRequestId ?? '',
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

  // Get selected theme and business request names
  const selectedTheme = themes.find(t => t.id === formData.themeId);
  const selectedBusinessRequest = businessRequests.find(br => br.id === formData.businessRequestId);

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
        costOfDelay,
        technicalScore,
        themeId: formData.themeId || null,
        themeName: selectedTheme?.name || null,
        businessRequestId: formData.businessRequestId || null,
        businessRequestTitle: selectedBusinessRequest 
          ? `${selectedBusinessRequest.request_key}: ${selectedBusinessRequest.title}`
          : null,
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
      <SheetContent className="w-full sm:w-[540px] p-0 overflow-y-auto">
        {/* Header with Atlassian-style padding */}
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 pr-8">
            <span className="text-brand-gold flex-shrink-0">{epic.key}</span>
            <span className="text-foreground truncate" title={epic.name}>{epic.name}</span>
          </SheetTitle>
        </SheetHeader>

        {/* Body with consistent 24px gutters */}
        <div className="px-6 py-6 space-y-6">
          {/* Priority to Execute - Input Fields */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Priority to Execute</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessAlignment" className="text-sm text-muted-foreground">Business Alignment (1-20)</Label>
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
                <Label htmlFor="timeCriticality" className="text-sm text-muted-foreground">Time Criticality (1-20)</Label>
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
                <Label htmlFor="investorEnablement" className="text-sm text-muted-foreground">Investor Enablement (1-20)</Label>
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
                <Label htmlFor="jobSize" className="text-sm text-muted-foreground">Job Size (1-20)</Label>
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
          </section>

          <Separator />

          {/* Technical Score */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Technical Score</h3>
            <div className="rounded-xl bg-brand-gold/10 px-4 py-3">
              <div className="text-lg font-semibold text-brand-gold">
                {technicalScore !== null ? technicalScore.toFixed(2) : 'N/A'}
              </div>
            </div>
          </section>

          <Separator />

          {/* Linked Items */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Linked Items</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Label htmlFor="theme" className="text-sm text-muted-foreground">Theme</Label>
                </div>
                <Select
                  value={formData.themeId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, themeId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger id="theme" className="w-full focus:ring-brand-gold focus:border-brand-gold">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="none">Not linked</SelectItem>
                    {themes.map(theme => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Label htmlFor="businessRequest" className="text-sm text-muted-foreground">Business Request</Label>
                </div>
                <Select
                  value={formData.businessRequestId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, businessRequestId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger id="businessRequest" className="w-full focus:ring-brand-gold focus:border-brand-gold">
                    <SelectValue placeholder="Select a business request" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="none">Not linked</SelectItem>
                    {businessRequests.map(br => (
                      <SelectItem key={br.id} value={br.id}>
                        {br.request_key}: {br.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-brand-gold hover:bg-brand-gold/90 text-white">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}