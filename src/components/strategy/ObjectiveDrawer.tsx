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
import { Star, Share2, MoreVertical, MessageCircle, Plus, BarChart2, CheckCircle, Maximize2, Pencil, ChevronRight, ChevronDown, User, X } from 'lucide-react';
import { useObjectiveDetail } from '@/hooks/useObjectiveDetail';

interface ObjectiveDrawerProps {
  objectiveId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ObjectiveDrawer({ objectiveId, open, onClose }: ObjectiveDrawerProps) {
  const [keyResultsExpanded, setKeyResultsExpanded] = useState(true);
  const [alignedWorkExpanded, setAlignedWorkExpanded] = useState(true);
  const [epicsExpanded, setEpicsExpanded] = useState(true);
  const [dependenciesExpanded, setDependenciesExpanded] = useState(false);
  const [risksExpanded, setRisksExpanded] = useState(true);
  const [impedimentsExpanded, setImpedimentsExpanded] = useState(false);
  const [childObjectivesExpanded, setChildObjectivesExpanded] = useState(false);
  const [linkedItemsExpanded, setLinkedItemsExpanded] = useState(false);
  
  const { data: objective, isLoading } = useObjectiveDetail(objectiveId || undefined);

  console.log('🎨 ObjectiveDrawer render:', { objectiveId, open, isLoading, hasObjective: !!objective });

  if (!open) return null;

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-[1100px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading objective...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!objective) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-[1100px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Objective not found</p>
            <p className="text-sm text-muted-foreground mt-2">The requested objective could not be loaded.</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const score = objective?.confidence_score || 0.7;
  const scoreColor = score >= 0.7 ? '#22c55e' : score >= 0.4 ? '#eab308' : '#ef4444';
  
  const numericId = objective.id.substring(0, 8);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[1100px] p-0 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-4 h-4 rounded-sm bg-green-100">
              <CheckCircle className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Objective {numericId}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 text-sm">Close</Button>
            <Button size="sm" variant="outline" className="h-8 text-sm">Save and close</Button>
            <Button size="sm" className="h-8 text-sm bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
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
            <div className="grid grid-cols-[440px_1fr] h-full">
              {/* Left Panel */}
              <div className="p-6 border-r bg-card space-y-6 overflow-auto">
                {/* Title Section */}
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h2 className="text-2xl font-semibold leading-tight flex-1">
                      {objective.summary || 'Untitled Objective'}
                    </h2>
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Description *</Label>
                  <Textarea 
                    defaultValue="Implement repeatable process where all call-in customers receive digital customer satisfaction surveys within 48 hours by end of fiscal year."
                    rows={4}
                    className="resize-none text-sm border-gray-300"
                  />
                </div>

                <div className="h-px bg-border" />

                {/* Hierarchy Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base">Hierarchy</h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-blue-600">Tier *</Label>
                      <div className="text-sm font-medium">Portfolio</div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Portfolio *</Label>
                      <div className="text-sm font-medium">Digital Services</div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Programs *</Label>
                      <div className="text-sm">AI, Web, Mobile, Blockchain</div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Status</Label>
                      <Select defaultValue="on_track">
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
                      <Label className="text-xs font-semibold">Release *</Label>
                      <div className="text-sm">Q1-5, QI-6</div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        Anchor sprint
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] font-medium">i</span>
                        *
                      </Label>
                      <div className="text-sm">1R23 (9/21-10/4)</div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Start date</Label>
                      <Input type="date" defaultValue="2025-04-01" className="h-9 text-sm" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Due date</Label>
                      <Input type="date" defaultValue="2025-10-03" className="h-9 text-sm" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Blocked</Label>
                      <RadioGroup defaultValue="no" className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="blocked-no" className="border-blue-600 text-blue-600" />
                          <Label htmlFor="blocked-no" className="text-sm font-normal cursor-pointer">No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="blocked-yes" />
                          <Label htmlFor="blocked-yes" className="text-sm font-normal cursor-pointer">Yes</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="p-6 bg-background space-y-4 overflow-auto">
                {/* Top Row - Discussions */}
                <div className="flex items-center justify-end">
                  <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 h-8">
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    Discussions
                    <Badge variant="destructive" className="ml-1.5 rounded-full w-5 h-5 p-0 flex items-center justify-center text-xs">
                      0
                    </Badge>
                  </Button>
                </div>

                {/* Objective Score Card */}
                <Card className="border-0 shadow-sm" style={{ backgroundColor: scoreColor }}>
                  <CardContent className="p-5 space-y-3 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Objective score</span>
                      <span className="text-4xl font-bold">{score.toFixed(1)}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium">Key results progress</div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white/60" style={{ width: `${(objective.key_result_progress || 0) * 100}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium">Aligned work progress</div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white/60" style={{ width: `${(objective.work_progress || 0) * 100}%` }} />
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-white/10 mt-2 h-9"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Update confidence score
                    </Button>
                  </CardContent>
                </Card>

                {/* Key Results Section */}
                <div className="border rounded-lg bg-card">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setKeyResultsExpanded(!keyResultsExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      {keyResultsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold text-sm">Key results</span>
                      <Badge variant="secondary" className="rounded-full h-5 px-2 text-xs font-medium">1</Badge>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {keyResultsExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      <div className="border rounded-lg p-3 bg-background hover:bg-muted/30">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span className="text-sm font-medium">Decrease churn rate</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-green-600">0.7</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between ml-6">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Key result owner</span>
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px] bg-blue-100 text-blue-600">
                                <User className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">Site Admin</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              <BarChart2 className="h-3 w-3 mr-1" />
                              Reports
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Check-in
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Aligned Work Items Section */}
                <div className="border rounded-lg bg-card">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setAlignedWorkExpanded(!alignedWorkExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      {alignedWorkExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold text-sm">Aligned work items</span>
                      <Badge variant="secondary" className="rounded-full h-5 px-2 text-xs font-medium">2</Badge>
                    </div>
                  </div>
                  {alignedWorkExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Epics */}
                      <div>
                        <div 
                          className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/30 rounded"
                          onClick={() => setEpicsExpanded(!epicsExpanded)}
                        >
                          <div className="flex items-center gap-2">
                            {epicsExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            <span className="text-sm font-medium">Epics</span>
                          </div>
                          <Button size="icon" variant="ghost" className="h-5 w-5">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        {epicsExpanded && (
                          <div className="ml-6 mt-2 space-y-2">
                            <div className="flex items-center justify-between p-2 border rounded bg-background hover:bg-muted/30">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-blue-600" />
                                <span className="text-xs font-medium text-blue-600">101</span>
                                <span className="text-sm">D2D Epic 1</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-12 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-gray-400" style={{ width: '50%' }} />
                                </div>
                                <Button size="icon" variant="ghost" className="h-5 w-5">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dependencies Section */}
                <div className="border rounded-lg bg-card">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setDependenciesExpanded(!dependenciesExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      {dependenciesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold text-sm">Dependencies</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="rounded-sm h-5 px-1.5 text-[10px] font-semibold">NC</Badge>
                      <Badge variant="outline" className="rounded-sm h-5 px-1.5 text-[10px] font-semibold">C</Badge>
                      <Badge variant="outline" className="rounded-sm h-5 px-1.5 text-[10px] font-semibold">D</Badge>
                      <Badge variant="outline" className="rounded-sm h-5 px-1.5 text-[10px] font-semibold">B</Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6 ml-1">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Risks Section */}
                <div className="border rounded-lg bg-card">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setRisksExpanded(!risksExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      {risksExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold text-sm">Risks</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="rounded-sm h-5 px-1.5 text-[10px] font-semibold">R</Badge>
                      <Badge variant="outline" className="rounded-sm h-5 px-1.5 text-[10px] font-semibold">O</Badge>
                      <Badge variant="outline" className="rounded-sm h-5 px-1.5 text-[10px] font-semibold">I</Badge>
                      <Badge variant="outline" className="rounded-sm h-5 px-1.5 text-[10px] font-semibold">A</Badge>
                      <Badge variant="outline" className="rounded-sm h-5 px-1.5 text-[10px] font-semibold">M</Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6 ml-1">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {risksExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded bg-background hover:bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">20</span>
                          <span className="text-sm text-blue-600">D2D Epic Risk 1 (Owned)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-sm h-5 px-2 text-xs">OWNED</Badge>
                          <Button size="icon" variant="ghost" className="h-5 w-5">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Impediments Section */}
                <div className="border rounded-lg bg-card">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setImpedimentsExpanded(!impedimentsExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      {impedimentsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold text-sm">Impediments</span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Child Objectives Section */}
                <div className="border rounded-lg bg-card">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setChildObjectivesExpanded(!childObjectivesExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      {childObjectivesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold text-sm">Child objectives</span>
                      <Badge variant="secondary" className="rounded-full h-5 px-2 text-xs font-medium">0</Badge>
                    </div>
                  </div>
                </div>

                {/* Linked Items Section */}
                <div className="border rounded-lg bg-card">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setLinkedItemsExpanded(!linkedItemsExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      {linkedItemsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold text-sm">Linked items</span>
                      <Badge variant="secondary" className="rounded-full h-5 px-2 text-xs font-medium">0</Badge>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-muted-foreground">Objective not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}