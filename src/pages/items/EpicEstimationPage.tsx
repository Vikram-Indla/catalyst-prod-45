import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';
import { 
  LayoutList, 
  LayoutGrid, 
  Filter,
  ArrowLeft,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';

// Fibonacci sequence columns for Technical Scoring board view
const SCORING_COLUMNS = ['1', '2', '3', '5', '8', '13', '20'];

type ScoringField = 'business_value' | 'time_value' | 'rroe_value' | 'job_size';

interface EpicWithScoring {
  id: string;
  name: string;
  epic_key: string | null;
  mvp: boolean | null;
  global_rank: number | null;
  scoring?: {
    business_value: number | null;
    time_value: number | null;
    rroe_value: number | null;
    job_size: number | null;
    wsjf_score: number | null;
  } | null;
}

export default function EpicEstimationPage() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState<'list' | 'column'>('list');
  const [activeScoringField, setActiveScoringField] = useState<ScoringField>('business_value');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

  // Fetch epics with Technical Scoring data
  const { data: epics, isLoading } = useQuery({
    queryKey: ['epics-estimation', portfolioId, selectedProgram],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select(`
          id,
          name,
          epic_key,
          mvp,
          global_rank,
          epic_wsjf(business_value, time_value, rroe_value, job_size, wsjf_score)
        `)
        .is('deleted_at', null)
        .order('global_rank', { ascending: true, nullsFirst: false });

      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform data to include scoring fields at top level
      return (data || []).map(epic => ({
        ...epic,
        scoring: Array.isArray(epic.epic_wsjf) ? epic.epic_wsjf[0] : epic.epic_wsjf
      })) as EpicWithScoring[];
    },
  });

  // Fetch programs for filter
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  // Update Technical Scoring field mutation
  const updateScoringMutation = useMutation({
    mutationFn: async ({ epicId, field, value }: { epicId: string; field: ScoringField; value: number }) => {
      const { data: existing } = await supabase
        .from('epic_wsjf')
        .select('id, business_value, time_value, rroe_value, job_size')
        .eq('epic_id', epicId)
        .maybeSingle();

      const updatedValues = {
        business_value: existing?.business_value || 0,
        time_value: existing?.time_value || 0,
        rroe_value: existing?.rroe_value || 0,
        job_size: existing?.job_size || 0,
        [field]: value
      };

      const techScore = updatedValues.job_size && updatedValues.job_size > 0
        ? Math.round(((updatedValues.business_value || 0) + (updatedValues.time_value || 0) + (updatedValues.rroe_value || 0)) / updatedValues.job_size * 100) / 100
        : null;

      if (existing) {
        const { error } = await supabase
          .from('epic_wsjf')
          .update({ [field]: value, wsjf_score: techScore })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('epic_wsjf')
          .insert({ epic_id: epicId, [field]: value, wsjf_score: techScore });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics-estimation'] });
    },
    onError: () => {
      toast.error('Failed to update technical scoring value');
    }
  });

  // Update MVP mutation
  const updateMVPMutation = useMutation({
    mutationFn: async ({ epicId, mvp }: { epicId: string; mvp: boolean }) => {
      const { error } = await supabase.from('epics').update({ mvp }).eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics-estimation'] });
    }
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const epicId = result.draggableId;
    const newValue = parseInt(result.destination.droppableId);
    if (isNaN(newValue)) return;
    updateScoringMutation.mutate({ epicId, field: activeScoringField, value: newValue });
  };

  const getScoringValue = (epic: EpicWithScoring, field: ScoringField): number | null => {
    return epic.scoring?.[field] ?? null;
  };

  const getEpicsByColumn = () => {
    const grouped: Record<string, EpicWithScoring[]> = {
      'unscored': [], '1': [], '2': [], '3': [], '5': [], '8': [], '13': [], '20': []
    };
    epics?.forEach(epic => {
      const value = getScoringValue(epic, activeScoringField);
      if (!value || !SCORING_COLUMNS.includes(String(value))) {
        grouped['unscored'].push(epic);
      } else {
        grouped[String(value)]?.push(epic);
      }
    });
    return grouped;
  };

  const getTechScore = (epic: EpicWithScoring): number | null => {
    if (!epic.scoring) return null;
    const { business_value, time_value, rroe_value, job_size } = epic.scoring;
    if (!job_size || job_size === 0) return null;
    return Math.round(((business_value || 0) + (time_value || 0) + (rroe_value || 0)) / job_size * 100) / 100;
  };

  const handleManageBacklog = () => {
    if (portfolioId) {
      navigate(`/portfolio/${portfolioId}/backlog`);
    } else {
      navigate('/items/epics');
    }
  };

  const scoringFieldLabels: Record<ScoringField, string> = {
    'business_value': 'Technical Value',
    'time_value': 'Time Criticality',
    'rroe_value': 'Risk Reduction',
    'job_size': 'Job Size'
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Epic Estimation</h1>
              <p className="text-sm text-muted-foreground">
                Technical Scoring for Epics
              </p>
            </div>
          </div>
          <Button onClick={handleManageBacklog}>
            Manage Backlog
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b bg-card px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Program Filter */}
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs?.map(program => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'column')}>
              <TabsList>
                <TabsTrigger value="list">
                  <LayoutList className="h-4 w-4 mr-2" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="column">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Column View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'list' ? (
          /* List View */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32 text-center">Technical Value</TableHead>
                  <TableHead className="w-32 text-center">Time Criticality</TableHead>
                  <TableHead className="w-32 text-center">Risk Reduction</TableHead>
                  <TableHead className="w-32 text-center">Job Size</TableHead>
                  <TableHead className="w-24 text-center">Tech Score</TableHead>
                  <TableHead className="w-20 text-center">MVP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {epics?.map((epic, index) => (
                  <TableRow key={epic.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {epic.epic_key || epic.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md truncate">{epic.name}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(getScoringValue(epic, 'business_value') || '')}
                        onValueChange={(v) => updateScoringMutation.mutate({ 
                          epicId: epic.id, 
                          field: 'business_value', 
                          value: parseInt(v) 
                        })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 5, 8, 13, 20].map(v => (
                            <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(getScoringValue(epic, 'time_value') || '')}
                        onValueChange={(v) => updateScoringMutation.mutate({ 
                          epicId: epic.id, 
                          field: 'time_value', 
                          value: parseInt(v) 
                        })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 5, 8, 13, 20].map(v => (
                            <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(getScoringValue(epic, 'rroe_value') || '')}
                        onValueChange={(v) => updateScoringMutation.mutate({ 
                          epicId: epic.id, 
                          field: 'rroe_value', 
                          value: parseInt(v) 
                        })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 5, 8, 13, 20].map(v => (
                            <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(getScoringValue(epic, 'job_size') || '')}
                        onValueChange={(v) => updateScoringMutation.mutate({ 
                          epicId: epic.id, 
                          field: 'job_size', 
                          value: parseInt(v) 
                        })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 5, 8, 13, 20].map(v => (
                            <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      {getTechScore(epic) !== null ? (
                        <Badge variant="secondary" className="font-mono">
                          {getTechScore(epic)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Select
                        value={epic.mvp ? 'yes' : 'no'}
                        onValueChange={(v) => updateMVPMutation.mutate({ 
                          epicId: epic.id, 
                          mvp: v === 'yes' 
                        })}
                      >
                        <SelectTrigger className="h-8 w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          /* Column View (Technical Scoring Board) */
          <div className="space-y-4">
            {/* Scoring Field Tabs */}
            <div className="flex items-center gap-4">
              <Tabs value={activeScoringField} onValueChange={(v) => setActiveScoringField(v as ScoringField)}>
                <TabsList>
                  <TabsTrigger value="business_value">Technical Value</TabsTrigger>
                  <TabsTrigger value="time_value">Time Criticality</TabsTrigger>
                  <TabsTrigger value="rroe_value">Risk Reduction</TabsTrigger>
                  <TabsTrigger value="job_size">Job Size</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Tech Score Preview
              </Button>
            </div>

            {/* Kanban Columns */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {/* Unscored Column */}
                <Droppable droppableId="unscored">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-shrink-0 w-48 bg-muted/50 rounded-lg p-3 ${
                        snapshot.isDraggingOver ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className="font-semibold text-sm mb-3 text-center">
                        Unscored
                        <Badge variant="secondary" className="ml-2">
                          {getEpicsByColumn()['unscored'].length}
                        </Badge>
                      </div>
                      <div className="space-y-2 min-h-[200px]">
                        {getEpicsByColumn()['unscored'].map((epic, index) => (
                          <Draggable key={epic.id} draggableId={epic.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 cursor-grab ${
                                  snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                                }`}
                              >
                                <div className="text-xs text-muted-foreground font-mono">
                                  {epic.epic_key || epic.id.slice(0, 8)}
                                </div>
                                <div className="text-sm font-medium truncate mt-1">
                                  {epic.name}
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>

                {/* Fibonacci Columns */}
                {SCORING_COLUMNS.map(col => (
                  <Droppable key={col} droppableId={col}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-shrink-0 w-48 bg-card border rounded-lg p-3 ${
                          snapshot.isDraggingOver ? 'ring-2 ring-primary bg-primary/5' : ''
                        }`}
                      >
                        <div className="font-semibold text-sm mb-3 text-center">
                          {col}
                          <Badge variant="secondary" className="ml-2">
                            {getEpicsByColumn()[col]?.length || 0}
                          </Badge>
                        </div>
                        <div className="space-y-2 min-h-[200px]">
                          {getEpicsByColumn()[col]?.map((epic, index) => (
                            <Draggable key={epic.id} draggableId={epic.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 cursor-grab ${
                                    snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                                  }`}
                                >
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {epic.epic_key || epic.id.slice(0, 8)}
                                  </div>
                                  <div className="text-sm font-medium truncate mt-1">
                                    {epic.name}
                                  </div>
                                  {getTechScore(epic) !== null && (
                                    <Badge variant="outline" className="mt-2 text-xs">
                                      Tech Score: {getTechScore(epic)}
                                    </Badge>
                                  )}
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>

            <p className="text-sm text-muted-foreground text-center">
              Drag epic cards to columns to set {scoringFieldLabels[activeScoringField]} values
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
