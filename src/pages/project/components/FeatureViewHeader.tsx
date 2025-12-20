/**
 * FeatureViewHeader — Feature ID, Title, Status, Actions
 */

import { useState } from 'react';
import { Layers, Share2, Link2, MoreHorizontal, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export function FeatureViewHeader({ feature }: FeatureViewHeaderProps) {
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };
  
  const handleShare = () => {
    toast.info('Share feature');
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
            {feature.display_id || feature.id}
          </div>
          <h1 className={styles.featureTitle}>
            {feature.name}
          </h1>
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
              <DropdownMenuItem onClick={() => toast.info('Edit feature')}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Delete feature')}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Status Pill */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`${styles.statusPill} ${getStatusClass(feature.status)}`}>
            {getStatusLabel(feature.status)}
            <ChevronDown />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {STATUS_OPTIONS.map(option => (
            <DropdownMenuItem 
              key={option.value}
              onClick={() => toast.info(`Status: ${option.label}`)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
