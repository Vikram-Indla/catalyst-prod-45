/**
 * G22: Test Set Detail Page
 * Route: /testhub/test-sets/:setId
 */

import { useState, useCallback, useEffect } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useTheme } from '@/hooks/useTheme';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, RefreshCw, Zap, Layers, Users, Calendar, ExternalLink, X, GripVertical, Clock } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTestSet, useTestSetCases, useRemoveTestCasesFromSet, useReorderTestSetCases, useRefreshDynamicSet } from '@/hooks/useTestSets';
import { SetTypeBadge } from '@/components/test-sets/SetTypeBadge';
import { CreateTestSetModal } from '@/components/test-sets/CreateTestSetModal';
import { AddTestCasesModal } from '@/components/test-sets/AddTestCasesModal';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const priorityColors: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground',
};

function DraggableRow({ item, isSelected, onToggle, navigate }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const tc = item.test_case;
  if (!tc) return null;

  return (
    <div ref={setNodeRef} style={style} className={cn('grid grid-cols-[40px_40px_100px_1fr_100px_40px] items-center px-2 h-9 border-b border-border hover:bg-muted/30 transition-colors', isSelected && 'bg-primary/5')}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
      </div>
      <Checkbox checked={isSelected} onCheckedChange={ch => onToggle(tc.id, ch as boolean)} />
      <span className="text-sm font-mono text-primary">{tc.case_key}</span>
      <span className="text-sm text-foreground truncate">{tc.title}</span>
      <Badge variant="outline" className={cn('text-[10px] capitalize w-fit', priorityColors[(tc.priority?.name || '').toLowerCase()])}>{tc.priority?.name || '-'}</Badge>
      <button onClick={() => navigate(`/testhub/repository?view=${tc.id}`)} className="h-7 w-7 p-0 flex items-center justify-center hover:bg-muted rounded transition-colors">
        <ExternalLink className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function TestSetDetailPage() {
  const { isDark } = useTheme();
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();

  const { data: testSet, isLoading: isLoadingSet } = useTestSet(setId || '');
  const { data: testCases, isLoading: isLoadingCases } = useTestSetCases(setId || '');

  const removeMutation = useRemoveTestCasesFromSet();
  const reorderMutation = useReorderTestSetCases();
  const refreshMutation = useRefreshDynamicSet();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && testCases) {
      const oldIndex = testCases.findIndex(i => i.id === active.id);
      const newIndex = testCases.findIndex(i => i.id === over.id);
      const newOrder = arrayMove(testCases, oldIndex, newIndex);
      setItems(newOrder);
      if (setId) {
        reorderMutation.mutate({ setId, orderedIds: newOrder.map(i => i.id) });
      }
    }
  }, [testCases, setId, reorderMutation]);

  // Sync items with testCases on load
  useEffect(() => {
    if (testCases && testCases.length > 0) {
      setItems(testCases);
    }
  }, [testCases]);

  if (isLoadingSet) {
    return <div className="p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (!testSet) {
    return (
      <div className="p-6">
        <p className="text-foreground">Test set not found</p>
        <Button variant="link" onClick={() => navigate('/testhub/test-sets')}>Back to Test Sets</Button>
      </div>
    );
  }

  const isStatic = testSet.membership_type === 'static';
  const existingIds = testCases?.map((tc: any) => tc.test_case?.id).filter(Boolean) || [];
  const displayItems = items.length > 0 ? items : testCases || [];

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    checked ? next.add(id) : next.delete(id);
    setSelectedIds(next);
  };

  const handleRemoveSelected = () => {
    if (setId) {
      removeMutation.mutate({ setId, testCaseIds: Array.from(selectedIds) });
      setSelectedIds(new Set());
    }
  };

  return (
    <div className={cn("flex-1 p-6 overflow-auto", isDark && "bg-[#0A0A0A]")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/testhub/test-sets')}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{testSet.set_key}</span>
              <SetTypeBadge type={testSet.set_type} size="sm" />
              {testSet.membership_type === 'dynamic' && (
                <Badge variant="outline" className="text-[10px] gap-0.5 text-primary border-primary/30">
                  <Zap className="h-3 w-3" />Dynamic
                </Badge>
              )}
            </div>
            <CatalystPageHeader title={testSet.name} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Layers className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-semibold text-foreground">{testSet.test_count}</p><p className="text-sm text-muted-foreground">Test Cases</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg"><Users className="h-5 w-5 text-muted-foreground" /></div>
          <div><p className="text-lg font-medium text-foreground">{testSet.owner?.full_name || 'Unassigned'}</p><p className="text-sm text-muted-foreground">Owner</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg"><Calendar className="h-5 w-5 text-muted-foreground" /></div>
          <div>
            <p className="text-lg font-medium text-foreground">{formatDistanceToNow(new Date(testSet.updated_at), { addSuffix: true })}</p>
            <p className="text-sm text-muted-foreground">{testSet.membership_type === 'dynamic' ? 'Last Updated' : 'Created'}</p>
            {testSet.membership_type === 'dynamic' && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />Refresh anytime</p>}
          </div>
        </CardContent></Card>
      </div>

      {/* Description */}
      {testSet.description && (
        <Card className="mb-6"><CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
          <p className="text-foreground">{testSet.description}</p>
        </CardContent></Card>
      )}

      {/* Dynamic Criteria */}
      {testSet.membership_type === 'dynamic' && testSet.dynamic_criteria && (
        <Card className="mb-6"><CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Dynamic Criteria</h3>
          <div className="flex flex-wrap gap-2">
            {testSet.dynamic_criteria.priority?.map(p => (
              <span key={p} className="px-2 py-1 bg-muted rounded text-sm capitalize text-foreground">Priority: {p}</span>
            ))}
            {testSet.dynamic_criteria.folder_id && <span className="px-2 py-1 bg-muted rounded text-sm text-foreground">Folder filter active</span>}
          </div>
        </CardContent></Card>
      )}

      {/* Test Cases */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Test Cases</h2>
          <div className="flex items-center gap-2">
            {isStatic ? (
              <Button onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Test Cases</Button>
            ) : (
              <Button variant="outline" onClick={() => setId && refreshMutation.mutate(setId)} disabled={refreshMutation.isPending}>
                <RefreshCw className={cn('h-4 w-4 mr-2', refreshMutation.isPending && 'animate-spin')} />Refresh
              </Button>
            )}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 mb-4 p-2 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" onClick={handleRemoveSelected}><X className="h-4 w-4 mr-1" />Remove</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}

        {isLoadingCases ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !displayItems?.length ? (
          <div className={cn("text-center py-8 border border-dashed border-border rounded-lg", isDark && "bg-[#1A1A1A] border-[#2E2E2E]")}>
            <p className="text-muted-foreground">{isStatic ? 'Click "Add Test Cases" to add tests' : 'Click "Refresh" to populate'}</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className={cn("border border-border rounded-lg overflow-hidden", isDark && "border-[#2E2E2E]")}>
              <div className={cn("grid grid-cols-[40px_40px_100px_1fr_100px_40px] bg-muted/50 border-b border-border h-9 items-center px-2", isDark && "bg-[#1A1A1A] border-[#2E2E2E]")}>
                <span></span>
                <Checkbox checked={selectedIds.size === displayItems.length && displayItems.length > 0}
                  onCheckedChange={ch => ch ? setSelectedIds(new Set(displayItems.map((tc: any) => tc.test_case?.id).filter(Boolean))) : setSelectedIds(new Set())} />
                <span className="text-xs font-medium text-muted-foreground uppercase">Key</span>
                <span className="text-xs font-medium text-muted-foreground uppercase">Title</span>
                <span className="text-xs font-medium text-muted-foreground uppercase">Priority</span>
                <span></span>
              </div>
              <SortableContext items={displayItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {displayItems.map((item: any) => (
                  <DraggableRow key={item.id} item={item} isSelected={selectedIds.has(item.test_case?.id)} onToggle={toggle} navigate={navigate} />
                ))}
              </SortableContext>
            </div>
          </DndContext>
        )}
      </div>

      <CreateTestSetModal open={isEditOpen} onClose={() => setIsEditOpen(false)} editingSet={testSet} projectId={testSet.project_id} />
      <AddTestCasesModal open={isAddOpen} onClose={() => setIsAddOpen(false)} testSetId={setId || ''} projectId={testSet.project_id} existingTestCaseIds={existingIds} />
    </div>
  );
}
