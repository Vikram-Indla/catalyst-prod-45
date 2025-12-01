import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FeatureWSJFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureId: string;
  featureName: string;
}

const WSJF_SCALE = Array.from({ length: 20 }, (_, i) => i + 1);

const WSJF_DESCRIPTIONS = {
  business: "Relative value in the eyes of the customer/business, including such considerations as they prefer this over that, revenue impact on the business, and any penalty (cost, market share) for slow or late delivery.",
  time: "This parameter reflects how the user value may decay (or CoD will increase) over time. Considerations include deadlines; customers willingness to wait, and the effect on customer satisfaction while the feature is not available.",
  rroe: "This last element is an aggregation of three things: 1) the need to eliminate risks early, 2) giving credit to the value of the information received, and 3) the potential for new business opportunities that might be unlocked.",
  jobsize: "If availability of resources means that a larger job may be delivered more quickly than some other job, then the job size estimate must be converted to job length to have a more accurate result. But rarely is that the case."
};

export function FeatureWSJFModal({ open, onOpenChange, featureId, featureName }: FeatureWSJFModalProps) {
  const [businessValue, setBusinessValue] = useState<number>(1);
  const [timeValue, setTimeValue] = useState<number>(1);
  const [rroeValue, setRroeValue] = useState<number>(1);
  const [jobSize, setJobSize] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  const wsjfScore = jobSize > 0 
    ? ((businessValue + timeValue + rroeValue) / jobSize).toFixed(2)
    : '0.00';

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('features')
        .update({
          business_value: businessValue,
          time_criticality: timeValue,
          risk_reduction: rroeValue,
          job_size: jobSize,
          wsjf_score: parseFloat(wsjfScore)
        })
        .eq('id', featureId);

      if (error) throw error;

      toast.success('WSJF scores updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update WSJF: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weighted Shortest Job First - {featureName}</DialogTitle>
          <DialogDescription>
            Set WSJF prioritization factors for this feature
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="business">Business Value</TabsTrigger>
            <TabsTrigger value="time">Time Value</TabsTrigger>
            <TabsTrigger value="rroe">RR/OE</TabsTrigger>
            <TabsTrigger value="jobsize">Job Size</TabsTrigger>
            <TabsTrigger value="calculations">Calculations</TabsTrigger>
          </TabsList>

          {/* Business Value Tab */}
          <TabsContent value="business" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-1 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {WSJF_DESCRIPTIONS.business}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Set Business Value (1-20)</Label>
                <Select value={businessValue.toString()} onValueChange={(v) => setBusinessValue(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WSJF_SCALE.map((val) => (
                      <SelectItem key={val} value={val.toString()}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Time Value Tab */}
          <TabsContent value="time" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-1 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {WSJF_DESCRIPTIONS.time}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Set Time Value (1-20)</Label>
                <Select value={timeValue.toString()} onValueChange={(v) => setTimeValue(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WSJF_SCALE.map((val) => (
                      <SelectItem key={val} value={val.toString()}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* RR/OE Tab */}
          <TabsContent value="rroe" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-1 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {WSJF_DESCRIPTIONS.rroe}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Set Risk Reduction / Opportunity Enablement (1-20)</Label>
                <Select value={rroeValue.toString()} onValueChange={(v) => setRroeValue(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WSJF_SCALE.map((val) => (
                      <SelectItem key={val} value={val.toString()}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Job Size Tab */}
          <TabsContent value="jobsize" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-1 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {WSJF_DESCRIPTIONS.jobsize}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Set Job Size (1-20)</Label>
                <Select value={jobSize.toString()} onValueChange={(v) => setJobSize(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WSJF_SCALE.map((val) => (
                      <SelectItem key={val} value={val.toString()}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Calculations Tab */}
          <TabsContent value="calculations" className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Business Value</Label>
                  <p className="text-2xl font-semibold">{businessValue}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Time Value</Label>
                  <p className="text-2xl font-semibold">{timeValue}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Risk Reduction / OE</Label>
                  <p className="text-2xl font-semibold">{rroeValue}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Job Size</Label>
                  <p className="text-2xl font-semibold">{jobSize}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    ({businessValue} + {timeValue} + {rroeValue}) / {jobSize}
                  </p>
                  <div>
                    <Label className="text-muted-foreground">WSJF Score</Label>
                    <p className="text-4xl font-bold text-primary">{wsjfScore}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save WSJF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
