// src/components/ja/home/EmptyStates.tsx
// Mode-specific empty state components
// No generic "No data" messages - all contextual

import React from 'react';
import { AlertTriangle, Briefcase, Calendar, Search, Star, Clock, FileX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HomeRoleMode } from './HomeRoleModeSelector';

interface EmptyStateProps {
  className?: string;
}

// ============================================
// OPERATIONS MODE EMPTY STATES
// ============================================
export function OperationsNoIncidentsEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-[var(--icon-muted)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No incidents assigned to you
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        When incidents are assigned to you, they'll appear here for quick triage and resolution.
      </p>
    </div>
  );
}

export function OperationsNoReleasesEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <Calendar className="w-10 h-10 mx-auto mb-3 text-[var(--icon-muted)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No active releases to manage
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        Active releases assigned to you will appear here for monitoring.
      </p>
    </div>
  );
}

export function OperationsNoMajorIncidentsEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-[var(--brand-primary)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No major incidents
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        All clear! No SEV1 or SEV2 incidents currently require attention.
      </p>
    </div>
  );
}

// ============================================
// DELIVERY MODE EMPTY STATES
// ============================================
export function DeliveryNoWorkedOnEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <Briefcase className="w-10 h-10 mx-auto mb-3 text-[var(--icon-muted)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No delivery work found
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        Work items you've recently viewed or updated will appear here.
      </p>
    </div>
  );
}

export function DeliveryNoAssignedEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <Briefcase className="w-10 h-10 mx-auto mb-3 text-[var(--icon-muted)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No work items assigned to you
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        Epics, features, stories, and tasks assigned to you will appear here.
      </p>
    </div>
  );
}

export function DeliveryNoStarredEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <Star className="w-10 h-10 mx-auto mb-3 text-[var(--icon-muted)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No starred items
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        Star work items for quick access. They'll appear here.
      </p>
    </div>
  );
}

// ============================================
// PLANNER MODE EMPTY STATES
// ============================================
export function PlannerNoPlannedEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <Calendar className="w-10 h-10 mx-auto mb-3 text-[var(--icon-muted)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No planned items pending review
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        Planned work items that need your attention will appear here.
      </p>
    </div>
  );
}

export function PlannerNoUpcomingEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <Clock className="w-10 h-10 mx-auto mb-3 text-[var(--icon-muted)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No upcoming work items
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        Work scheduled for upcoming sprints will appear here.
      </p>
    </div>
  );
}

export function PlannerNoPendingReviewEmptyState({ className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <FileX className="w-10 h-10 mx-auto mb-3 text-[var(--icon-muted)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No items pending your review
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        Items awaiting your planning review will appear here.
      </p>
    </div>
  );
}

// ============================================
// SEARCH EMPTY STATE (shared)
// ============================================
export function SearchNoResultsEmptyState({ 
  searchQuery,
  className 
}: EmptyStateProps & { searchQuery: string }) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <Search className="w-10 h-10 mx-auto mb-3 text-[var(--icon-muted)]" />
      <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">
        No results for "{searchQuery}"
      </h3>
      <p className="text-xs text-[var(--text-3)] max-w-xs mx-auto">
        Try adjusting your search terms or clearing filters.
      </p>
    </div>
  );
}

// ============================================
// MODE-AWARE EMPTY STATE SELECTOR
// ============================================
export function ModeAwareEmptyState({
  mode,
  tab,
  searchQuery,
  filter,
  className,
}: {
  mode: HomeRoleMode;
  tab: string;
  searchQuery?: string;
  filter?: string;
  className?: string;
}) {
  // If there's a search query, show search empty state
  if (searchQuery) {
    return <SearchNoResultsEmptyState searchQuery={searchQuery} className={className} />;
  }

  // Mode-specific empty states
  switch (mode) {
    case 'operations':
      if (filter === 'major-incidents') {
        return <OperationsNoMajorIncidentsEmptyState className={className} />;
      }
      return <OperationsNoIncidentsEmptyState className={className} />;
    
    case 'planner':
      if (tab === 'upcoming') {
        return <PlannerNoUpcomingEmptyState className={className} />;
      }
      if (tab === 'pending-review') {
        return <PlannerNoPendingReviewEmptyState className={className} />;
      }
      return <PlannerNoPlannedEmptyState className={className} />;
    
    case 'delivery':
    default:
      if (tab === 'starred') {
        return <DeliveryNoStarredEmptyState className={className} />;
      }
      if (tab === 'assigned') {
        return <DeliveryNoAssignedEmptyState className={className} />;
      }
      return <DeliveryNoWorkedOnEmptyState className={className} />;
  }
}
