/**
 * FeatureViewPage — Project Module Feature Details (Full Page)
 * 
 * Layout matching provided TSX: Breadcrumb → Workspace (Content + Sidebar)
 * Route: /projects/:projectId/features/:featureId
 * 
 * DO NOT duplicate CatalystShell - it renders globally.
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeatureProgress } from '@/hooks/useFeatureProgress';
import { Layers, Share2, Link2, MoreHorizontal, ChevronDown, Pencil, Calendar, Ban, Zap, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

// Sub-components (refactored)
import { FeatureDescription } from './components/FeatureDescription';
import { FeatureChildStories } from './components/FeatureChildStories';
import { FeatureLinkedItems } from './components/FeatureLinkedItems';
import { FeatureActivity } from './components/FeatureActivity';
import { FeatureDetailsSidebar } from './components/FeatureDetailsSidebar';

import styles from './FeatureViewPage.module.css';

// Feature status enum (correct values)
type FeatureStatus = 'funnel' | 'analyzing' | 'backlog' | 'implementing' | 'done';

const STATUS_OPTIONS: { value: FeatureStatus; label: string }[] = [
  { value: 'funnel', label: 'FUNNEL' },
  { value: 'analyzing', label: 'ANALYZING' },
  { value: 'backlog', label: 'BACKLOG' },
  { value: 'implementing', label: 'IN PROGRESS' },
  { value: 'done', label: 'DONE' },
];

interface FeatureWithRelations {
  id: string;
  display_id: string | null;
  name: string;
  description: string | null;
  status: string | null;
  health: string | null;
  blocked: boolean | null;
  blocked_reason: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  owner_id: string | null;
  epic_id: string | null;
  project_id: string;
  owner?: { id: string; name: string } | null;
  epic?: { id: string; display_id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  // Sidebar fields - not in DB, will be null
  priority?: string | null;
  reporter_id?: string | null;
  reporter?: { id: string; name: string } | null;
  labels?: string[];
  component?: string | null;
  theme?: string | null;
  release?: string | null;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getStatusClass(status: string | null): string {
  switch (status?.toLowerCase()) {
    case 'implementing':
      return styles.statusImplementing;
    case 'done':
      return styles.statusDone;
    case 'funnel':
      return styles.statusFunnel;
    case 'analyzing':
      return styles.statusAnalyzing;
    case 'backlog':
      return styles.statusBacklog;
    default:
      return styles.statusFunnel;
  }
}

function getStatusLabel(status: string | null): string {
  const opt = STATUS_OPTIONS.find(o => o.value === status?.toLowerCase());
  return opt?.label || status?.toUpperCase() || 'FUNNEL';
}

function getHealthClass(health: string | null): string {
  switch (health?.toLowerCase()) {
    case 'green':
    case 'on_track':
      return styles.healthGreen;
    case 'yellow':
    case 'amber':
    case 'at_risk':
      return styles.healthAmber;
    case 'red':
    case 'off_track':
      return styles.healthRed;
    default:
      return styles.healthGreen;
  }
}

function getHealthLabel(health: string | null): string {
  switch (health?.toLowerCase()) {
    case 'green':
    case 'on_track':
      return 'On Track';
    case 'yellow':
    case 'amber':
    case 'at_risk':
      return 'At Risk';
    case 'red':
    case 'off_track':
      return 'Off Track';
    default:
      return 'On Track';
  }
}

export default function FeatureViewPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>();
  const queryClient = useQueryClient();
  
  // Local state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [epicPopoverOpen, setEpicPopoverOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  // Fetch feature data
  const { data: feature, isLoading, error } = useQuery({
    queryKey: ['feature-view', featureId],
    queryFn: async (): Promise<FeatureWithRelations | null> => {
      if (!featureId) return null;
      
      const { data, error } = await supabase
        .from('features')
        .select(`
          id,
          display_id,
          name,
          description,
          status,
          health,
          blocked,
          blocked_reason,
          planned_start_date,
          planned_end_date,
          owner_id,
          epic_id,
          project_id
        `)
        .eq('id', featureId)
        .single();
      
      if (error) throw error;
      if (!data) return null;
      
      // Fetch related data
      let owner = null;
      let epic = null;
      let project = null;
      
      if (data.owner_id) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', data.owner_id)
          .single();
        owner = ownerData ? { id: ownerData.id, name: ownerData.full_name || 'Unknown' } : null;
      }
      
      if (data.epic_id) {
        const { data: epicData } = await supabase
          .from('epics')
          .select('id, epic_key, name')
          .eq('id', data.epic_id)
          .single();
        epic = epicData ? { id: epicData.id, display_id: epicData.epic_key || epicData.id.slice(0, 6), name: epicData.name } : null;
      }
      
      if (data.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, name')
          .eq('id', data.project_id)
          .single();
        project = projectData;
      }
      
      return {
        ...data,
        owner,
        epic,
        project,
        priority: null,
        labels: [],
        component: null,
        release: null,
        reporter: null,
      };
    },
    enabled: !!featureId,
  });
  
  // Fetch story-driven progress
  const { data: progress } = useFeatureProgress(featureId);
  
  // Fetch child stories
  const { data: stories = [] } = useQuery({
    queryKey: ['feature-stories', featureId],
    queryFn: async () => {
      if (!featureId) return [];
      
      const { data, error } = await supabase
        .from('stories')
        .select(`id, name, status, state, priority, assignee_id`)
        .eq('feature_id', featureId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Failed to fetch stories:', error);
        return [];
      }
      
      return (data || []).map(s => ({
        ...s,
        display_id: `STORY-${s.id.slice(0, 4).toUpperCase()}`,
      }));
    },
    enabled: !!featureId,
  });

  // Fetch epics for epic picker
  const { data: epics = [], isLoading: loadingEpics } = useQuery({
    queryKey: ['epics-for-feature-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, epic_key, name')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for owner picker
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-feature'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });
  
  // Update feature mutation
  const updateFeature = useMutation({
    mutationFn: async (data: Partial<{
      name: string;
      status: FeatureStatus;
      owner_id: string | null;
      epic_id: string;
      planned_start_date: string | null;
      planned_end_date: string | null;
    }>) => {
      const { error } = await supabase
        .from('features')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-view', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update feature', { description: error.message });
    },
  });

  // Handlers
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handleStatusChange = (newStatus: FeatureStatus) => {
    updateFeature.mutate({ status: newStatus }, {
      onSuccess: () => toast.success('Status updated'),
    });
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName.trim() !== feature?.name) {
      updateFeature.mutate({ name: editedName.trim() }, {
        onSuccess: () => {
          toast.success('Title updated');
          setIsEditingName(false);
        },
      });
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    else if (e.key === 'Escape') setIsEditingName(false);
  };

  const handleOwnerChange = (newOwnerId: string | null) => {
    updateFeature.mutate({ owner_id: newOwnerId }, {
      onSuccess: () => toast.success('Owner updated'),
    });
  };

  const handleEpicChange = (newEpicId: string) => {
    if (!newEpicId) {
      toast.error('Epic is required', { description: 'Features must be linked to an Epic' });
      return;
    }
    updateFeature.mutate({ epic_id: newEpicId }, {
      onSuccess: () => {
        toast.success('Epic updated');
        setEpicPopoverOpen(false);
      },
    });
  };

  const handleStartDateChange = (date: Date | null) => {
    if (date && feature?.planned_end_date && date > new Date(feature.planned_end_date)) {
      toast.error('Start date must be before end date');
      return;
    }
    updateFeature.mutate({
      planned_start_date: date ? format(date, 'yyyy-MM-dd') : null,
    }, {
      onSuccess: () => {
        toast.success('Start date updated');
        setStartDateOpen(false);
      },
    });
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date && feature?.planned_start_date && new Date(feature.planned_start_date) > date) {
      toast.error('End date must be after start date');
      return;
    }
    updateFeature.mutate({
      planned_end_date: date ? format(date, 'yyyy-MM-dd') : null,
    }, {
      onSuccess: () => {
        toast.success('End date updated');
        setEndDateOpen(false);
      },
    });
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className={styles.featureViewPage}>
        <div className={styles.breadcrumbRow}>
          <Skeleton className="h-4 w-64" />
        </div>
        <div className={styles.mainLayout}>
          <div className={styles.contentArea}>
            <div className={styles.loadingContainer}>
              <Skeleton className="h-8 w-96 mb-4" />
              <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
          </div>
          <div className={styles.detailsSidebar}>
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  // Error/Not found state
  if (error || !feature) {
    return (
      <div className={styles.featureViewPage}>
        <div className={styles.breadcrumbRow}>
          <Link to={`/projects/${projectId}/features`} className={styles.breadcrumbLink}>
            Features
          </Link>
        </div>
        <div className={styles.notFoundContainer}>
          <span>Feature not found</span>
          <Link to={`/projects/${projectId}/features`} className={styles.breadcrumbLink}>
            ← Back to Features
          </Link>
        </div>
      </div>
    );
  }

  const progressPercent = progress?.completionPercent || 0;
  const completedStories = progress?.completedStories || 0;
  const totalStories = progress?.totalStories || 0;
  
  return (
    <div className={styles.featureViewPage}>
      {/* Breadcrumb Row */}
      <div className={styles.breadcrumbRow}>
        <Link to="/projects" className={styles.breadcrumbLink}>Projects</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link to={`/projects/${projectId}`} className={styles.breadcrumbLink}>
          {feature.project?.name || 'Project'}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>
          {feature.display_id || `FEAT-${feature.id.slice(0, 4).toUpperCase()}`}
        </span>
      </div>
      
      {/* Main Workspace */}
      <div className={styles.mainLayout}>
        {/* Left: Main Content */}
        <main className={styles.contentArea}>
          <div className={styles.contentInner}>
            {/* Title Row */}
            <div className={styles.titleRow}>
              <div className={styles.workItemIcon}>
                <Layers size={14} />
              </div>
              <div className={styles.titleContent}>
                <div className={styles.workItemId}>
                  {feature.display_id || `FEAT-${feature.id.slice(0, 4).toUpperCase()}`}
                </div>
                {isEditingName ? (
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleNameKeyDown}
                    autoFocus
                    className={styles.titleInput}
                  />
                ) : (
                  <h1 className={styles.workItemTitle}>
                    {feature.name}
                    <button
                      onClick={() => {
                        setEditedName(feature.name);
                        setIsEditingName(true);
                      }}
                      className={styles.editTitleBtn}
                      title="Edit title"
                    >
                      <Pencil size={14} />
                    </button>
                  </h1>
                )}
              </div>
              <div className={styles.titleActions}>
                <button className={styles.titleActionBtn} onClick={handleCopyLink} title="Share">
                  <Share2 size={16} />
                </button>
                <button className={styles.titleActionBtn} onClick={handleCopyLink} title="Copy link">
                  <Link2 size={16} />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={styles.titleActionBtn} title="More actions">
                      <MoreHorizontal size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditedName(feature.name);
                      setIsEditingName(true);
                    }}>
                      Edit title
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Status Row */}
            <div className={styles.statusRow}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`${styles.statusDropdown} ${getStatusClass(feature.status)}`}
                    disabled={updateFeature.isPending}
                  >
                    {getStatusLabel(feature.status)}
                    <ChevronDown size={10} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {STATUS_OPTIONS.map(option => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleStatusChange(option.value)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Key Details Panel */}
            <div className={styles.keyDetailsPanel}>
              {/* Epic */}
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Epic</span>
                <span className={styles.detailValue}>
                  <Popover open={epicPopoverOpen} onOpenChange={setEpicPopoverOpen}>
                    <PopoverTrigger asChild>
                      {feature.epic ? (
                        <button className={styles.epicLink}>
                          <span className={styles.epicIcon}><Zap size={8} /></span>
                          {feature.epic.display_id} · {feature.epic.name}
                        </button>
                      ) : (
                        <button className={styles.epicMissing}>
                          <AlertTriangle size={12} />
                          Select Epic (required)
                        </button>
                      )}
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <div className="p-2 border-b">
                        <p className="text-xs text-muted-foreground">Select an Epic (required)</p>
                      </div>
                      {loadingEpics ? (
                        <div className="flex items-center justify-center py-8">
                          <Skeleton className="h-5 w-5" />
                        </div>
                      ) : (
                        <ScrollArea className="h-[300px]">
                          <div className="p-1">
                            {epics.map(epic => (
                              <button
                                key={epic.id}
                                onClick={() => handleEpicChange(epic.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-left"
                              >
                                <span className={styles.epicIcon}><Zap size={8} /></span>
                                <span className="flex-1 truncate">
                                  <span className="font-medium">{epic.epic_key || epic.id.slice(0, 6)}</span>
                                  <span className="text-muted-foreground ml-2">{epic.name}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </PopoverContent>
                  </Popover>
                </span>
              </div>

              {/* Owner */}
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Owner</span>
                <span className={styles.detailValue}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={styles.ownerDisplay}>
                        {feature.owner ? (
                          <>
                            <div className={styles.avatar}>{getInitials(feature.owner.name)}</div>
                            <span>{feature.owner.name}</span>
                          </>
                        ) : (
                          <span className={styles.noneValue}>Unassigned</span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                      <DropdownMenuItem onClick={() => handleOwnerChange(null)}>
                        Unassigned
                      </DropdownMenuItem>
                      {profiles.map(profile => (
                        <DropdownMenuItem
                          key={profile.id}
                          onClick={() => handleOwnerChange(profile.id)}
                        >
                          {profile.full_name || 'Unknown'}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </div>

              {/* Health */}
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Health</span>
                <span className={styles.detailValue}>
                  <span className={`${styles.healthBadge} ${getHealthClass(feature.health)}`}>
                    <span className={styles.healthDot} />
                    {getHealthLabel(feature.health)}
                  </span>
                </span>
              </div>

              {/* Planned Dates */}
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Planned Dates</span>
                <span className={styles.detailValue}>
                  <div className={styles.datesDisplay}>
                    <Calendar size={14} className={styles.calendarIcon} />
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <span className={styles.dateText}>
                          {feature.planned_start_date
                            ? format(new Date(feature.planned_start_date), 'MMM d, yyyy')
                            : 'Start date'}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={feature.planned_start_date ? new Date(feature.planned_start_date) : undefined}
                          onSelect={(date) => handleStartDateChange(date || null)}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <span className={styles.dateSeparator}>–</span>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <span className={styles.dateText}>
                          {feature.planned_end_date
                            ? format(new Date(feature.planned_end_date), 'MMM d, yyyy')
                            : 'End date'}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={feature.planned_end_date ? new Date(feature.planned_end_date) : undefined}
                          onSelect={(date) => handleEndDateChange(date || null)}
                          disabled={(date) =>
                            feature.planned_start_date ? date < new Date(feature.planned_start_date) : false
                          }
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </span>
              </div>

              {/* Blocked Indicator */}
              {feature.blocked && feature.blocked_reason && (
                <div className={styles.blockedIndicator}>
                  <Ban size={16} />
                  <strong>Blocked:</strong>
                  <span className={styles.blockedReason}>{feature.blocked_reason}</span>
                </div>
              )}

              {/* Story Progress */}
              {totalStories > 0 && (
                <div className={styles.progressContainer}>
                  <span className={styles.detailLabel}>Story Progress</span>
                  <div className={styles.progressBarWrapper}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className={styles.progressText}>
                      <strong>{progressPercent}%</strong> · {completedStories}/{totalStories} stories done
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Description Section */}
            <FeatureDescription
              description={feature.description || ''}
              featureId={feature.id}
            />

            {/* Child Stories Section */}
            <FeatureChildStories
              stories={stories}
              featureId={feature.id}
              projectId={projectId || ''}
              totalCount={totalStories}
            />

            {/* Linked Items */}
            <FeatureLinkedItems featureId={feature.id} />

            {/* Activity */}
            <FeatureActivity featureId={feature.id} />
          </div>
        </main>

        {/* Right: Details Sidebar */}
        <FeatureDetailsSidebar feature={feature} />
      </div>
    </div>
  );
}
