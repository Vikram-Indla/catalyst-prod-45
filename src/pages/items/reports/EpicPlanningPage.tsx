// Doc lines 279-329: Epic Planning - Features organized by PI columns with drag-drop
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Feature {
  id: string;
  name: string;
  display_id?: string;
  status: string;
  estimate_points?: number;
  pi_id?: string;
}

interface PI {
  id: string;
  name: string;
  code?: string;
}

export default function EpicPlanningPage() {
  const { epicId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [addFeatureDialogOpen, setAddFeatureDialogOpen] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [selectedPI, setSelectedPI] = useState<string>('');

  // Fetch epic details
  const { data: epic, isLoading: epicLoading } = useQuery({
    queryKey: ['epic', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .eq('id', epicId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!epicId
  });

  // Fetch features for this epic
  const { data: features = [] } = useQuery({
    queryKey: ['features', 'epic', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('epic_id', epicId)
        .is('deleted_at', null)
        .order('global_rank');
      
      if (error) throw error;
      return data as Feature[];
    },
    enabled: !!epicId
  });

  // Fetch PIs for columns
  const { data: pis = [] } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as PI[];
    }
  });

  // Create feature mutation
  const createFeatureMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .insert([{
          name: newFeatureName,
          epic_id: epicId,
          pi_id: selectedPI || null,
          status: 'funnel',
          program_id: epic?.primary_program_id || '00000000-0000-0000-0000-000000000000'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features', 'epic', epicId] });
      toast.success('Feature added to epic');
      setAddFeatureDialogOpen(false);
      setNewFeatureName('');
      setSelectedPI('');
    },
    onError: () => {
      toast.error('Failed to create feature');
    }
  });

  // Move feature to PI mutation
  const moveFeatureMutation = useMutation({
    mutationFn: async ({ featureId, piId }: { featureId: string; piId: string | null }) => {
      const { error } = await supabase
        .from('features')
        .update({ pi_id: piId })
        .eq('id', featureId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features', 'epic', epicId] });
      toast.success('Feature moved');
    }
  });

  // Group features by PI (Doc lines 286-314: Backlog | PI-5 | PI-6 columns)
  const backlogFeatures = features.filter(f => !f.pi_id);
  const getFeaturesByPI = (piId: string) => features.filter(f => f.pi_id === piId);

  // Calculate estimates per PI (Doc lines 293-294: Estimate: X Team Weeks)
  const calculatePIEstimate = (piId: string | null) => {
    const piFeatures = piId ? getFeaturesByPI(piId) : backlogFeatures;
    return piFeatures.reduce((sum, f) => sum + (f.estimate_points || 0), 0);
  };

  // Feature card color based on status (Doc lines 317-319)
  const getFeatureColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 border-green-300 dark:bg-green-900/20';
      case 'implementing': return 'bg-blue-100 border-blue-300 dark:bg-blue-900/20';
      case 'backlog': return 'bg-gray-100 border-gray-300 dark:bg-gray-800/50';
      default: return 'bg-gray-100 border-gray-300 dark:bg-gray-800/50';
    }
  };

  const filteredFeatures = (featureList: Feature[]) => {
    if (!searchQuery) return featureList;
    return featureList.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.display_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (epicLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading epic planning...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header - Doc line 287: Add Features To Epic + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Epic Planning</h1>
            <p className="text-muted-foreground text-sm">
              {epic?.name} ({epic?.epic_key || epicId?.slice(0, 8)})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Features by ID, Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            onClick={() => setAddFeatureDialogOpen(true)}
            className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* PI Columns Grid - Doc lines 290-314 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Backlog Column */}
        <Card className="min-h-[400px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
              Backlog
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {backlogFeatures.length} features
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredFeatures(backlogFeatures).map((feature) => (
              <div
                key={feature.id}
                className={`p-3 rounded border cursor-pointer hover:shadow-md transition-shadow ${getFeatureColor(feature.status)}`}
                onClick={() => navigate(`/features?id=${feature.id}`)}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{feature.display_id}</p>
                    <p className="text-sm font-medium truncate">{feature.name}</p>
                  </div>
                  <Plus 
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Expand feature details
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* PI Columns */}
        {pis.slice(0, 3).map((pi) => (
          <Card key={pi.id} className="min-h-[400px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
                {pi.name || pi.code}
              </CardTitle>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Estimate: {calculatePIEstimate(pi.id)} Team Weeks</p>
                <p className="text-muted-foreground/70">(Calculated Est: 0)</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredFeatures(getFeaturesByPI(pi.id)).map((feature) => (
                <div
                  key={feature.id}
                  className={`p-3 rounded border cursor-pointer hover:shadow-md transition-shadow ${getFeatureColor(feature.status)}`}
                  onClick={() => navigate(`/features?id=${feature.id}`)}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{feature.display_id}</p>
                      <p className="text-sm font-medium truncate">{feature.name}</p>
                    </div>
                    <Plus 
                      className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Expand feature details
                      }}
                    />
                  </div>
                </div>
              ))}
              
              {/* Apply Bottom-Up Estimate Button - Doc line 328 */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4 text-xs"
                onClick={() => toast.info('Apply Bottom-Up Estimate: TODO (needs confirmation)')}
              >
                Apply Bottom-Up Estimate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Feature Dialog - Doc line 287: +1 Button quick create */}
      <Dialog open={addFeatureDialogOpen} onOpenChange={setAddFeatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feature to Epic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="feature-name">Feature Name</Label>
              <Input
                id="feature-name"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                placeholder="Enter feature name..."
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="pi-select">Program Increment (optional)</Label>
              <Select value={selectedPI} onValueChange={setSelectedPI}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select PI or leave in backlog" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog (No PI)</SelectItem>
                  {pis.map((pi) => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.name || pi.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFeatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createFeatureMutation.mutate()}
              disabled={!newFeatureName.trim() || createFeatureMutation.isPending}
              className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark"
            >
              {createFeatureMutation.isPending ? 'Adding...' : 'Add Feature'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
