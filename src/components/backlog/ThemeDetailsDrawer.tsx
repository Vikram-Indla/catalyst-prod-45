import { useState } from 'react';
import { X, Edit2, Info, Save, Star, AlertCircle, TrendingUp, DollarSign, Plus, Link as LinkIcon, FileText, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// Citation: (Screenshot: image-194.png, image-195.png)

interface Theme {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

interface ThemeDetailsDrawerProps {
  theme: Theme | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeDetailsDrawer({ theme, isOpen, onClose }: ThemeDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [themeName, setThemeName] = useState(theme?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);

  if (!isOpen || !theme) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-[75%] bg-background border-l shadow-2xl flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                <FileText className="h-3 w-3 text-success" />
                <span>Theme {theme.id.slice(0, 2)}</span>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                Why?
              </Button>
              <Button variant="outline" size="sm">
                Save
              </Button>
              <Button size="sm">
                Save & Close
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <Input
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                className="text-2xl font-semibold h-auto border-0 px-0 focus-visible:ring-0"
                autoFocus
              />
            ) : (
              <h2
                className="text-2xl font-semibold text-primary cursor-pointer hover:text-primary/80"
                onClick={() => setIsEditingName(true)}
              >
                {themeName}
              </h2>
            )}
            <button className="text-muted-foreground hover:text-foreground">
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b px-6">
                <TabsList className="h-auto p-0 bg-transparent">
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="links"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Links
                  </TabsTrigger>
                  <TabsTrigger
                    value="milestones"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Milestones
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-auto px-6 py-6">
                <TabsContent value="details" className="mt-0 space-y-6">
                  {/* Programs */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Programs:</Label>
                      <Input defaultValue="Mobile, Web" className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-destructive rounded-sm"></span>
                        State:
                      </Label>
                      <Select defaultValue="in-progress">
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-progress">2 - In Progress</SelectItem>
                          <SelectItem value="backlog">1 - Backlog</SelectItem>
                          <SelectItem value="completed">3 - Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Program Increments */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Program Increments:</Label>
                    <Input defaultValue="PI-5, PI-6" className="bg-muted/50" />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Description:</Label>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded border">
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>(click to edit)</span>
                    </div>
                  </div>

                  {/* Active */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-destructive rounded-sm"></span>
                        Active:
                      </Label>
                      <Select defaultValue="yes">
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Strategic Initiative */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Strategic Initiative:</Label>
                    <Select defaultValue="technical-debt">
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical-debt">Technical Debt</SelectItem>
                        <SelectItem value="innovation">Innovation</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Strategic Goal */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Strategic Goal:</Label>
                    <Select defaultValue="automate">
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automate">Automate Everything</SelectItem>
                        <SelectItem value="scale">Scale Operations</SelectItem>
                        <SelectItem value="innovate">Drive Innovation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Theme Group */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Theme Group:</Label>
                    <Select>
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue placeholder="Select One" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform">Platform</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Theme Planned Budget */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Theme Planned Budget:</Label>
                    <Input
                      type="text"
                      defaultValue="$16,000,000"
                      className="bg-muted/50"
                    />
                  </div>

                  <Separator />

                  {/* Dates */}
                  <div className="space-y-4">
                    <Label className="text-sm text-muted-foreground">Dates:</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Portfolio Ask</Label>
                        <Input type="date" className="bg-muted/50 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Start / Initiation</Label>
                        <Input type="date" className="bg-muted/50 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Target Completion</Label>
                        <div className="flex gap-2">
                          <Input type="date" className="bg-muted/50 text-sm flex-1" />
                          <div className="flex flex-col gap-1">
                            <button className="text-xs text-primary hover:underline flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Lock
                            </button>
                            <button className="text-xs text-muted-foreground hover:underline">
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Major Theme */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Major Theme:</Label>
                    <Switch />
                  </div>

                  {/* Report Color */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Report Color:</Label>
                    <input
                      type="color"
                      defaultValue="#0000FF"
                      className="h-8 w-20 rounded border cursor-pointer"
                    />
                  </div>

                  {/* Jira ID */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Jira ID</Label>
                    <Input className="bg-muted/50" />
                  </div>

                  {/* Initiative ID */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Initiative ID</Label>
                    <Input className="bg-muted/50" />
                  </div>

                  {/* Imperative Alignment */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Imperative Alignment</Label>
                    <Select>
                      <SelectTrigger className="bg-muted/50">
                        <SelectValue placeholder="Select One" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Objective Section */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <button className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                        <span>▶</span>
                        <span>Objective (0)</span>
                      </button>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Links Section */}
                  <div className="border rounded-lg p-4">
                    <button className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                      <span>▶</span>
                      <span>Links (0)</span>
                    </button>
                  </div>

                  {/* File Upload Area */}
                  <div className="border-2 border-dashed rounded-lg p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Plus className="h-8 w-8" />
                      <p className="text-sm">Drop files or click here to upload</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="links" className="mt-0">
                  <div className="text-center py-12 text-muted-foreground">
                    <LinkIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No links added yet</p>
                  </div>
                </TabsContent>

                <TabsContent value="milestones" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Theme Milestones</h3>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Milestone
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Mock milestones */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Q1 Release</span>
                        <span className="text-xs text-muted-foreground">Mar 31, 2025</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Complete initial feature set</p>
                    </div>
                    
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Beta Launch</span>
                        <span className="text-xs text-muted-foreground">May 15, 2025</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Limited beta rollout to select customers</p>
                    </div>
                  </div>
                  
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Add milestones to track key dates</p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Sidebar - Quick Actions */}
          <div className="w-64 border-l bg-muted/20 p-4 space-y-2 overflow-auto">
            <Button className="w-full justify-start gap-2 bg-primary hover:bg-primary/90">
              <Edit2 className="h-4 w-4" />
              Fast Edit
            </Button>

            <Separator className="my-3" />

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <Star className="h-4 w-4" />
              Subscribe
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <AlertCircle className="h-4 w-4" />
              Risks (2)
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <TrendingUp className="h-4 w-4" />
              Investment vs. Spend
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <DollarSign className="h-4 w-4" />
              Multi-Dimension Allocations
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-primary hover:text-primary/80">
              <Plus className="h-4 w-4" />
              Add Epic To Theme
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <FileText className="h-4 w-4" />
              Audit Log
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <DollarSign className="h-4 w-4" />
              Total Budget
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <Target className="h-4 w-4" />
              Requirement Hierarchy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
