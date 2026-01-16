/**
 * Project Capacity View - Catalyst View 2
 * Main component for project-centric capacity visualization
 * Implements period toggle, pro-rated allocations, and project cards
 */

import { useState, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

import type { PeriodType, ProjectAllocation, ProjectAssignment, ProjectUtilization, ProjectStaffingStats } from './types';
import { getPeriodRange, navigatePeriod, getProjectUtilizationForPeriod, getStaffingStatusConfig } from './utils';
import { PeriodNavigator } from './PeriodNavigator';
import { ProjectCard } from './ProjectCard';
import { ProjectViewModal } from './ProjectViewModal';

interface ProjectCapacityViewProps {
  assignments: ProjectAssignment[];
  allocations: ProjectAllocation[];
  className?: string;
}

export function ProjectCapacityView({
  assignments,
  allocations,
  className
}: ProjectCapacityViewProps) {
  // State
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 0, 16)); // Current date per spec
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectUtilization | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Calculate period range
  const periodRange = useMemo(() => getPeriodRange(currentDate, periodType), [currentDate, periodType]);

  // Calculate utilization for all projects
  const projectUtilizations = useMemo(() => {
    return assignments.map(project => 
      getProjectUtilizationForPeriod(project, allocations, periodRange.start, periodRange.end)
    );
  }, [assignments, allocations, periodRange]);

  // Filter projects with resources (non-empty) and by search query
  const filteredProjects = useMemo(() => {
    let filtered = projectUtilizations.filter(u => u.resources.length > 0);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.project.name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [projectUtilizations, searchQuery]);

  // Calculate stats
  const stats = useMemo((): ProjectStaffingStats => {
    return {
      total: filteredProjects.length,
      fullyStaffed: filteredProjects.filter(p => p.status === 'full').length,
      partiallyStaffed: filteredProjects.filter(p => p.status === 'partial').length,
      understaffed: filteredProjects.filter(p => p.status === 'under').length,
      overstaffed: filteredProjects.filter(p => p.status === 'over').length
    };
  }, [filteredProjects]);

  // Handlers
  const handlePeriodTypeChange = useCallback((type: PeriodType) => {
    setPeriodType(type);
  }, []);

  const handleNavigate = useCallback((direction: 1 | -1) => {
    setCurrentDate(prev => navigatePeriod(prev, periodType, direction));
  }, [periodType]);

  const handleViewProject = useCallback((utilization: ProjectUtilization) => {
    setSelectedProject(utilization);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setTimeout(() => setSelectedProject(null), 200);
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Period Navigator */}
        <PeriodNavigator
          periodType={periodType}
          periodRange={periodRange}
          onPeriodTypeChange={handlePeriodTypeChange}
          onNavigate={handleNavigate}
        />

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Projects:</span>
          <span className="font-semibold text-foreground">{stats.total}</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", getStaffingStatusConfig('full').dotClass)} />
            <span className="text-sm text-muted-foreground">Fully Staffed:</span>
            <span className="text-sm font-medium">{stats.fullyStaffed}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", getStaffingStatusConfig('partial').dotClass)} />
            <span className="text-sm text-muted-foreground">Partial:</span>
            <span className="text-sm font-medium">{stats.partiallyStaffed}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", getStaffingStatusConfig('under').dotClass)} />
            <span className="text-sm text-muted-foreground">Understaffed:</span>
            <span className="text-sm font-medium">{stats.understaffed}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", getStaffingStatusConfig('over').dotClass)} />
            <span className="text-sm text-muted-foreground">Over-Allocated:</span>
            <span className="text-sm font-medium">{stats.overstaffed}</span>
          </div>
        </div>
      </div>

      {/* Project Cards Grid */}
      <AnimatePresence mode="wait">
        {filteredProjects.length > 0 ? (
          <motion.div
            key={`projects-${periodType}-${currentDate.toISOString()}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filteredProjects.map((utilization) => (
              <ProjectCard
                key={utilization.project.id}
                utilization={utilization}
                onViewDetails={() => handleViewProject(utilization)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 bg-card rounded-lg border border-border"
          >
            <p className="text-muted-foreground">
              {searchQuery 
                ? `No projects matching "${searchQuery}"` 
                : 'No projects with assigned resources in this period'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting the period or search criteria
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <ProjectViewModal
        open={modalOpen}
        onClose={handleCloseModal}
        utilization={selectedProject}
        periodRange={periodRange}
      />
    </div>
  );
}

// Re-export types for convenience
export type { ProjectAllocation, ProjectAssignment } from './types';
