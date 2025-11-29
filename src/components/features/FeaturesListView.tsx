import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { FeatureContextMenu } from './FeatureContextMenu';

interface Feature {
  id: string;
  display_id?: string;
  name: string;
  status: string;
  health?: string;
  progress_pct?: number;
  estimate_points?: number;
  wsjf_score?: number;
  epics?: { name: string };
  programs?: { name: string };
  program_increments?: { name: string };
  iterations?: { name: string };
}

interface FeaturesListViewProps {
  features: Feature[];
  onFeatureSelect: (id: string) => void;
  onRefetch: () => void;
  visibleColumns?: string[];
}

const DEFAULT_COLUMNS = ['id', 'name', 'epic', 'program', 'pi', 'iteration', 'status', 'health', 'progress'];

export function FeaturesListView({ 
  features, 
  onFeatureSelect,
  onRefetch,
  visibleColumns = DEFAULT_COLUMNS,
}: FeaturesListViewProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());

  const toggleSelect = (featureId: string) => {
    const newSelected = new Set(selectedFeatures);
    if (newSelected.has(featureId)) {
      newSelected.delete(featureId);
    } else {
      newSelected.add(featureId);
    }
    setSelectedFeatures(newSelected);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const reorderedFeatures = Array.from(features);
    const [movedFeature] = reorderedFeatures.splice(sourceIndex, 1);
    reorderedFeatures.splice(destinationIndex, 0, movedFeature);

    // Optimistically update the UI immediately by triggering a refetch
    // This will cause the component to re-render with the new order
    onRefetch();

    // Update only the affected features in the background
    try {
      // Calculate the range of features that need rank updates
      const startIndex = Math.min(sourceIndex, destinationIndex);
      const endIndex = Math.max(sourceIndex, destinationIndex);
      
      // Batch update only the affected features
      const updates = [];
      for (let i = startIndex; i <= endIndex; i++) {
        updates.push(
          supabase
            .from('features')
            .update({ rank_within_epic: i + 1 })
            .eq('id', reorderedFeatures[i].id)
        );
      }

      await Promise.all(updates);

      toast.success(`Moved "${movedFeature.name}" from rank ${sourceIndex + 1} to rank ${destinationIndex + 1}`, {
        position: 'top-center',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating feature order:', error);
      toast.error('Failed to update feature order - reverting changes');
      onRefetch(); // Revert by refetching
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      funnel: 'secondary',
      analyzing: 'secondary',
      backlog: 'default',
      implementing: 'default',
      validating: 'default',
      deploying: 'default',
      done: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'done':
        return 'bg-success';
      case 'implementing':
      case 'deploying':
        return 'bg-brand-gold';
      case 'validating':
        return 'bg-warning';
      case 'backlog':
        return 'bg-muted';
      default:
        return 'bg-orange-500';
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-12"></TableHead>
              {visibleColumns.includes('id') && <TableHead className="w-24">ID</TableHead>}
              <TableHead className="w-12"></TableHead>
              {visibleColumns.includes('name') && <TableHead className="min-w-[300px]">Feature</TableHead>}
              {visibleColumns.includes('epic') && <TableHead className="w-32">Epic</TableHead>}
              {visibleColumns.includes('program') && <TableHead className="w-32">Program</TableHead>}
              {visibleColumns.includes('pi') && <TableHead className="w-24">PI</TableHead>}
              {visibleColumns.includes('iteration') && <TableHead className="w-28">Iteration</TableHead>}
              {visibleColumns.includes('status') && <TableHead className="w-32">Status</TableHead>}
              {visibleColumns.includes('health') && <TableHead className="w-20">Health</TableHead>}
              {visibleColumns.includes('progress') && <TableHead className="w-32">Progress</TableHead>}
              {visibleColumns.includes('estimate_points') && <TableHead className="w-24 text-right">Points</TableHead>}
              {visibleColumns.includes('wsjf') && <TableHead className="w-24 text-right">WSJF</TableHead>}
            </TableRow>
          </TableHeader>
          <Droppable droppableId="features-list">
            {(provided) => (
              <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                {features.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-12 text-muted-foreground">
                      <div className="text-sm">No features found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  features.map((feature, index) => (
                    <Draggable key={feature.id} draggableId={feature.id} index={index}>
                      {(provided, snapshot) => (
                        <FeatureContextMenu featureId={feature.id} onRefetch={onRefetch}>
                          <TableRow
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "cursor-pointer hover:bg-accent/20 transition-colors border-b group",
                              selectedFeatures.has(feature.id) && "bg-accent/10",
                              snapshot.isDragging && "bg-accent/30 shadow-lg"
                            )}
                          >
                          <TableCell className="p-2" {...provided.dragHandleProps}>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                          </TableCell>
                          
                          <TableCell className="text-sm text-center text-muted-foreground">{index + 1}</TableCell>
                          
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedFeatures.has(feature.id)}
                              onCheckedChange={() => toggleSelect(feature.id)}
                              className="border-2"
                            />
                          </TableCell>

                          {visibleColumns.includes('id') && (
                            <TableCell className="font-mono text-sm" onClick={() => onFeatureSelect(feature.id)}>
                              {feature.display_id || `F-${index + 1}`}
                            </TableCell>
                          )}

                          <TableCell className="p-2">
                            <div className={cn("w-3 h-3 rounded-full", getStatusColor(feature.status))} />
                          </TableCell>

                          {visibleColumns.includes('name') && (
                            <TableCell className="font-medium text-sm cursor-pointer" onClick={() => onFeatureSelect(feature.id)}>
                              {feature.name}
                            </TableCell>
                          )}

                          {visibleColumns.includes('epic') && (
                            <TableCell className="text-sm text-muted-foreground" onClick={() => onFeatureSelect(feature.id)}>
                              {feature.epics?.name || '-'}
                            </TableCell>
                          )}

                          {visibleColumns.includes('program') && (
                            <TableCell className="text-sm text-muted-foreground" onClick={() => onFeatureSelect(feature.id)}>
                              {feature.programs?.name || '-'}
                            </TableCell>
                          )}

                          {visibleColumns.includes('pi') && (
                            <TableCell className="text-sm text-muted-foreground" onClick={() => onFeatureSelect(feature.id)}>
                              {feature.program_increments?.name || '-'}
                            </TableCell>
                          )}

                          {visibleColumns.includes('iteration') && (
                            <TableCell className="text-sm text-muted-foreground" onClick={() => onFeatureSelect(feature.id)}>
                              {feature.iterations?.name || '-'}
                            </TableCell>
                          )}

                          {visibleColumns.includes('status') && (
                            <TableCell onClick={() => onFeatureSelect(feature.id)}>
                              {getStatusBadge(feature.status || 'funnel')}
                            </TableCell>
                          )}

                          {visibleColumns.includes('health') && (
                            <TableCell onClick={() => onFeatureSelect(feature.id)}>
                              <HealthBadge health={feature.health as any} />
                            </TableCell>
                          )}

                          {visibleColumns.includes('progress') && (
                            <TableCell onClick={() => onFeatureSelect(feature.id)}>
                              <div className="flex items-center gap-2">
                                <Progress value={feature.progress_pct || 0} className="h-1.5 flex-1" />
                                <span className="text-xs text-muted-foreground w-10 text-right">{feature.progress_pct || 0}%</span>
                              </div>
                            </TableCell>
                          )}

                          {visibleColumns.includes('estimate_points') && (
                            <TableCell className="text-right text-sm font-medium" onClick={() => onFeatureSelect(feature.id)}>
                              {feature.estimate_points || '-'}
                            </TableCell>
                          )}

                          {visibleColumns.includes('wsjf') && (
                            <TableCell className="text-right text-sm" onClick={() => onFeatureSelect(feature.id)}>
                              {feature.wsjf_score?.toFixed(1) || '-'}
                            </TableCell>
                          )}
                        </TableRow>
                        </FeatureContextMenu>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </TableBody>
            )}
          </Droppable>
        </Table>
      </div>
    </DragDropContext>
  );
}
