/**
 * FeatureViewHeader — Feature ID, Title, Status, Actions
 * 
 * Now with real CRUD for status changes.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layers, Share2, Link2, MoreHorizontal, ChevronDown, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface Feature {
  id: string;
  display_id: string | null;
  name: string;
  status: string | null;
}

interface FeatureViewHeaderProps {
  feature: Feature;
  onFeatureUpdated?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'funnel', label: 'FUNNEL' },
  { value: 'analyzing', label: 'ANALYZING' },
  { value: 'backlog', label: 'BACKLOG' },
  { value: 'implementing', label: 'IN PROGRESS' },
  { value: 'done', label: 'DONE' },
];

function getStatusClass(status: string | null): string {
  switch (status?.toLowerCase()) {
    case 'implementing':
    case 'inprogress':
    case 'in_progress':
      return styles.statusInProgress;
    case 'done':
    case 'completed':
      return styles.statusDone;
    default:
      return styles.statusTodo;
  }
}

function getStatusLabel(status: string | null): string {
  switch (status?.toLowerCase()) {
    case 'implementing':
    case 'inprogress':
    case 'in_progress':
      return 'IN PROGRESS';
    case 'done':
    case 'completed':
      return 'DONE';
    case 'analyzing':
      return 'ANALYZING';
    case 'backlog':
      return 'BACKLOG';
    case 'funnel':
      return 'FUNNEL';
    default:
      return status?.toUpperCase() || 'TO DO';
  }
}

export function FeatureViewHeader({ feature, onFeatureUpdated }: FeatureViewHeaderProps) {
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(feature.name);
  
  type FeatureStatus = 'funnel' | 'analyzing' | 'backlog' | 'implementing' | 'done';
  
  // Mutation for updating feature
  const updateFeature = useMutation({
    mutationFn: async (data: { name?: string; status?: FeatureStatus }) => {
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
      toast.error('Failed to update feature', { description: error.message });
    },
  });

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };
  
  const handleShare = () => {
    // For now, copy link is the share action
    handleCopyLink();
  };
  
  const handleStatusChange = (newStatus: FeatureStatus) => {
    updateFeature.mutate({ status: newStatus }, {
      onSuccess: () => {
        toast.success('Status updated');
      }
    });
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName.trim() !== feature.name) {
      updateFeature.mutate({ name: editedName.trim() }, {
        onSuccess: () => {
          toast.success('Title updated');
          setIsEditingName(false);
        }
      });
    } else {
      setIsEditingName(false);
      setEditedName(feature.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(feature.name);
    }
  };
  
  return (
    <div className={styles.featureHeader}>
      <div className={styles.featureHeaderTop}>
        {/* Feature Icon */}
        <div className={styles.featureIcon}>
          <Layers />
        </div>
        
        {/* Content */}
        <div className={styles.featureHeaderContent}>
          <div className={styles.featureId}>
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
            <div className={styles.titleRow}>
              <h1 className={styles.featureTitle}>
                {feature.name}
              </h1>
              <button
                onClick={() => setIsEditingName(true)}
                className={styles.editTitleBtn}
                title="Edit title"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className={styles.featureHeaderActions}>
          <button 
            className={styles.iconButton} 
            onClick={handleShare}
            aria-label="Share"
          >
            <Share2 size={16} />
          </button>
          <button 
            className={styles.iconButton} 
            onClick={handleCopyLink}
            aria-label="Copy link"
          >
            <Link2 size={16} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={styles.iconButton} aria-label="More actions">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                Edit title
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Status Pill with real DB update */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className={`${styles.statusPill} ${getStatusClass(feature.status)}`}
            disabled={updateFeature.isPending}
          >
            {getStatusLabel(feature.status)}
            <ChevronDown />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {STATUS_OPTIONS.map(option => (
            <DropdownMenuItem 
              key={option.value}
              onClick={() => handleStatusChange(option.value as FeatureStatus)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
