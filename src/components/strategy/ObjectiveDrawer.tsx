import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, Share2, MoreVertical, MessageCircle, Plus, BarChart, CheckCircle, Maximize2, Pencil, ChevronRight, ChevronDown, X } from 'lucide-react';
import { CheckInModal } from './CheckInModal';
import { useObjectiveDetail, useUpdateObjective, useCreateCheckIn, useDeleteCheckIn } from '@/hooks/useObjectiveDetail';

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
  const [themesExpanded, setThemesExpanded] = useState(true);
  const [epicsExpanded, setEpicsExpanded] = useState(true);
  const [dependenciesExpanded, setDependenciesExpanded] = useState(true);
  const [risksExpanded, setRisksExpanded] = useState(true);
  const [impedimentsExpanded, setImpedimentsExpanded] = useState(false);
  const [childObjectivesExpanded, setChildObjectivesExpanded] = useState(false);
  const [linkedItemsExpanded, setLinkedItemsExpanded] = useState(false);
  
  const { data: objective, isLoading } = useObjectiveDetail(objectiveId || undefined);
  const updateObjective = useUpdateObjective();
  const createCheckIn = useCreateCheckIn();
  const deleteCheckIn = useDeleteCheckIn();

  const selectedKeyResult = objective?.keyResults?.find((kr: any) => kr.id === selectedKeyResultId);

  if (!open) return null;

  const score = objective?.confidence_score || 0.7;
  const scoreColor = score >= 0.7 ? 'hsl(var(--okr-score-high))' : score >= 0.4 ? 'hsl(var(--okr-score-medium))' : 'hsl(var(--okr-score-low))';
  
  const numericId = objectiveId ? parseInt(objectiveId.split('-')[0]) || objectiveId.substring(0, 4) : '';

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-[1000px] p-0 flex flex-col overflow-hidden bg-background">
          {/* Header */}
          <div className="flex items-center justify-between py-3 px-6 border-b flex-shrink-0 bg-card">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-5 h-5 rounded bg-green-100 border border-green-600">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Objective {numericId}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={onClose} className="text-muted-foreground">Close</Button>
              <Button size="sm" variant="outline">Save and close</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
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
              <div className="grid grid-cols-[420px_1fr]">
                {/* Left Panel */}
                <div className="p-6 border-r bg-card space-y-6">
                  {/* Title with Icons */}
                  <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-semibold leading-tight pr-4">{objective.name}</h2>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">Description *</Label>
                    <Textarea 
                      defaultValue="Use automation as driver for capital efficiency" 
                      rows={3} 
                      className="resize-none text-sm"
                    />
                  </div>

                  <div className="h-px bg-border" />

                  {/* Hierarchy Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base">Hierarchy</h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-blue-600">Tier *</Label>
                        <div className="text-sm font-medium capitalize">{objective.level?.replace('_', ' ') || 'Portfolio'}</div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Portfolio *</Label>
                        <Select defaultValue="digital-services">
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="digital-services">Digital Services</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Programs *</Label>
                        <div className="text-sm">AI, Web, Mobile, Blockchain</div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Status</Label>
                        <Select defaultValue={objective.status || 'on_track'}>
                          <SelectTrigger className="h-9 text-sm bg-green-50 border-green-200">
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

                  <div className="h-px bg-border" />

                  {/* Dates Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base">Dates</h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Program Increment *</Label>
                        <div className="text-sm">PI-5, PI-6, PI-7</div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1">
                          Anchor sprint
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-xs">?</span>
                          *
                        </Label>
                        <div className="text-sm">PI76 (4/25-5/8)</div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Start date</Label>
                        <Input type="text" placeholder="Set a start date" className="h-9 text-sm" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Due date</Label>
                        <Input type="text" placeholder="Set a due date" className="h-9 text-sm" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Blocked</Label>
                        <RadioGroup defaultValue="no" className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="no" className="border-blue-600 text-blue-600" />
                            <Label htmlFor="no" className="text-sm font-normal cursor-pointer">No</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="yes" />
                            <Label htmlFor="yes" className="text-sm font-normal cursor-pointer">Yes</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Hierarchy Bottom */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base">Hierarchy</h3>
                    <div className="text-sm text-muted-foreground">No parent or child items</div>
                  </div>
                </div>

                {/* Right Panel */}
                <div className="p-6 space-y-4 bg-background">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 px-3 py-1">
                      On Track
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-blue-600 h-8">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Discussions
                        <Badge variant="destructive" className="ml-1 rounded-full w-5 h-5 p-0 flex items-center justify-center">0</Badge>
                      </Button>
                    </div>
                  </div>

                  {/* Objective Score Card */}
                  <Card className="border-0 shadow-sm" style={{ backgroundColor: scoreColor }}>
                    <CardContent className="p-6 space-y-3 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Objective score</span>
                        <span className="text-4xl font-bold">{score.toFixed(1)}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium">Key results progress</div>
                        <div className="h-2 bg-slate-900/30 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full" style={{ width: `${objective.progress_pct || 0}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium">Aligned work progress</div>
                        <div className="h-2 bg-slate-900/30 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full" style={{ width: '60%' }} />
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-full justify-start text-white hover:bg-white/20 mt-2 h-8"
                      >
                        <Pencil className="h-3 w-3 mr-2" />
                        Update confidence score
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Key Results Section */}
                  <div className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setKeyResultsExpanded(!keyResultsExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        {keyResultsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">Key results</span>
                        <Badge variant="secondary" className="rounded-full h-5 px-2 text-xs">{objective.keyResults?.length || 1}</Badge>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {keyResultsExpanded && (
                      <div className="px-4 pb-4 space-y-2">
                        <div className="flex items-center justify-between p-3 border rounded bg-card hover:bg-muted/30 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4" />
                            <span className="text-sm">Automation of 50 processes</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-green-600">0.8</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aligned Work Items Section */}
                  <div className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setAlignedWorkExpanded(!alignedWorkExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        {alignedWorkExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">Aligned work items</span>
                        <Badge variant="secondary" className="rounded-full h-5 px-2 text-xs">2</Badge>
                      </div>
                    </div>
                    {alignedWorkExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Themes */}
                        <div>
                          <div 
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/30 rounded"
                            onClick={() => setThemesExpanded(!themesExpanded)}
                          >
                            <div className="flex items-center gap-2">
                              {themesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span className="text-sm font-medium">Themes</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-5 w-5">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          {themesExpanded && (
                            <div className="ml-5 mt-2 text-sm text-muted-foreground italic">
                              You haven't added any aligned themes yet. Add a theme.
                            </div>
                          )}
                        </div>

                        {/* Epics */}
                        <div>
                          <div 
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/30 rounded"
                            onClick={() => setEpicsExpanded(!epicsExpanded)}
                          >
                            <div className="flex items-center gap-2">
                              {epicsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <span className="text-sm font-medium">Epics</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-5 w-5">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          {epicsExpanded && (
                            <div className="ml-5 mt-2 space-y-2">
                              {[
                                { id: '1184', title: 'Advanced Voice Activation for T...', progress: 40 },
                                { id: '1168', title: 'AI for Improved Call Center Inter...', progress: 60 }
                              ].map(epic => (
                                <div key={epic.id} className="flex items-center gap-3 p-2 border rounded bg-card hover:bg-muted/30">
                                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <span className="text-xs text-blue-600 font-medium">{epic.id}</span>
                                  <span className="text-sm flex-1 truncate">{epic.title}</span>
                                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-700 rounded-full" style={{ width: `${epic.progress}%` }} />
                                  </div>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 flex-shrink-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dependencies */}
                  <div className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setDependenciesExpanded(!dependenciesExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        {dependenciesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">Dependencies</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">NC</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">C</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">D</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">B</span>
                        <span className="text-muted-foreground">-</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Risks */}
                  <div className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setRisksExpanded(!risksExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        {risksExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">Risks</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">R</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">O</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">A</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-muted-foreground">M</span>
                        <span className="text-muted-foreground">-</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {risksExpanded && (
                      <div className="px-4 pb-4">
                        <div className="flex items-center gap-3 p-2 border rounded bg-card">
                          <span className="text-xs font-medium">20</span>
                          <span className="text-sm flex-1 text-blue-600">D2D Epic Risk 1 (Owned)</span>
                          <Badge variant="outline" className="text-xs">OWNED</Badge>
                          <Button size="icon" variant="ghost" className="h-5 w-5">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Impediments */}
                  <div className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setImpedimentsExpanded(!impedimentsExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        {impedimentsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">Impediments</span>
                      </div>
                      <Button size="icon" variant="ghost" className="h-5 w-5">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Child Objectives */}
                  <div className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setChildObjectivesExpanded(!childObjectivesExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        {childObjectivesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">Child objectives</span>
                        <Badge variant="secondary" className="rounded-full h-5 px-2 text-xs">0</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Linked Items */}
                  <div className="border rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setLinkedItemsExpanded(!linkedItemsExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        {linkedItemsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">Linked items</span>
                        <Badge variant="secondary" className="rounded-full h-5 px-2 text-xs">0</Badge>
                      </div>
                      <Button size="icon" variant="ghost" className="h-5 w-5">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {selectedKeyResultId && selectedKeyResult && (
        <CheckInModal
          keyResult={selectedKeyResult}
          checkins={selectedKeyResult.checkins || []}
          open={checkInModalOpen}
          onClose={() => {
            setCheckInModalOpen(false);
            setSelectedKeyResultId(null);
          }}
          onUpdate={(value, note, date) => {
            createCheckIn.mutate({ keyResultId: selectedKeyResultId, value, note, date });
          }}
          onDelete={(checkinId) => {
            deleteCheckIn.mutate(checkinId);
          }}
        />
      )}
    </>
  );
}
