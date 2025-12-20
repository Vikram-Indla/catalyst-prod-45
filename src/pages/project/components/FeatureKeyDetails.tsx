/**
 * FeatureKeyDetails — Epic, Owner, Health, Planned Dates grid
 * 
 * Epic picker is now editable but cannot be cleared (mandatory).
 * Owner, Assignee, Reporter linked to Global Directory (profiles table).
 * Uses CatalystDatePicker for date selection.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
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
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface Feature {
  id: string;
  epic_id: string | null;
  epic?: { id: string; display_id: string; name: string } | null;
  owner_id: string | null;
  owner?: { id: string; name: string } | null;
  health: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  project_id: string;
}

interface FeatureKeyDetailsProps {
  feature: Feature;
  onFeatureUpdated?: () => void;
}

const HEALTH_OPTIONS = [
  { value: 'green', label: 'ON TRACK' },
  { value: 'yellow', label: 'AT RISK' },
  { value: 'red', label: 'OFF TRACK' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function getHealthClass(health: string | null): string {
  switch (health?.toLowerCase()) {
    case 'green':
      return styles.healthOnTrack;
    case 'red':
      return styles.healthOffTrack;
    case 'yellow':
    case 'amber':
      return styles.healthAtRisk;
    default:
      return styles.healthOnTrack;
  }
}

function getHealthLabel(health: string | null): string {
  switch (health?.toLowerCase()) {
    case 'green':
      return 'ON TRACK';
    case 'red':
      return 'OFF TRACK';
    case 'yellow':
    case 'amber':
      return 'AT RISK';
    default:
      return 'ON TRACK';
  }
}

export function FeatureKeyDetails({ feature, onFeatureUpdated }: FeatureKeyDetailsProps) {
  const queryClient = useQueryClient();
  const [epicPopoverOpen, setEpicPopoverOpen] = useState(false);

  // Fetch profiles for owner selection
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

  // Fetch epics for the epic picker
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

  type HealthType = 'green' | 'yellow' | 'red';

  // Mutation for updating feature
  const updateFeature = useMutation({
    mutationFn: async (data: { 
      owner_id?: string | null; 
      health?: HealthType; 
      planned_start_date?: string | null; 
      planned_end_date?: string | null;
      epic_id?: string;
    }) => {
      const { error } = await supabase
        .from('features')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', feature.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-view', feature.id] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      onFeatureUpdated?.();
    },
    onError: (error: any) => {
      toast.error('Failed to update', { description: error.message });
    },
  });

  const handleHealthChange = (newHealth: HealthType) => {
    updateFeature.mutate({ health: newHealth }, {
      onSuccess: () => toast.success('Health updated'),
    });
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
  
  return (
    <div className={styles.keyDetailsGrid}>
      {/* Epic - Editable (Mandatory) */}
      <div className={styles.keyDetailItem}>
        <div className={styles.keyDetailLabel}>EPIC</div>
        <div className={styles.keyDetailValue}>
          <Popover open={epicPopoverOpen} onOpenChange={setEpicPopoverOpen}>
            <PopoverTrigger asChild>
              <button className={styles.editableField}>
                {feature.epic ? (
                  <Link 
                    to={`/epics/${feature.epic.id}`} 
                    className={styles.epicLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className={styles.epicLinkIcon}>E</span>
                    {feature.epic.display_id || feature.epic.id.slice(0, 6)} · {feature.epic.name}
                  </Link>
                ) : (
                  <span className={styles.noneValue}>Select Epic (required)</span>
                )}
                <ChevronDown size={12} className={styles.editableChevron} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-2 border-b">
                <p className="text-xs text-muted-foreground">Select an Epic (required)</p>
              </div>
              {loadingEpics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
                        <span className={styles.epicLinkIcon}>E</span>
                        <span className="flex-1 truncate">
                          <span className="font-medium">{epic.epic_key || epic.id.slice(0, 6)}</span>
                          <span className="text-muted-foreground ml-2">{epic.name}</span>
                        </span>
                        {feature.epic_id === epic.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Owner - Editable */}
      <div className={styles.keyDetailItem}>
        <div className={styles.keyDetailLabel}>OWNER</div>
        <div className={styles.keyDetailValue}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={styles.editableField}>
                {feature.owner ? (
                  <div className={styles.ownerValue}>
                    <div className={styles.avatar}>
                      {getInitials(feature.owner.name)}
                    </div>
                    <span>{feature.owner.name}</span>
                  </div>
                ) : (
                  <span className={styles.noneValue}>Unassigned</span>
                )}
                <ChevronDown size={12} className={styles.editableChevron} />
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
        </div>
      </div>
      
      {/* Health - Editable */}
      <div className={styles.keyDetailItem}>
        <div className={styles.keyDetailLabel}>HEALTH</div>
        <div className={styles.keyDetailValue}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={styles.editableField}>
                <span className={`${styles.healthBadge} ${getHealthClass(feature.health)}`}>
                  <span className={styles.healthBadgeDot} />
                  {getHealthLabel(feature.health)}
                </span>
                <ChevronDown size={12} className={styles.editableChevron} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {HEALTH_OPTIONS.map(option => (
                <DropdownMenuItem 
                  key={option.value} 
                  onClick={() => handleHealthChange(option.value as HealthType)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Planned Dates - Editable with CatalystDatePicker */}
      <div className={styles.keyDetailItem}>
        <div className={styles.keyDetailLabel}>START DATE</div>
        <div className={styles.keyDetailValue}>
          <CatalystDatePicker
            value={feature.planned_start_date}
            onChange={(date) => {
              if (date && feature.planned_end_date && date > new Date(feature.planned_end_date)) {
                toast.error('Start date must be before end date');
                return;
              }
              updateFeature.mutate({
                planned_start_date: date ? format(date, 'yyyy-MM-dd') : null,
              }, {
                onSuccess: () => toast.success('Start date updated'),
              });
            }}
            placeholder="Select start date"
            triggerClassName={styles.editableField}
          />
        </div>
      </div>
      
      <div className={styles.keyDetailItem}>
        <div className={styles.keyDetailLabel}>DUE DATE</div>
        <div className={styles.keyDetailValue}>
          <CatalystDatePicker
            value={feature.planned_end_date}
            onChange={(date) => {
              if (date && feature.planned_start_date && new Date(feature.planned_start_date) > date) {
                toast.error('End date must be after start date');
                return;
              }
              updateFeature.mutate({
                planned_end_date: date ? format(date, 'yyyy-MM-dd') : null,
              }, {
                onSuccess: () => toast.success('Due date updated'),
              });
            }}
            placeholder="Select due date"
            minDate={feature.planned_start_date ? new Date(feature.planned_start_date) : undefined}
            triggerClassName={styles.editableField}
          />
        </div>
      </div>
    </div>
  );
}