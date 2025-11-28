import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Feature } from '@/types/feature.types';

interface FeatureWSJFDialogProps {
  features: Feature[];
  open: boolean;
  onClose: () => void;
}

export function FeatureWSJFDialog({ features, open, onClose }: FeatureWSJFDialogProps) {
  const [wsjfValues, setWSJFValues] = useState<Record<string, {
    businessValue: number;
    timeValue: number;
    rroeValue: number;
    jobSize: number;
  }>>({});

  const calculateWSJF = (featureId: string) => {
    const values = wsjfValues[featureId];
    if (!values || values.jobSize === 0) return 0;
    return (values.businessValue + values.timeValue + values.rroeValue) / values.jobSize;
  };

  const handleSave = () => {
    toast.success('WSJF scores updated');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>WSJF Prioritization</DialogTitle>
        </DialogHeader>

        {features.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Please select features to prioritize
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              WSJF = (Business Value + Time Value + Risk Reduction/Opportunity Enablement) / Job Size
            </div>

            <Tabs defaultValue="set-values" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="set-values">Set WSJF Values</TabsTrigger>
                <TabsTrigger value="view-calculations">View Calculations</TabsTrigger>
              </TabsList>

              <TabsContent value="set-values" className="space-y-4 mt-4">
                {features.map((feature) => (
                  <div key={feature.id} className="border rounded-lg p-4 space-y-3">
                    <div className="font-medium">{feature.name}</div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Business Value (1-100)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={wsjfValues[feature.id]?.businessValue || feature.business_value || ''}
                          onChange={(e) => setWSJFValues(prev => ({
                            ...prev,
                            [feature.id]: {
                              ...prev[feature.id],
                              businessValue: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Time Value (1-100)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={wsjfValues[feature.id]?.timeValue || feature.time_criticality || ''}
                          onChange={(e) => setWSJFValues(prev => ({
                            ...prev,
                            [feature.id]: {
                              ...prev[feature.id],
                              timeValue: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>RR/OE Value (1-100)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={wsjfValues[feature.id]?.rroeValue || feature.risk_reduction || ''}
                          onChange={(e) => setWSJFValues(prev => ({
                            ...prev,
                            [feature.id]: {
                              ...prev[feature.id],
                              rroeValue: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Job Size (1-100)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={wsjfValues[feature.id]?.jobSize || feature.job_size || ''}
                          onChange={(e) => setWSJFValues(prev => ({
                            ...prev,
                            [feature.id]: {
                              ...prev[feature.id],
                              jobSize: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="view-calculations" className="space-y-4 mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Feature</th>
                        <th className="text-right p-3">BV</th>
                        <th className="text-right p-3">TV</th>
                        <th className="text-right p-3">RR/OE</th>
                        <th className="text-right p-3">JS</th>
                        <th className="text-right p-3">WSJF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((feature) => {
                        const wsjf = calculateWSJF(feature.id);
                        const values = wsjfValues[feature.id] || {
                          businessValue: feature.business_value || 0,
                          timeValue: feature.time_criticality || 0,
                          rroeValue: feature.risk_reduction || 0,
                          jobSize: feature.job_size || 0
                        };

                        return (
                          <tr key={feature.id} className="border-t">
                            <td className="p-3">{feature.name}</td>
                            <td className="text-right p-3">{values.businessValue}</td>
                            <td className="text-right p-3">{values.timeValue}</td>
                            <td className="text-right p-3">{values.rroeValue}</td>
                            <td className="text-right p-3">{values.jobSize}</td>
                            <td className="text-right p-3 font-bold">{wsjf.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save WSJF Scores
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
