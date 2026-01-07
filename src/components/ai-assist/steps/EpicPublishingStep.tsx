import React, { useState } from 'react';
import { Send, CheckCircle2, ChevronDown, FileText, Link2, Zap, ExternalLink, Loader2, PartyPopper, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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

  const selectedEpics = epics.filter(e => e.selected);
  const totalFRs = epics.reduce((sum, e) => sum + e.frCount, 0);

  const priorityColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
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

  const handlePublish = () => {
    onPublish?.({
      ...publishOptions,
      selectedEpicIds: displayEpics.filter(e => e.selected).map(e => e.id)
    });
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

  // Published success state
  if (publishedEpics.length > 0) {
    return (
      <div className="space-y-6">
        {/* Success Banner */}
        <div className="bg-success/10 border border-success/30 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/20 mb-6">
            <PartyPopper className="h-10 w-10 text-success" />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">Successfully Published!</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {publishedEpics.length} Epics are now live in the Program Board backlog
          </p>

          {/* Published Epics List */}
          <div className="bg-card border border-border rounded-xl p-4 max-w-md mx-auto mb-6 text-start">
            {publishedEpics.map((epic) => (
              <div key={epic.epicId} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-sm flex-1">{epic.epicTitle}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  → {epic.backlogId}
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View in Program Board
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Summary PDF
            </Button>
          </div>
        </div>

        {/* Completion Card */}
        <div className="bg-card border border-success/30 rounded-xl p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3" />
          <h4 className="font-semibold mb-2">Draft Completed</h4>
          <p className="text-sm text-muted-foreground mb-4">
            All steps have been completed successfully.
          </p>
          <Button variant="outline">
            Return to Drafts List
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
      {/* Publishing Config */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Target Quarter</Label>
            <Select 
              value={publishOptions.targetQuarter}
              onValueChange={(v) => setPublishOptions(prev => ({ ...prev, targetQuarter: v }))}
            >
              <SelectTrigger>
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
            <Label>Publish Mode</Label>
            <Select 
              value={publishOptions.publishMode}
              onValueChange={(v) => setPublishOptions(prev => ({ ...prev, publishMode: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generate_publish">Generate & Publish</SelectItem>
                <SelectItem value="draft_only">Draft Only</SelectItem>
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
            <Button variant="ghost" size="sm" onClick={onSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeselectAll}>
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
              <div className="p-4">
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
                        <p className="text-sm">{epic.description}</p>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="ghost">View FRs</Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
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

        <Button 
          className="w-full gap-2" 
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
