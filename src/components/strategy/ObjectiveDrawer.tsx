import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, Star, Share2, MoreVertical, MessageCircle, Plus, BarChart, CheckCircle, Maximize2, Pencil, ChevronRight, ChevronDown } from 'lucide-react';
import { CheckInModal } from './CheckInModal';
import { useObjectiveDetail, useUpdateObjective } from '@/hooks/useObjectiveDetail';

interface ObjectiveDrawerProps {
  objectiveId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ObjectiveDrawer({ objectiveId, open, onClose }: ObjectiveDrawerProps) {
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [selectedKeyResultId, setSelectedKeyResultId] = useState<string | null>(null);
  const [keyResultsExpanded, setKeyResultsExpanded] = useState(true);
  const [alignedWorkExpanded, setAlignedWorkExpanded] = useState(true);
  const [epicsExpanded, setEpicsExpanded] = useState(true);
  
  const { data: objective, isLoading } = useObjectiveDetail(objectiveId || undefined);
  const updateObjective = useUpdateObjective();

  if (!open) return null;

  const score = objective?.confidence_score || 0.7;
  const scoreColor = score >= 0.7 ? 'hsl(var(--okr-score-high))' : score >= 0.4 ? 'hsl(var(--okr-score-medium))' : 'hsl(var(--okr-score-low))';

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-[720px] p-0 flex flex-col">
          <div className="flex items-center justify-between py-4 px-6 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: scoreColor }} />
              <span className="text-sm text-muted-foreground">Objective {objectiveId}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
              <Button size="sm" variant="outline" onClick={onClose}>Save and close</Button>
              <Button size="sm">Save</Button>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : objective ? (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-[280px_1fr]">
                <div className="p-6 border-r space-y-6">
                  <h2 className="text-2xl font-semibold">{objective.name}</h2>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea defaultValue="" rows={4} className="resize-none" />
                  </div>
                  <div className="h-px bg-border" />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Hierarchy</h3>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-primary">Tier *</Label>
                      <div className="text-sm capitalize">{objective.level?.replace('_', ' ')}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Status</Label>
                      <Select defaultValue={objective.status || 'on_track'}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_track">On Track</SelectItem>
                          <SelectItem value="at_risk">At Risk</SelectItem>
                          <SelectItem value="off_track">Off Track</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <Card className="border-0" style={{ backgroundColor: scoreColor }}>
                    <CardContent className="p-6 space-y-4 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Objective score</span>
                        <span className="text-3xl font-bold">{score.toFixed(1)}</span>
                      </div>
                      <div>
                        <div className="text-xs mb-1">Key results progress</div>
                        <div className="h-1.5 bg-white/30 rounded-full">
                          <div className="h-full bg-white rounded-full" style={{ width: `${objective.progress_pct || 0}%` }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <div className="flex items-center justify-between py-3 cursor-pointer" onClick={() => setKeyResultsExpanded(!keyResultsExpanded)}>
                      <div className="flex items-center gap-2">
                        {keyResultsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold">Key results</span>
                        <Badge variant="secondary" className="rounded-full">{objective.keyResults?.length || 0}</Badge>
                      </div>
                      <button className="text-lg">+</button>
                    </div>
                    {keyResultsExpanded && objective.keyResults?.map((kr: any) => (
                      <Card key={kr.id} className="bg-muted/30 mb-2">
                        <CardContent className="p-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm">{kr.summary}</span>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedKeyResultId(kr.id);
                              setCheckInModalOpen(true);
                            }}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Check-in
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {selectedKeyResultId && (
        <CheckInModal
          keyResultId={selectedKeyResultId}
          open={checkInModalOpen}
          onClose={() => {
            setCheckInModalOpen(false);
            setSelectedKeyResultId(null);
          }}
        />
      )}
    </>
  );
}
