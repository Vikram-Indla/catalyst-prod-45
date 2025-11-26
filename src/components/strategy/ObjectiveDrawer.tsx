import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, Star, Share2, MoreVertical, MessageCircle, Plus, BarChart, CheckCircle, Maximize2, Pencil, ChevronRight, ChevronDown } from 'lucide-react';

interface ObjectiveDrawerProps {
  objective: any;
  open: boolean;
  onClose: () => void;
}

export function ObjectiveDrawer({ objective, open, onClose }: ObjectiveDrawerProps) {
  const [confidenceDialogOpen, setConfidenceDialogOpen] = useState(false);
  const [keyResultsExpanded, setKeyResultsExpanded] = useState(true);
  const [alignedWorkExpanded, setAlignedWorkExpanded] = useState(true);
  const [epicsExpanded, setEpicsExpanded] = useState(true);
  const [dependenciesExpanded, setDependenciesExpanded] = useState(false);
  const [risksExpanded, setRisksExpanded] = useState(true);
  const [impedimentsExpanded, setImpedimentsExpanded] = useState(false);

  if (!objective) return null;

  const score = objective.score || 0.7;
  const scoreColor = score >= 0.7 ? 'hsl(var(--okr-score-high))' : score >= 0.4 ? 'hsl(var(--okr-score-medium))' : 'hsl(var(--okr-score-low))';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[720px] p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between py-4 px-6 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: scoreColor }} />
              <span className="text-sm text-muted-foreground">Objective {objective.numericId || objective.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
            <Button size="sm" variant="outline">Save and close</Button>
            <Button size="sm">Save</Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body - Two Column Layout */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[280px_1fr]">
            {/* Left Sidebar */}
            <div className="p-6 border-r space-y-6 overflow-y-auto">
              {/* Title */}
              <div>
                <h2 className="text-2xl font-semibold leading-tight">
                  {objective.title || 'Outcome for all call-in customers'}
                </h2>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description *</Label>
                <Textarea
                  defaultValue={objective.description || 'Implement repeatable process where all call-in customers receive digital customer satisfaction surveys within 48 hours by end of fiscal year.'}
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>

              <div className="h-px bg-border" />

              {/* Hierarchy */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Hierarchy</h3>
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-primary">Tier *</Label>
                  <div className="text-sm">Portfolio</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-primary">Portfolio *</Label>
                  <div className="text-sm">Digital Services</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-primary">Programs *</Label>
                  <div className="text-sm">AI, Web, Mobile, Blockchain</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Status</Label>
                  <Select defaultValue="on-track">
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-track">On Track</SelectItem>
                      <SelectItem value="at-risk">At Risk</SelectItem>
                      <SelectItem value="off-track">Off Track</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Dates</h3>

                <div className="space-y-2">
                  <Label className="text-xs">Release *</Label>
                  <div className="text-sm">Q1-5, QI-6</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Anchor sprint * <span className="text-muted-foreground">ⓘ</span></Label>
                  <div className="text-sm">1R23 (9/21-10/4)</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Start date</Label>
                  <div className="flex items-center justify-between text-sm">
                    <span>4/1/2025</span>
                    <button className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Due date</Label>
                  <div className="flex items-center justify-between text-sm">
                    <span>10/3/2025</span>
                    <button className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Blocked</Label>
                  <RadioGroup defaultValue="no" className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="no" />
                      <Label htmlFor="no" className="text-xs font-normal">No</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="yes" />
                      <Label htmlFor="yes" className="text-xs font-normal">Yes</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Right Main Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Secondary Actions Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-primary cursor-pointer">
                  <MessageCircle className="h-4 w-4" />
                  <span>Discussions</span>
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                    0
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-muted-foreground hover:text-foreground">
                    <Star className="h-4 w-4" />
                  </button>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button className="text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Score Card */}
              <Card className="border-0" style={{ backgroundColor: scoreColor }}>
                <CardContent className="p-6 space-y-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium opacity-90">Objective score</span>
                    <span className="text-3xl font-bold">{score.toFixed(1)}</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs opacity-90 mb-1">Key results progress</div>
                      <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${(objective.keyResultsProgress || 70)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs opacity-90 mb-1">Aligned work progress</div>
                      <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${(objective.alignedWorkProgress || 45)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    className="flex items-center gap-1 text-sm text-white hover:underline"
                    onClick={() => setConfidenceDialogOpen(true)}
                  >
                    <Pencil className="h-3 w-3" />
                    Update confidence score
                  </button>
                </CardContent>
              </Card>

              {/* Key Results Section */}
              <div>
                <div
                  className="flex items-center justify-between py-3 cursor-pointer"
                  onClick={() => setKeyResultsExpanded(!keyResultsExpanded)}
                >
                  <div className="flex items-center gap-2">
                    {keyResultsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-md font-semibold">Key results</span>
                    <Badge variant="secondary" className="rounded-full text-xs">1</Badge>
                  </div>
                  <button className="text-lg text-muted-foreground hover:text-primary">+</button>
                </div>

                {keyResultsExpanded && (
                  <div className="space-y-3 pl-6">
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Decrease churn rate</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
                              0.7
                            </span>
                            <button className="text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Key result owner *</Label>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 bg-neutral-500">
                              <AvatarFallback className="text-white text-xs">SA</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">Site Admin</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs">
                            <BarChart className="h-3 w-3 mr-1" />
                            Reports
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Check-in
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Aligned Work Items Section */}
              <div>
                <div
                  className="flex items-center justify-between py-3 cursor-pointer border-t"
                  onClick={() => setAlignedWorkExpanded(!alignedWorkExpanded)}
                >
                  <div className="flex items-center gap-2">
                    {alignedWorkExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-md font-semibold">Aligned work items</span>
                    <Badge variant="secondary" className="rounded-full text-xs">2</Badge>
                  </div>
                  <button className="text-lg text-muted-foreground hover:text-primary">+</button>
                </div>

                {alignedWorkExpanded && (
                  <div className="space-y-2 pl-6">
                    {/* Epics */}
                    <div>
                      <div
                        className="flex items-center justify-between py-2 cursor-pointer"
                        onClick={() => setEpicsExpanded(!epicsExpanded)}
                      >
                        <div className="flex items-center gap-2">
                          {epicsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-sm font-medium">Epics</span>
                        </div>
                        <button className="text-lg text-muted-foreground hover:text-primary">+</button>
                      </div>

                      {epicsExpanded && (
                        <div className="space-y-2 pl-6">
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                            <div className="w-4 h-4 rounded border border-primary bg-primary/10" />
                            <span className="text-primary font-medium">101</span>
                            <span className="flex-1">D2D Epic 1</span>
                            <Progress value={35} className="w-16 h-1" />
                            <button className="text-muted-foreground">
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dependencies */}
                    <div>
                      <div
                        className="flex items-center justify-between py-2 cursor-pointer"
                        onClick={() => setDependenciesExpanded(!dependenciesExpanded)}
                      >
                        <div className="flex items-center gap-2">
                          {dependenciesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-sm font-medium">Dependencies</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>NC</span> <span>-</span>
                            <span>C</span> <span>-</span>
                            <span>D</span> <span>-</span>
                            <span>B</span> <span>-</span>
                          </div>
                        </div>
                        <button className="text-lg text-muted-foreground hover:text-primary">+</button>
                      </div>
                    </div>

                    {/* Risks */}
                    <div>
                      <div
                        className="flex items-center justify-between py-2 cursor-pointer"
                        onClick={() => setRisksExpanded(!risksExpanded)}
                      >
                        <div className="flex items-center gap-2">
                          {risksExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-sm font-medium">Risks</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>R</span> <span>-</span>
                            <span>O</span> <span className="font-semibold text-foreground">1</span>
                            <span>A</span> <span>-</span>
                            <span>M</span> <span>-</span>
                          </div>
                        </div>
                        <button className="text-lg text-muted-foreground hover:text-primary">+</button>
                      </div>

                      {risksExpanded && (
                        <div className="space-y-2 pl-6">
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                            <div className="w-4 h-4 rounded border border-muted-foreground bg-muted" />
                            <span className="text-muted-foreground font-medium">20</span>
                            <span className="flex-1">D2D Epic Risk 1</span>
                            <Badge variant="secondary" className="text-xs">OWNED</Badge>
                            <button className="text-muted-foreground">
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Impediments */}
                    <div>
                      <div
                        className="flex items-center justify-between py-2 cursor-pointer"
                        onClick={() => setImpedimentsExpanded(!impedimentsExpanded)}
                      >
                        <div className="flex items-center gap-2">
                          {impedimentsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-sm font-medium">Impediments</span>
                        </div>
                        <button className="text-lg text-muted-foreground hover:text-primary">+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Child Objectives */}
              <div>
                <div className="flex items-center justify-between py-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-md font-semibold">Child objectives</span>
                    <Badge variant="secondary" className="rounded-full text-xs">0</Badge>
                  </div>
                  <button className="text-lg text-muted-foreground hover:text-primary">+</button>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Linked Items */}
              <div>
                <div className="flex items-center justify-between py-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-md font-semibold">Linked items</span>
                    <Badge variant="secondary" className="rounded-full text-xs">0</Badge>
                  </div>
                  <button className="text-lg text-muted-foreground hover:text-primary">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
