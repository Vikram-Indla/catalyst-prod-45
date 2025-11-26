import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Objective, mockProgramIncrements } from '@/data/strategyMockData';
import { X, Star, Share2, MoreVertical, MessageCircle, Plus, BarChart, CheckCircle, Maximize2, Pencil } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ObjectiveDrawerProps {
  objective: Objective | null;
  open: boolean;
  onClose: () => void;
}

export function ObjectiveDrawer({ objective, open, onClose }: ObjectiveDrawerProps) {
  const [confidenceDialogOpen, setConfidenceDialogOpen] = useState(false);

  if (!objective) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Objective {objective.id}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
            <Button size="sm" variant="outline">Save</Button>
            <Button size="sm">Save and close</Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[1fr_280px]">
            {/* Main Content */}
            <div className="p-6 space-y-6 border-r">
              {/* Title */}
              <div>
                <h2 className="text-2xl font-semibold">{objective.title}</h2>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  defaultValue={objective.description}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Key Results */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Key results {objective.keyResults.length}</h3>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Key Result
                  </Button>
                </div>

                {objective.keyResults.map((kr) => (
                  <Card key={kr.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-medium">{kr.title}</CardTitle>
                        <span className="text-sm font-semibold text-green-600">{kr.progress.toFixed(1)}</span>
                      </div>
                      <Progress value={kr.progress * 100} className="h-2" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">Current count</div>
                          <div className="font-medium">{kr.currentValue}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Goal count</div>
                          <div className="font-medium">{kr.goalValue}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Baseline count</div>
                          <div className="font-medium">{kr.baselineValue || 0}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Key result owner</div>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6" style={{ backgroundColor: kr.owner.avatarColor }}>
                              <AvatarFallback className="text-white text-xs">{kr.owner.initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{kr.owner.name}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Due date</div>
                          <div>{kr.dueDate || 'Not set'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Key result type</div>
                          <div>{kr.type === 'COUNT' ? 'Count (#)' : kr.type}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <BarChart className="h-4 w-4 mr-1" />
                          Reports
                        </Button>
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Check-in
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Aligned Work Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Aligned work items{' '}
                    {Object.values(objective.alignedWorkItems).flat().length}
                  </h3>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="themes">
                    <AccordionTrigger>
                      Themes ({objective.alignedWorkItems.themeIds.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      {objective.alignedWorkItems.themeIds.length > 0 ? (
                        <div className="text-sm text-muted-foreground">
                          Theme IDs: {objective.alignedWorkItems.themeIds.join(', ')}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          You haven't added any aligned themes yet. Add a theme.
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="epics">
                    <AccordionTrigger>
                      Epics ({objective.alignedWorkItems.epicIds.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      {objective.alignedWorkItems.epicIds.length > 0 ? (
                        <div className="space-y-2">
                          {objective.alignedWorkItems.epicIds.map((id) => (
                            <div key={id} className="flex items-center gap-2 p-2 border rounded">
                              <Badge variant="secondary">{id}</Badge>
                              <span className="text-sm">
                                {id === 1184 ? 'Advanced Voice Activation for T...' : 'AI for Improved Call Center Inter...'}
                              </span>
                              <Progress value={80} className="flex-1 h-1" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No epics aligned</div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="dependencies">
                    <AccordionTrigger>
                      Dependencies ({objective.alignedWorkItems.dependencyIds.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-muted-foreground">No dependencies</div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="risks">
                    <AccordionTrigger>
                      Risks ({objective.alignedWorkItems.riskIds.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-muted-foreground">No risks</div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Hierarchy */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Hierarchy</h3>
                <p className="text-sm text-muted-foreground">
                  {objective.parentId
                    ? `Parent: Objective ${objective.parentId}`
                    : 'No parent objective'}
                </p>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="p-4 space-y-4 bg-muted/30">
              {/* Status & Actions */}
              <div className="space-y-2">
                <Select defaultValue={objective.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On Track">On Track</SelectItem>
                    <SelectItem value="At Risk">At Risk</SelectItem>
                    <SelectItem value="Off Track">Off Track</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="ml-auto">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Badge variant="destructive" className="rounded-full w-5 h-5 p-0 flex items-center justify-center text-xs">
                    0
                  </Badge>
                </div>
              </div>

              {/* Objective Score Card */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Objective score</span>
                    <span className="text-3xl font-bold text-green-700">{objective.score.toFixed(1)}</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Key results progress</div>
                      <div className="flex items-center gap-2">
                        <Progress value={objective.keyResultsProgress * 100} className="flex-1 h-2" />
                        <span className="text-xs font-medium">{Math.round(objective.keyResultsProgress * 100)}%</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Aligned work progress</div>
                      <div className="flex items-center gap-2">
                        <Progress value={objective.alignedWorkProgress * 100} className="flex-1 h-2" />
                        <span className="text-xs font-medium">{Math.round(objective.alignedWorkProgress * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-green-700 hover:text-green-800"
                    onClick={() => setConfidenceDialogOpen(true)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Update confidence score
                  </Button>
                </CardContent>
              </Card>

              {/* Dates */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Program Increment *</Label>
                    <div className="flex flex-wrap gap-1">
                      {objective.programIncrementIds.map((pi) => (
                        <Badge key={pi} variant="secondary">{pi}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Anchor sprint * <span className="text-muted-foreground">?</span></Label>
                    <Select defaultValue={objective.anchorSprint}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PI76 (4/25-5/8)">PI76 (4/25-5/8)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Start date</Label>
                    <Input type="date" className="h-8 text-xs" defaultValue={objective.startDate} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Due date</Label>
                    <Input type="date" className="h-8 text-xs" defaultValue={objective.dueDate} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Blocked</Label>
                    <RadioGroup defaultValue={objective.blocked ? "yes" : "no"}>
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
                </CardContent>
              </Card>

              {/* Hierarchy */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Hierarchy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {objective.parentId ? `Parent: Objective ${objective.parentId}` : 'Top-level objective'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
