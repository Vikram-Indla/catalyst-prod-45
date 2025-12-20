/**
 * FeatureKeyDetails — Epic, Owner, Planned Dates grid
 * 
 * Layout: 2-column grid (Epic | Owner), then PLANNED DATES row below
 * Epic: Lightning icon in green, left-aligned container
 * Owner: Avatar + name in matching container
 * Planned Dates: Single calendar icon + inline date range text
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, Loader2, Zap, Calendar } from 'lucide-react';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface Feature {
  id: string;
  epic_id: string | null;
  epic?: { id: string; display_id: string; name: string } | null;
  owner_id: string | null;
  owner?: { id: string; name: string } | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  project_id: string;
}

interface FeatureKeyDetailsProps {
  feature: Feature;
  onFeatureUpdated?: () => void;
}

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

export function FeatureKeyDetails({ feature, onFeatureUpdated }: FeatureKeyDetailsProps) {
  const queryClient = useQueryClient();
  const [epicPopoverOpen, setEpicPopoverOpen] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

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

  // Mutation for updating feature
  const updateFeature = useMutation({
    mutationFn: async (data: { 
      owner_id?: string | null; 
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
    if (date && feature.planned_end_date && date > new Date(feature.planned_end_date)) {
      toast.error('Start date must be before end date');
      return;
    }
    updateFeature.mutate({
      planned_start_date: date ? format(date, 'yyyy-MM-dd') : null,
    }, {
      onSuccess: () => toast.success('Start date updated'),
    });
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date && feature.planned_start_date && new Date(feature.planned_start_date) > date) {
      toast.error('End date must be after start date');
      return;
    }
    updateFeature.mutate({
      planned_end_date: date ? format(date, 'yyyy-MM-dd') : null,
    }, {
      onSuccess: () => toast.success('End date updated'),
    });
  };
  
  return (
    <div className={styles.keyDetailsWrapper}>
      {/* 2-column grid: Epic | Owner */}
      <div className={styles.keyDetailsGrid}>
        {/* Epic - Editable (Mandatory) */}
        <div className={styles.keyDetailItem}>
          <div className={styles.keyDetailLabel}>EPIC</div>
          <div className={styles.keyDetailValue}>
            <Popover open={epicPopoverOpen} onOpenChange={setEpicPopoverOpen}>
              <PopoverTrigger asChild>
                <button className={styles.epicCard}>
                  {feature.epic ? (
                    <>
                      <span className={styles.epicIconBox}>
                        <Zap size={12} />
                      </span>
                      <Link 
                        to={`/epics/${feature.epic.id}`} 
                        className={styles.epicLinkText}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {feature.epic.display_id} · {feature.epic.name}
                      </Link>
                    </>
                  ) : (
                    <span className={styles.noneValue}>Select Epic (required)</span>
                  )}
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
                          <span className={styles.epicIconBox}>
                            <Zap size={10} />
                          </span>
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
                <button className={styles.ownerField}>
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
      </div>

      {/* PLANNED DATES - Full width row below */}
      <div className={styles.plannedDatesRow}>
        <div className={styles.keyDetailLabel}>PLANNED DATES</div>
        <div className={styles.plannedDatesValue}>
          <Calendar size={16} className={styles.calendarIcon} />
          
          {/* Start Date - clickable text */}
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
                onSelect={(date) => {
                  handleStartDateChange(date || null);
                  setStartDateOpen(false);
                }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className={styles.dateSeparator}>–</span>

          {/* End Date - clickable text */}
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
                onSelect={(date) => {
                  handleEndDateChange(date || null);
                  setEndDateOpen(false);
                }}
                disabled={(date) => 
                  feature.planned_start_date ? date < new Date(feature.planned_start_date) : false
                }
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
