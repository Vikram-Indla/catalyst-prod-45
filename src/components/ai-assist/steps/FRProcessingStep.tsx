import React, { useState } from 'react';
import { FileCheck, CheckCircle2, Clock, ChevronDown, ChevronRight, Link2, Tag, Zap, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FunctionalRequirement {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  references: string[];
  validated: boolean;
}

export interface FRProcessingStepProps {
  draftId?: string;
  runId?: string;
  isProcessing?: boolean;
  progress?: number;
  currentTask?: string;
  requirements?: FunctionalRequirement[];
  evidenceCount?: number;
  documentName?: string;
}

export function FRProcessingStep({
  isProcessing = false,
  progress = 0,
  currentTask = '',
  requirements = [],
  evidenceCount = 0,
  documentName
}: FRProcessingStepProps) {
  const [expandedFR, setExpandedFR] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'validated' | 'pending'>('all');

  const validatedCount = requirements.filter(r => r.validated).length;
  const pendingCount = requirements.length - validatedCount;
  
  const filteredRequirements = requirements.filter(req => {
    if (filter === 'validated') return req.validated;
    if (filter === 'pending') return !req.validated;
    return true;
  });

  const priorityColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    low: 'bg-muted text-muted-foreground border-border'
  };

  // Processing state
  if (isProcessing) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <FileCheck className="h-8 w-8 text-primary animate-pulse" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Processing Functional Requirements</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Transforming evidence into structured requirements with traceability...
          </p>

          <div className="max-w-md mx-auto mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <p className="text-sm text-muted-foreground">
            {currentTask || 'Initializing...'}
          </p>

          <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
            {[
              { label: 'Evidence extraction', done: progress > 25 },
              { label: 'Category classification', done: progress > 50 },
              { label: 'Priority assignment', done: progress > 75 },
              { label: 'Traceability mapping', done: progress === 100 }
            ].map((task, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                {task.done ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : progress > idx * 25 ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn(
                  task.done ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {task.label}
                </span>
                {task.done && (
                  <span className="text-xs text-muted-foreground ms-auto">
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (requirements.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Ready to Process</h3>
          
          {/* Source context */}
          {evidenceCount > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-medium text-foreground">{evidenceCount} evidence items</span>
              {documentName && (
                <> from <span className="font-medium text-foreground">{documentName}</span></>
              )}
            </p>
          )}
          
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Transform extracted evidence into structured functional requirements with full traceability to source documents.
          </p>

          <Button className="gap-2">
            <Zap className="h-4 w-4" />
            Start Processing
          </Button>

          <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
              <FileCheck className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-xl font-bold text-muted-foreground/40 mb-1">—</div>
              <p className="text-xs text-muted-foreground">FRs</p>
            </div>
            <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
              <Tag className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-xl font-bold text-muted-foreground/40 mb-1">—</div>
              <p className="text-xs text-muted-foreground">Types</p>
            </div>
            <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
              <Link2 className="h-5 w-5 mx-auto mb-2 text-primary" />
              <div className="text-xl font-bold text-muted-foreground/40 mb-1">—</div>
              <p className="text-xs text-muted-foreground">Sources</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results state
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">{requirements.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Total FRs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-success">{validatedCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Validated</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-warning">{pendingCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Pending</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'validated', 'pending'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && ` (${requirements.length})`}
            {f === 'validated' && ` (${validatedCount})`}
            {f === 'pending' && ` (${pendingCount})`}
          </Button>
        ))}
      </div>

      {/* FR List */}
      <div className="space-y-3">
        {filteredRequirements.map((fr) => (
          <Collapsible
            key={fr.id}
            open={expandedFR === fr.id}
            onOpenChange={(open) => setExpandedFR(open ? fr.id : null)}
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors text-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {fr.id}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs capitalize', priorityColors[fr.priority])}
                      >
                        {fr.priority}
                      </Badge>
                      {fr.validated && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="h-3 w-3 me-1" />
                          Validated
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium">{fr.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {fr.description}
                    </p>
                  </div>
                  {expandedFR === fr.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 border-t border-border">
                  <div className="pt-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{fr.description}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Link2 className="h-3 w-3" />
                        <span>{fr.references.length} references:</span>
                        {fr.references.map((ref, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-mono">
                            {ref}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {!fr.validated && (
                        <Button size="sm" variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Validate
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">Edit</Button>
                      <Button size="sm" variant="ghost">View Evidence</Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {filteredRequirements.length > 5 && (
        <div className="text-center">
          <Button variant="ghost" size="sm">
            Load More FRs
          </Button>
        </div>
      )}
    </div>
  );
}
