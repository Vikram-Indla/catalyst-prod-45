import React, { useState } from 'react';
import { Send, CheckCircle2, ChevronDown, FileText, Link2, Zap, ExternalLink, Loader2, PartyPopper, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';

interface Epic {
  id: string;
  title: string;
  description: string;
  frCount: number;
  references: string[];
  priority: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface PublishedEpic {
  epicId: string;
  epicTitle: string;
  backlogId: string;
}

export interface EpicPublishingStepProps {
  draftId?: string;
  runId?: string;
  isGenerating?: boolean;
  isPublishing?: boolean;
  epics?: Epic[];
  publishedEpics?: PublishedEpic[];
  linkedBRKey?: string;
  onEpicToggle?: (epicId: string, selected: boolean) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onPublish?: (options: PublishOptions) => void;
}

interface PublishOptions {
  targetQuarter: string;
  publishMode: string;
  createFeatures: boolean;
  linkToBR: boolean;
  selectedEpicIds: string[];
}

export function EpicPublishingStep({
  isGenerating = false,
  isPublishing = false,
  epics = [],
  publishedEpics = [],
  linkedBRKey,
  onEpicToggle,
  onSelectAll,
  onDeselectAll,
  onPublish
}: EpicPublishingStepProps) {
  const [expandedEpic, setExpandedEpic] = useState<string | null>(null);
  const [publishOptions, setPublishOptions] = useState({
    targetQuarter: 'Q2 2026',
    publishMode: 'generate_publish',
    createFeatures: true,
    linkToBR: !!linkedBRKey
  });

  const priorityColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20',
    low: 'bg-muted text-muted-foreground border-border'
  };

  // Mock epics if none provided
  const displayEpics = epics.length > 0 ? epics : [
    {
      id: 'EPIC-001',
      title: 'Multi-Currency Procurement Module',
      description: 'Enable procurement transactions in multiple currencies with real-time conversion rates.',
      frCount: 5,
      references: ['P01', 'P03'],
      priority: 'high' as const,
      selected: true
    },
    {
      id: 'EPIC-002',
      title: 'SADAD Payment Integration',
      description: 'Integrate with SADAD payment gateway for supplier payments.',
      frCount: 4,
      references: ['P02'],
      priority: 'high' as const,
      selected: true
    },
    {
      id: 'EPIC-003',
      title: 'Vendor Management Portal',
      description: 'Self-service portal for vendors to manage profiles and submit invoices.',
      frCount: 6,
      references: ['P04', 'P05'],
      priority: 'medium' as const,
      selected: true
    }
  ];

  const selectedEpics = displayEpics.filter(e => e.selected);
  const totalFRs = displayEpics.reduce((sum, e) => sum + e.frCount, 0);

  const handlePublish = () => {
    onPublish?.({
      ...publishOptions,
      selectedEpicIds: displayEpics.filter(e => e.selected).map(e => e.id)
    });
    catalystToast.success('Epics Published!', `${selectedEpics.length} epics created in ${publishOptions.targetQuarter} backlog`);
  };

  // Generating state
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Zap className="h-8 w-8 text-primary animate-pulse" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Generating Epics</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Transforming functional requirements into structured epics...
          </p>

          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  // Published success state with celebration
  if (publishedEpics.length > 0) {
    return (
      <div className="relative text-center py-16 overflow-hidden">
        {/* CSS Confetti particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="confetti-particle"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#0d9488', '#2563eb', '#f59e0b', '#ec4899'][i % 4],
                animationDelay: `${Math.random() * 0.5}s`,
                borderRadius: i % 2 === 0 ? '50%' : '0',
              }}
            />
          ))}
        </div>

        {/* Celebration icon with pulse animation */}
        <div className="w-24 h-24 mx-auto mb-6 bg-[hsl(var(--success))] rounded-full flex items-center justify-center shadow-lg shadow-[hsl(var(--success))]/25 celebration-pulse">
          <CheckCircle2 className="w-12 h-12 text-white check-draw" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Successfully Published! 🎉
        </h2>
        <p className="text-muted-foreground mb-8">
          {publishedEpics.length} Epics are now live in the Program Board
        </p>
        
        {/* Published epics list with stagger animation */}
        <div className="max-w-sm mx-auto space-y-2 mb-8">
          {publishedEpics.map((epic, index) => (
            <div
              key={epic.epicId}
              className="stagger-item p-3 bg-[hsl(var(--success))]/10 rounded-lg flex items-center gap-3 text-sm border border-[hsl(var(--success))]/20"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
              <span className="font-mono">{epic.epicId}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-mono text-[hsl(var(--success))]">{epic.backlogId}</span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button size="lg" className="gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90">
            <ExternalLink className="w-4 h-4" />
            View in Program Board
          </Button>
          <Button variant="outline" size="lg">
            Return to Drafts
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (displayEpics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">No Epics Generated</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Complete the previous steps to generate epics from your functional requirements.
          </p>

          <Button className="gap-2">
            <Zap className="h-4 w-4" />
            Generate Epics
          </Button>
        </div>
      </div>
    );
  }

  // Main state with epics
  return (
    <div className="space-y-6">
      {/* Configuration Section - AT TOP */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Target Quarter</Label>
            <Select 
              value={publishOptions.targetQuarter}
              onValueChange={(v) => setPublishOptions(prev => ({ ...prev, targetQuarter: v }))}
            >
              <SelectTrigger className="focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                <SelectItem value="Q2 2026">Q2 2026</SelectItem>
                <SelectItem value="Q3 2026">Q3 2026</SelectItem>
                <SelectItem value="Q4 2026">Q4 2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Publish Mode</Label>
            <Select 
              value={publishOptions.publishMode}
              onValueChange={(v) => setPublishOptions(prev => ({ ...prev, publishMode: v }))}
            >
              <SelectTrigger className="focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preview">Generate Only (Preview)</SelectItem>
                <SelectItem value="generate_publish">Generate & Publish</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Epic Preview */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Epic Preview</h4>
            <p className="text-sm text-muted-foreground">
              {displayEpics.length} Epics Generated from {totalFRs} Functional Requirements
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onSelectAll} className="transition-all hover:bg-primary/10">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeselectAll} className="transition-all hover:bg-primary/10">
              Deselect All
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {displayEpics.map((epic) => (
            <Collapsible
              key={epic.id}
              open={expandedEpic === epic.id}
              onOpenChange={(open) => setExpandedEpic(open ? epic.id : null)}
            >
              <div className="p-4 transition-all duration-200 hover:bg-muted/50">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={epic.selected}
                    onCheckedChange={(checked) => onEpicToggle?.(epic.id, !!checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <CollapsibleTrigger asChild>
                      <button className="w-full text-start hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {epic.id}
                          </Badge>
                          <span className="font-medium">{epic.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {epic.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <FileText className="h-3 w-3" />
                            {epic.frCount} FRs
                          </Badge>
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Link2 className="h-3 w-3" />
                            {epic.references.length} refs
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs capitalize', priorityColors[epic.priority])}
                          >
                            {epic.priority}
                          </Badge>
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">References: </span>
                          {epic.references.join(', ')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="transition-all hover:border-primary">Edit</Button>
                          <Button size="sm" variant="ghost">View FRs</Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            Remove from publish
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    expandedEpic === epic.id && "rotate-180"
                  )} />
                </div>
              </div>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Publish Action */}
      <div className="bg-card border border-primary/30 rounded-xl p-6">
        <p className="text-sm mb-4">
          Ready to publish <strong>{selectedEpics.length}</strong> epics to Program Board backlog
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="createFeatures"
              checked={publishOptions.createFeatures}
              onCheckedChange={(checked) => 
                setPublishOptions(prev => ({ ...prev, createFeatures: !!checked }))
              }
            />
            <Label htmlFor="createFeatures" className="text-sm cursor-pointer">
              Also create child features from FRs
            </Label>
          </div>
          {linkedBRKey && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="linkToBR"
                checked={publishOptions.linkToBR}
                onCheckedChange={(checked) => 
                  setPublishOptions(prev => ({ ...prev, linkToBR: !!checked }))
                }
              />
              <Label htmlFor="linkToBR" className="text-sm cursor-pointer">
                Link to Business Request {linkedBRKey}
              </Label>
            </div>
          )}
        </div>

        {/* Button says "Publish X Epics" */}
        <Button 
          className="w-full gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90" 
          size="lg"
          onClick={handlePublish}
          disabled={isPublishing || selectedEpics.length === 0}
        >
          {isPublishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Publish {selectedEpics.length} Epics to Backlog
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
