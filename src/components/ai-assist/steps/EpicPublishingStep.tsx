import React, { useState, useMemo, useEffect } from 'react';
import { 
  Rocket, CheckCircle2, ChevronDown, ChevronRight, FileText, Link2, Zap, 
  ExternalLink, Loader2, Target, Calendar, Copy, Eye, BarChart3, 
  Download, Users, Trophy, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { catalystToast } from '@/lib/catalystToast';
import { useArtifactByType } from '@/hooks/useAIAssistArtifacts';
import { useAIAssistLinks } from '@/hooks/useAIAssistLinks';
import { usePublishEpics, usePublishedEpics } from '@/hooks/useAIAssistPublish';
import { useNavigate } from 'react-router-dom';

interface Epic {
  id: string;
  title: string;
  description: string;
  frCount: number;
  storyPoints: number;
  references: string[];
  priority: 'high' | 'medium' | 'low';
  quarter: string;
  selected: boolean;
}

interface PublishedEpic {
  epicId: string;
  publishedId: string;
  epicTitle: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  frCount: number;
  storyPoints: number;
  quarter: string;
  linkedBR: string | null;
}

export interface EpicPublishingStepProps {
  draftId?: string;
  runId?: string;
}

// ============ CONFETTI COMPONENT ============
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  
  const colors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', '#8b5cf6', '#ec4899'];
  const confettiPieces = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 8 + Math.random() * 8,
    rotation: Math.random() * 360,
    isCircle: Math.random() > 0.5
  })), []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: piece.isCircle ? '50%' : '2px',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`
          }}
        />
      ))}
    </div>
  );
}

// ============ EPIC CARD COMPONENT ============
function EpicCard({ 
  epic, 
  index, 
  isPublished,
  isSelected,
  onToggle
}: { 
  epic: Epic | PublishedEpic; 
  index: number; 
  isPublished: boolean;
  isSelected?: boolean;
  onToggle?: (id: string, checked: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const priorityConfig = {
    high: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
    medium: { bg: 'bg-[hsl(var(--warning))]/10', text: 'text-[hsl(var(--warning))]', border: 'border-[hsl(var(--warning))]/20' },
    low: { bg: 'bg-[hsl(var(--info))]/10', text: 'text-[hsl(var(--info))]', border: 'border-[hsl(var(--info))]/20' },
  };
  
  const priority = priorityConfig[epic.priority] || priorityConfig.medium;
  const epicId = 'epicId' in epic ? epic.epicId : epic.id;
  const publishedId = 'publishedId' in epic ? epic.publishedId : null;
  const frCount = epic.frCount;
  const storyPoints = epic.storyPoints || 0;
  const quarter = epic.quarter || '';
  const linkedBR = 'linkedBR' in epic ? epic.linkedBR : null;
  const title = 'epicTitle' in epic ? epic.epicTitle : epic.title;
  const description = epic.description;
  
  return (
    <div 
      className={cn(
        "rounded-2xl border-2 overflow-hidden transition-all duration-500",
        isPublished 
          ? "bg-gradient-to-br from-[hsl(var(--success))]/5 to-emerald-50 border-[hsl(var(--success))]/30" 
          : "bg-card border-border hover:border-primary/30 hover:shadow-md"
      )}
      style={{ 
        animationDelay: `${index * 0.1}s`,
        animation: isPublished ? 'slideInUp 0.5s ease-out forwards' : 'none'
      }}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Index/Status Badge */}
            {!isPublished && onToggle && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onToggle(epicId, !!checked)}
                className="mt-3"
              />
            )}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500",
              isPublished 
                ? "bg-[hsl(var(--success))] text-white shadow-lg shadow-[hsl(var(--success))]/30" 
                : "bg-muted text-muted-foreground"
            )}>
              {isPublished ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <span className="text-lg font-bold">{index + 1}</span>
              )}
            </div>
            
            {/* Epic Info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-semibold",
                  isPublished ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" : "bg-muted text-muted-foreground"
                )}>
                  {isPublished && publishedId ? publishedId : epicId}
                </span>
                {isPublished && publishedId && (
                  <span className="text-xs text-muted-foreground">← {epicId}</span>
                )}
              </div>
              <h3 className="font-semibold text-foreground text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
            </div>
          </div>
          
          {/* Priority Badge */}
          <Badge 
            variant="outline" 
            className={cn("shrink-0 uppercase", priority.bg, priority.text, priority.border)}
          >
            {epic.priority}
          </Badge>
        </div>
        
        {/* Metrics Row */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{frCount} FRs</span>
          </div>
          {storyPoints > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>{storyPoints} points</span>
            </div>
          )}
          {quarter && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{quarter}</span>
            </div>
          )}
          {linkedBR && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Link2 className="w-4 h-4" />
              <span>{linkedBR}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Published Actions */}
      {isPublished && (
        <div className="px-5 pb-5 flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2 border-[hsl(var(--success))]/30 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/5"
          >
            <Eye className="w-4 h-4" />
            View in Board
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              navigator.clipboard.writeText(publishedId || epicId);
              catalystToast.success('ID copied to clipboard');
            }}
          >
            <Copy className="w-4 h-4" />
            Copy ID
          </Button>
        </div>
      )}
    </div>
  );
}

// ============ SUCCESS SUMMARY COMPONENT ============
function SuccessSummary({ stats }: { stats: { epics: number; features: number; frs: number; points: number } }) {
  return (
    <div className="p-8 rounded-3xl bg-gradient-to-br from-[hsl(var(--success))] via-[hsl(var(--success))] to-emerald-600 text-white mb-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Successfully Published!</h2>
            <p className="text-white/80">Your requirements are now live in the program board</p>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur">
            <div className="text-4xl font-bold mb-1">{stats.epics}</div>
            <div className="text-sm text-white/80">Epics Created</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur">
            <div className="text-4xl font-bold mb-1">{stats.features}</div>
            <div className="text-sm text-white/80">Features</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur">
            <div className="text-4xl font-bold mb-1">{stats.frs}</div>
            <div className="text-sm text-white/80">Requirements</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur">
            <div className="text-4xl font-bold mb-1">{stats.points}</div>
            <div className="text-sm text-white/80">Story Points</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ NEXT ACTIONS COMPONENT ============
function NextActions() {
  const navigate = useNavigate();
  
  const actions = [
    { 
      icon: Layers, 
      title: 'View in Program Board', 
      desc: 'See epics in roadmap context',
      primary: true,
      href: '/program-board'
    },
    { 
      icon: Users, 
      title: 'Assign Teams', 
      desc: 'Set ownership for each epic',
      primary: false,
      href: '/team-management'
    },
    { 
      icon: BarChart3, 
      title: 'View Analytics', 
      desc: 'Compliance and quality metrics',
      primary: false,
      href: '/analytics'
    },
    { 
      icon: Download, 
      title: 'Export Report', 
      desc: 'Download full BRD package',
      primary: false,
      href: '#'
    },
  ];
  
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-[hsl(var(--warning))]" />
        What's Next
      </h3>
      <div className="grid grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => action.href !== '#' && navigate(action.href)}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all duration-200 group text-left",
                action.primary 
                  ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-card border-border hover:border-primary/30 hover:shadow-md"
              )}
            >
              <Icon className={cn(
                "w-6 h-6 mb-3",
                action.primary ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
              )} />
              <div className={cn(
                "font-semibold mb-1",
                action.primary ? "text-primary-foreground" : "text-foreground"
              )}>
                {action.title}
              </div>
              <div className={cn(
                "text-sm",
                action.primary ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {action.desc}
              </div>
              <ChevronRight className={cn(
                "w-5 h-5 mt-3 transition-transform group-hover:translate-x-1",
                action.primary ? "text-primary-foreground" : "text-muted-foreground/50"
              )} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============
export function EpicPublishingStep({
  draftId,
  runId
}: EpicPublishingStepProps) {
  const navigate = useNavigate();
  const [selectedEpicIds, setSelectedEpicIds] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Fetch epics artifact
  const { data: epicsArtifact, isLoading: isLoadingEpics } = useArtifactByType(runId, 'epics');
  
  // Fetch linked BR
  const { data: links = [] } = useAIAssistLinks(draftId);
  const linkedBRKey = links[0]?.request_key;
  
  // Fetch already published epics
  const { data: publishedEpicsData = [] } = usePublishedEpics(draftId);
  
  // Publish mutation
  const publishMutation = usePublishEpics();

  // Generate dynamic quarters based on current date
  const availableQuarters = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    const quarters: string[] = [];
    
    for (let i = 0; i < 4; i++) {
      const q = ((currentQuarter - 1 + i) % 4) + 1;
      const year = currentYear + Math.floor((currentQuarter - 1 + i) / 4);
      quarters.push(`Q${q} ${year}`);
    }
    return quarters;
  }, []);

  const [publishOptions, setPublishOptions] = useState({
    targetQuarter: availableQuarters[0] || '',
    createFeatures: true,
    linkToBR: !!linkedBRKey
  });

  // Update linkToBR when linkedBRKey changes
  useEffect(() => {
    setPublishOptions(prev => ({ ...prev, linkToBR: !!linkedBRKey }));
  }, [linkedBRKey]);

  // Parse epics from artifact
  const epics: Epic[] = useMemo(() => {
    if (!epicsArtifact?.content_json) return [];
    
    const content = epicsArtifact.content_json as { epics?: Array<{
      id?: string;
      title?: string;
      description?: string;
      fr_count?: number;
      frCount?: number;
      story_points?: number;
      storyPoints?: number;
      references?: string[];
      priority?: string;
      quarter?: string;
    }> };
    
    if (!content.epics || !Array.isArray(content.epics)) return [];
    
    return content.epics.map((e, idx) => ({
      id: e.id || `EPIC-${String(idx + 1).padStart(3, '0')}`,
      title: e.title || 'Untitled Epic',
      description: e.description || '',
      frCount: e.fr_count ?? e.frCount ?? 0,
      storyPoints: e.story_points ?? e.storyPoints ?? 0,
      references: e.references || [],
      priority: (e.priority?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
      quarter: e.quarter || publishOptions.targetQuarter,
      selected: true
    }));
  }, [epicsArtifact, publishOptions.targetQuarter]);

  // Initialize selection when epics load
  useEffect(() => {
    if (epics.length > 0 && selectedEpicIds.size === 0) {
      setSelectedEpicIds(new Set(epics.map(e => e.id)));
    }
  }, [epics, selectedEpicIds.size]);

  // Transform published epics for display
  const publishedEpics: PublishedEpic[] = useMemo(() => {
    return publishedEpicsData.map(pe => {
      const pubData = pe.published_data as { 
        title?: string; 
        source_id?: string;
        description?: string;
        quarter?: string;
        epic_key?: string;
      } | null;
      return {
        epicId: pubData?.source_id || pe.id.slice(0, 8).toUpperCase(),
        publishedId: pubData?.epic_key || pe.epic_id || `EPB-${pe.id.slice(0, 8)}`,
        epicTitle: pubData?.title || 'Published Epic',
        description: pubData?.description || '',
        priority: 'medium' as const,
        frCount: 0,
        storyPoints: 0,
        quarter: pubData?.quarter || '',
        linkedBR: linkedBRKey || null
      };
    });
  }, [publishedEpicsData, linkedBRKey]);

  const displayEpics = epics.map(e => ({
    ...e,
    selected: selectedEpicIds.has(e.id)
  }));

  const selectedEpics = displayEpics.filter(e => e.selected);
  const totalFRs = displayEpics.reduce((sum, e) => sum + e.frCount, 0);
  const totalPoints = displayEpics.reduce((sum, e) => sum + e.storyPoints, 0);

  const handleEpicToggle = (epicId: string, selected: boolean) => {
    setSelectedEpicIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(epicId);
      } else {
        newSet.delete(epicId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedEpicIds(new Set(epics.map(e => e.id)));
  };

  const handleDeselectAll = () => {
    setSelectedEpicIds(new Set());
  };

  const handlePublish = async () => {
    if (!draftId || !runId) return;
    
    const epicData = selectedEpics.map(e => ({
      id: e.id,
      name: e.title,
      description: e.description,
    }));

    publishMutation.mutate(
      {
        draftId,
        runId,
        epics: epicData,
        quarter: publishOptions.targetQuarter,
        linkedBrId: publishOptions.linkToBR ? linkedBRKey : undefined
      },
      {
        onSuccess: () => {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
          catalystToast.success('Epics Published!', `${selectedEpics.length} epics created in ${publishOptions.targetQuarter} backlog`);
        }
      }
    );
  };

  const isGenerating = isLoadingEpics;
  const isPublishing = publishMutation.isPending;

  const stats = {
    epics: publishedEpics.length,
    features: publishedEpics.length * 2, // Estimate
    frs: totalFRs,
    points: totalPoints
  };

  // ============ GENERATING STATE ============
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Zap className="h-8 w-8 text-primary animate-pulse" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Loading Epics</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Retrieving generated epics from analysis...
          </p>

          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  // ============ PUBLISHED SUCCESS STATE ============
  if (publishedEpics.length > 0) {
    return (
      <div className="relative">
        <Confetti active={showConfetti} />
        
        {/* Success Summary */}
        <SuccessSummary stats={stats} />
        
        {/* Next Actions */}
        <NextActions />
        
        {/* Published Epics */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
            Published Epics
          </h3>
          <div className="space-y-4">
            {publishedEpics.map((epic, index) => (
              <EpicCard 
                key={epic.epicId} 
                epic={epic} 
                index={index} 
                isPublished={true} 
              />
            ))}
          </div>
        </div>
        
        {/* Return Home */}
        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/product/ai-assist')}
          >
            Start New AI Assist Draft
          </Button>
        </div>
      </div>
    );
  }

  // ============ EMPTY STATE ============
  if (displayEpics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
            <Rocket className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">No Epics Generated</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Complete the previous steps to generate epics from your functional requirements.
          </p>
        </div>
      </div>
    );
  }

  // ============ PRE-PUBLISH STATE ============
  return (
    <div className="space-y-6">
      <Confetti active={showConfetti} />
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <Rocket className="w-4 h-4" />
          Step 8 of 8 • Final Step
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Publish Epics to Program Board
        </h1>
        <p className="text-muted-foreground">
          Review your epics and publish them to start execution
        </p>
      </div>
      
      {/* Summary Bar */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span className="font-semibold text-primary">{displayEpics.length} Epics</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {totalFRs} FRs • {totalPoints} Story Points
          </div>
        </div>
        
        {/* Configuration */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Target:</Label>
            <Select 
              value={publishOptions.targetQuarter}
              onValueChange={(v) => setPublishOptions(prev => ({ ...prev, targetQuarter: v }))}
            >
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableQuarters.map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={handlePublish}
            disabled={isPublishing || selectedEpics.length === 0}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Publish {selectedEpics.length} Epics
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {selectedEpics.length} of {displayEpics.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>
        </div>
        
        {/* Options */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="createFeatures"
              checked={publishOptions.createFeatures}
              onCheckedChange={(checked) => 
                setPublishOptions(prev => ({ ...prev, createFeatures: !!checked }))
              }
            />
            <Label htmlFor="createFeatures" className="text-sm cursor-pointer">
              Create child features
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
                Link to {linkedBRKey}
              </Label>
            </div>
          )}
        </div>
      </div>
      
      {/* Epics List */}
      <div className="space-y-4">
        {displayEpics.map((epic, index) => (
          <EpicCard 
            key={epic.id} 
            epic={{...epic, quarter: publishOptions.targetQuarter, linkedBR: publishOptions.linkToBR ? linkedBRKey : null} as any}
            index={index} 
            isPublished={false}
            isSelected={epic.selected}
            onToggle={handleEpicToggle}
          />
        ))}
      </div>
    </div>
  );
}
