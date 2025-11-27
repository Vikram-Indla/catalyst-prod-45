import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FileText, Gem, ClipboardList, TrendingUp, ThumbsUp, Milestone, DollarSign, BarChart3, Link as LinkIcon, MessageSquare, Star, Bell, Grid3x3, FileStack, Grid2x2, CheckSquare, ClipboardCheck, Package } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface EpicDetailsPanelProps {
  epicId: string;
  onClose: () => void;
  onRefetch: () => void;
}

export function EpicDetailsPanel({ epicId, onClose, onRefetch }: EpicDetailsPanelProps) {
  const { data: epic } = useQuery({
    queryKey: ['epic-details', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (!epic) return null;

  return (
    <Sheet open={!!epicId} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Epic 1168</span>
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mt-1">AI for Improved Call Center Interactions</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">Why?</Button>
              <Button variant="default" size="sm">Save</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-6 bg-card">
            <TabsList className="h-12 bg-transparent justify-start gap-1">
              <TabsTrigger value="details" className="gap-2">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-2">
                <Gem className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="intake" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Intake
              </TabsTrigger>
              <TabsTrigger value="benefits" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Benefits
              </TabsTrigger>
              <TabsTrigger value="value" className="gap-2">
                <ThumbsUp className="h-4 w-4" />
                Value
              </TabsTrigger>
              <TabsTrigger value="milestones" className="gap-2">
                <Milestone className="h-4 w-4" />
                Milestones
              </TabsTrigger>
              <TabsTrigger value="spend" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Spend
              </TabsTrigger>
              <TabsTrigger value="forecast" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Forecast
              </TabsTrigger>
              <TabsTrigger value="links" className="gap-2">
                <LinkIcon className="h-4 w-4" />
                Links
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="details" className="m-0 p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Description */}
                <div className="col-span-2 space-y-6">
                  <div>
                    <label className="text-sm font-medium text-red-500 mb-2 block">■ Description:</label>
                    <Textarea
                      defaultValue="Use natural language processing to perform in-call voice analysis and deliver real-time guidance to agents and new insight to managers."
                      className="min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-red-500 mb-2 block">■ Type:</label>
                      <Select defaultValue="business">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="enabler">Enabler</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">MVP:</label>
                      <Select defaultValue="no">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Contained In:</label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Package className="h-3 w-3 text-green-600" />
                        1: User Experience
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-red-500 mb-2 block">■ Primary Program:</label>
                    <Select defaultValue="mobile">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="web">Web</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Additional Programs</label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">AI ×</Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Owner:</label>
                    <Select defaultValue="sean">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sean">Sean Duffy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Right Column - State and Progress */}
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-red-500 mb-2 block">■ State:</label>
                    <Select defaultValue="in_progress">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">1 - Not Started</SelectItem>
                        <SelectItem value="in_progress">2 - In Progress</SelectItem>
                        <SelectItem value="done">3 - Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>75 of 95 Story points accepted</span>
                      </div>
                      <Progress value={79} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>3 of 15 Features Accepted</span>
                      </div>
                      <Progress value={20} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>0 of 15 Features in Delivery</span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>0 of 15 Features Delivered</span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>
                  </div>

                  <Button className="w-full gap-2" size="lg">
                    <BarChart3 className="h-4 w-4" />
                    Fast Edit
                  </Button>

                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      Discussions
                      <Badge variant="destructive" className="ml-auto">0</Badge>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                      <Star className="h-4 w-4" />
                      Subscribe
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                      <Grid3x3 className="h-4 w-4" />
                      Update child process steps
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                      <Grid3x3 className="h-4 w-4" />
                      Responsibility Matrix
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                      <FileStack className="h-4 w-4" />
                      Trace This Epic
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Status Report
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                      <Grid2x2 className="h-4 w-4" />
                      Requirement Hierarchy
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                      <ClipboardCheck className="h-4 w-4" />
                      Audit Log
                    </Button>
                    <Button variant="link" className="w-full justify-start p-0 h-auto text-primary">
                      + Show More
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="design" className="m-0 p-6">
              <p className="text-muted-foreground">Design tab content</p>
            </TabsContent>

            <TabsContent value="intake" className="m-0 p-6">
              <p className="text-muted-foreground">Intake tab content</p>
            </TabsContent>

            <TabsContent value="benefits" className="m-0 p-6">
              <p className="text-muted-foreground">Benefits tab content</p>
            </TabsContent>

            <TabsContent value="value" className="m-0 p-6">
              <p className="text-muted-foreground">Value tab content</p>
            </TabsContent>

            <TabsContent value="milestones" className="m-0 p-6">
              <p className="text-muted-foreground">Milestones tab content</p>
            </TabsContent>

            <TabsContent value="spend" className="m-0 p-6">
              <p className="text-muted-foreground">Spend tab content</p>
            </TabsContent>

            <TabsContent value="forecast" className="m-0 p-6">
              <p className="text-muted-foreground">Forecast tab content</p>
            </TabsContent>

            <TabsContent value="links" className="m-0 p-6">
              <p className="text-muted-foreground">Links tab content</p>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
