// =====================================================
// BOARD VIEW PAGE
// Main Kanban board page component
// =====================================================

import React, { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoardColumn } from '@/components/board/BoardColumn';
import { BoardToolbar } from '@/components/board/BoardToolbar';
import { DependencyDrawer } from '@/components/dependencies/DependencyDrawer';
import { EmptyBoardState } from '@/components/empty-states/EmptyBoardState';
import { useBoardData, useBoardStats, useMoveFeature, useBoardReleases } from '@/hooks/useBoardView';
import { BoardFilters } from '@/services/boardService';
import { WorkflowStatus } from '@/types/views';

export default function BoardView() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || '';
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<BoardFilters>({});
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);
  const [dependencyDrawer, setDependencyDrawer] = useState<{
    open: boolean;
    featureId: string;
    featureIdentifier: string;
    featureTitle: string;
  } | null>(null);

  // Data fetching
  const { data: columns, isLoading } = useBoardData(projectId, filters);
  const { data: stats } = useBoardStats(projectId);
  const { data: releases = [] } = useBoardReleases(projectId);
  const moveFeature = useMoveFeature();

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, featureId: string) => {
    setDraggedFeatureId(featureId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: WorkflowStatus) => {
    e.preventDefault();
    if (draggedFeatureId) {
      moveFeature.mutate({ featureId: draggedFeatureId, newStatus });
      setDraggedFeatureId(null);
    }
  }, [draggedFeatureId, moveFeature]);

  // Card click handler
  const handleCardClick = (featureId: string) => {
    navigate(`/project/feature/${featureId}?projectId=${projectId}`);
  };

  // Dependency drawer handler
  const handleDependencyClick = (featureId: string) => {
    const feature = columns
      ?.flatMap(c => c.features)
      .find(f => f.id === featureId);
    
    if (feature) {
      setDependencyDrawer({
        open: true,
        featureId: feature.id,
        featureIdentifier: feature.feature_id,
        featureTitle: feature.title
      });
    }
  };

  // Check if board is empty
  const isEmpty = columns?.every(c => c.features.length === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c69c6d]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#faf7f1] dark:bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-card border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Board</h1>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-[rgba(59,130,246,0.1)] text-[#3b82f6]">
                  Features
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button className="bg-[#c69c6d] hover:bg-[#b8894d] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Feature
              </Button>
            </div>
          </div>
        </div>
        
        <BoardToolbar
          filters={filters}
          onFiltersChange={setFilters}
          releases={releases}
          stats={stats}
        />
      </div>

      {/* Board Content */}
      {isEmpty ? (
        <EmptyBoardState projectId={projectId} />
      ) : (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-3 min-w-max">
            {columns?.map((column) => (
              <BoardColumn
                key={column.status}
                status={column.status}
                features={column.features}
                wipLimit={column.wipLimit}
                isOverLimit={column.isOverLimit}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onCardClick={handleCardClick}
                onDependencyClick={handleDependencyClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dependency Drawer */}
      {dependencyDrawer && (
        <DependencyDrawer
          open={dependencyDrawer.open}
          onClose={() => setDependencyDrawer(null)}
          itemType="feature"
          itemId={dependencyDrawer.featureId}
          itemIdentifier={dependencyDrawer.featureIdentifier}
          itemTitle={dependencyDrawer.featureTitle}
        />
      )}
    </div>
  );
}
