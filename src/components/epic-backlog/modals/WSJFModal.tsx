import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

const WSJF_VALUES = [1, 2, 3, 5, 8, 13, 20];

interface Epic {
  id: string;
  numericId: number;
  title: string;
  businessValue?: number;
  timeValue?: number;
  rroeValue?: number;
  jobSize?: number;
}

interface WSJFModalProps {
  open: boolean;
  onClose: () => void;
  epics: Epic[];
  piId: string;
  piName: string;
  onSave: (updates: any[]) => void;
}

export function WSJFModal({ open, onClose, epics, piId, piName, onSave }: WSJFModalProps) {
  const [activeTab, setActiveTab] = useState("business-value");
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set());
  
  type WSJFValues = {
    businessValue: number;
    timeValue: number;
    rroeValue: number;
    jobSize: number;
  };
  
  const [wsjfData, setWsjfData] = useState<Record<string, WSJFValues>>({});

  const toggleEpic = (epicId: string) => {
    const newSelected = new Set(selectedEpics);
    if (newSelected.has(epicId)) {
      newSelected.delete(epicId);
    } else {
      newSelected.add(epicId);
    }
    setSelectedEpics(newSelected);
  };

  const updateValue = (epicId: string, field: keyof WSJFValues, value: number) => {
    setWsjfData((prev) => ({
      ...prev,
      [epicId]: {
        businessValue: 0,
        timeValue: 0,
        rroeValue: 0,
        jobSize: 1,
        ...prev[epicId],
        [field]: value,
      },
    }));
  };

  const calculateWSJF = (epic: Epic): number => {
    const data = wsjfData[epic.id] || { businessValue: 0, timeValue: 0, rroeValue: 0, jobSize: 1 };
    const bv = data.businessValue || epic.businessValue || 0;
    const tv = data.timeValue || epic.timeValue || 0;
    const rr = data.rroeValue || epic.rroeValue || 0;
    const js = data.jobSize || epic.jobSize || 1;
    
    if (js === 0) return 0;
    return Math.round(((bv + tv + rr) / js) * 100) / 100;
  };

  const handleSave = () => {
    const updates = epics.map((epic) => ({
      epicId: epic.id,
      piId,
      ...wsjfData[epic.id],
      wsjfScore: calculateWSJF(epic),
    }));
    onSave(updates);
    onClose();
  };

  const renderEpicRow = (epic: Epic, field: keyof WSJFValues) => {
    const defaultValue = field === 'jobSize' ? 1 : 0;
    const currentValue = wsjfData[epic.id]?.[field] || (epic[field] as number) || defaultValue;

    return (
      <div key={epic.id} className="flex items-center gap-4 py-3 border-b last:border-b-0 hover:bg-accent/50">
        <Checkbox
          checked={selectedEpics.has(epic.id)}
          onCheckedChange={() => toggleEpic(epic.id)}
        />
        <span className="text-sm text-muted-foreground w-16">{epic.numericId}</span>
        <span className="flex-1 text-sm">{epic.title}</span>
        <Select
          value={currentValue.toString()}
          onValueChange={(value) => updateValue(epic.id, field, parseInt(value))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WSJF_VALUES.map((val) => (
              <SelectItem key={val} value={val.toString()}>
                {val}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Weighted Shortest Job First - {piName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="business-value">Set Business Value</TabsTrigger>
            <TabsTrigger value="time-value">Set Time Value</TabsTrigger>
            <TabsTrigger value="rroe-value">Set RR/OE Value</TabsTrigger>
            <TabsTrigger value="job-size">Set Job Size</TabsTrigger>
            <TabsTrigger value="calculations">View Calculations</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="business-value" className="m-0">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Business Value</h3>
                    <p className="text-sm text-muted-foreground">
                      Relative value in the eyes of the customer/business, including such considerations as they prefer this over that, 
                      revenue impact on the business, and any penalty for slow or late delivery.
                    </p>
                  </div>
                  <div className="space-y-0">
                    {epics.map((epic) => renderEpicRow(epic, "businessValue"))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="time-value" className="m-0">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Time Value</h3>
                    <p className="text-sm text-muted-foreground">
                      Reflects how user value may decay (or CoD will increase) over time. Considerations include deadlines, 
                      customers' willingness to wait, and effect on satisfaction while feature is unavailable.
                    </p>
                  </div>
                  <div className="space-y-0">
                    {epics.map((epic) => renderEpicRow(epic, "timeValue"))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rroe-value" className="m-0">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">RR/OE Value (Risk Reduction / Opportunity Enablement)</h3>
                    <p className="text-sm text-muted-foreground">
                      1) Need to eliminate risks early 2) Value of information received 3) Potential for new business opportunities to be unlocked.
                    </p>
                  </div>
                  <div className="space-y-0">
                    {epics.map((epic) => renderEpicRow(epic, "rroeValue"))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="job-size" className="m-0">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Job Size</h3>
                    <p className="text-sm text-muted-foreground">
                      Estimate of effort required. Larger jobs may take longer even with more resources.
                    </p>
                  </div>
                  <div className="space-y-0">
                    {epics.map((epic) => renderEpicRow(epic, "jobSize"))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calculations" className="m-0">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">WSJF Calculation Formula</h3>
                    <p className="text-sm text-muted-foreground">
                      WSJF = (Business Value + Time Value + RR/OE Value) / Job Size
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-2 p-3 bg-muted font-semibold text-sm">
                      <div>ID</div>
                      <div className="col-span-2">Epic</div>
                      <div>BV</div>
                      <div>TV</div>
                      <div>RR/OE</div>
                      <div>Job Size</div>
                      <div>WSJF</div>
                    </div>
                    {epics.map((epic) => {
                      const data = wsjfData[epic.id] || { businessValue: 0, timeValue: 0, rroeValue: 0, jobSize: 1 };
                      const bv = data.businessValue || epic.businessValue || 0;
                      const tv = data.timeValue || epic.timeValue || 0;
                      const rr = data.rroeValue || epic.rroeValue || 0;
                      const js = data.jobSize || epic.jobSize || 1;
                      const wsjf = calculateWSJF(epic);

                      return (
                        <div key={epic.id} className="grid grid-cols-7 gap-2 p-3 border-b text-sm items-center">
                          <div className="text-muted-foreground">{epic.numericId}</div>
                          <div className="col-span-2 truncate">{epic.title}</div>
                          <div>{bv}</div>
                          <div>{tv}</div>
                          <div>{rr}</div>
                          <div>{js}</div>
                          <div className="font-semibold text-primary">{wsjf}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save WSJF Scores</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
