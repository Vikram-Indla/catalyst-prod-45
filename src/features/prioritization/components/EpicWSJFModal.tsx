import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Info, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { calculateWSJF } from '@/hooks/useWSJF';

interface EpicWSJFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicId: string;
  epicName: string;
  piId?: string;
}

export function EpicWSJFModal({
  open,
  onOpenChange,
  epicId,
  epicName,
  piId
}: EpicWSJFModalProps) {
  const [businessValue, setBusinessValue] = useState(5);
  const [timeValue, setTimeValue] = useState(5);
  const [rroeValue, setRroeValue] = useState(5);
  const [jobSize, setJobSize] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && piId) {
      loadWSJFData();
    }
  }, [open, epicId, piId]);

  const loadWSJFData = async () => {
    if (!piId) return;

    const { data, error } = await supabase
      .from('epic_wsjf')
      .select('*')
      .eq('epic_id', epicId)
      .eq('pi_id', piId)
      .maybeSingle();

    if (error) {
      console.error('Error loading WSJF data:', error);
      return;
    }

    if (data) {
      setBusinessValue(data.business_value || 5);
      setTimeValue(data.time_value || 5);
      setRroeValue(data.rroe_value || 5);
      setJobSize(data.job_size || 5);
    }
  };

  const wsjfScore = calculateWSJF(businessValue, timeValue, rroeValue, jobSize);

  const handleSave = async () => {
    if (!piId) {
      toast.error('No Program Increment selected');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('epic_wsjf')
        .upsert({
          epic_id: epicId,
          pi_id: piId,
          business_value: businessValue,
          time_value: timeValue,
          rroe_value: rroeValue,
          job_size: jobSize,
          wsjf_score: wsjfScore,
        }, {
          onConflict: 'epic_id,pi_id'
        });

      if (error) throw error;

      toast.success('WSJF prioritization saved successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-gold" />
            WSJF Prioritization: {epicName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="business">Business Value</TabsTrigger>
            <TabsTrigger value="time">Time Value</TabsTrigger>
            <TabsTrigger value="rroe">RR/OE</TabsTrigger>
            <TabsTrigger value="size">Job Size</TabsTrigger>
            <TabsTrigger value="calc">Calculations</TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 mb-4 p-3 bg-muted/50 rounded-md">
                  <Info className="h-4 w-4 text-brand-gold mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Business Value: What is the business value or revenue potential? How important is this to the business?
                  </p>
                </div>
                <div className="space-y-4">
                  <Label>Business Value: {businessValue}</Label>
                  <Slider
                    value={[businessValue]}
                    onValueChange={([val]) => setBusinessValue(val)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low (1)</span>
                    <span>High (10)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 mb-4 p-3 bg-muted/50 rounded-md">
                  <Info className="h-4 w-4 text-brand-gold mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Time Criticality: How time-critical is this? Will value decay over time? Is there a fixed deadline?
                  </p>
                </div>
                <div className="space-y-4">
                  <Label>Time Value: {timeValue}</Label>
                  <Slider
                    value={[timeValue]}
                    onValueChange={([val]) => setTimeValue(val)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low (1)</span>
                    <span>High (10)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rroe" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 mb-4 p-3 bg-muted/50 rounded-md">
                  <Info className="h-4 w-4 text-brand-gold mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Risk Reduction / Opportunity Enablement: Does this reduce future risks or enable new opportunities?
                  </p>
                </div>
                <div className="space-y-4">
                  <Label>RR/OE Value: {rroeValue}</Label>
                  <Slider
                    value={[rroeValue]}
                    onValueChange={([val]) => setRroeValue(val)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low (1)</span>
                    <span>High (10)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="size" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 mb-4 p-3 bg-muted/50 rounded-md">
                  <Info className="h-4 w-4 text-brand-gold mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Job Size: How much effort/complexity is involved? Larger numbers mean MORE effort (inverse in calculation).
                  </p>
                </div>
                <div className="space-y-4">
                  <Label>Job Size: {jobSize}</Label>
                  <Slider
                    value={[jobSize]}
                    onValueChange={([val]) => setJobSize(val)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Small (1)</span>
                    <span>Large (10)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calc" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                    <Info className="h-4 w-4 text-brand-gold mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      WSJF = (Business Value + Time Value + RR/OE Value) / Job Size
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Business Value</Label>
                      <div className="text-2xl font-semibold">{businessValue}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Time Value</Label>
                      <div className="text-2xl font-semibold">{timeValue}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">RR/OE Value</Label>
                      <div className="text-2xl font-semibold">{rroeValue}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Job Size</Label>
                      <div className="text-2xl font-semibold">{jobSize}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Cost of Delay (CoD)</Label>
                      <div className="text-2xl font-semibold text-brand-gold">
                        {businessValue + timeValue + rroeValue}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">WSJF Score</Label>
                      <div className="text-4xl font-bold text-brand-gold">
                        {wsjfScore?.toFixed(2) || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !piId}>
            {isLoading ? 'Saving...' : 'Save WSJF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
