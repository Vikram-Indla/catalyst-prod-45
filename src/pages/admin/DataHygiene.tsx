/**
 * Data Hygiene Admin Page
 * Detect and clean up orphan records in the system
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface OrphanRecord {
  id: string;
  name: string;
  type: string;
  reason: string;
  created_at: string;
}

export default function DataHygiene() {
  const queryClient = useQueryClient();
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<OrphanRecord | null>(null);

  // Fetch orphan epics (no theme_id)
  const { data: orphanEpics = [], isLoading: loadingEpics, refetch: refetchEpics } = useQuery({
    queryKey: ['orphan-epics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, created_at')
        .is('theme_id', null)
        .is('deleted_at', null);
      if (error) throw error;
      return (data || []).map(epic => ({
        id: epic.id,
        name: epic.name || 'Unnamed Epic',
        type: 'epic',
        reason: 'No strategic theme linked',
        created_at: epic.created_at,
      }));
    },
  });

  // Fetch orphan features (no epic_id)
  const { data: orphanFeatures = [], isLoading: loadingFeatures, refetch: refetchFeatures } = useQuery({
    queryKey: ['orphan-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, created_at')
        .is('epic_id', null)
        .is('deleted_at', null);
      if (error) throw error;
      return (data || []).map(feature => ({
        id: feature.id,
        name: feature.name || 'Unnamed Feature',
        type: 'feature',
        reason: 'No epic linked',
        created_at: feature.created_at,
      }));
    },
  });

  // Fetch orphan stories (no feature_id)
  const { data: orphanStories = [], isLoading: loadingStories, refetch: refetchStories } = useQuery({
    queryKey: ['orphan-stories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('id, title, created_at')
        .is('feature_id', null)
        .is('deleted_at', null);
      if (error) throw error;
      return (data || []).map(story => ({
        id: story.id,
        name: story.title || 'Unnamed Story',
        type: 'story',
        reason: 'No feature linked',
        created_at: story.created_at,
      }));
    },
  });

  const allOrphans: OrphanRecord[] = [...orphanEpics, ...orphanFeatures, ...orphanStories];
  const isLoading = loadingEpics || loadingFeatures || loadingStories;

  const deleteMutation = useMutation({
    mutationFn: async (record: OrphanRecord) => {
      const table = record.type === 'epic' ? 'epics' 
        : record.type === 'feature' ? 'features' 
        : 'stories';
      
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', record.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Record deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['orphan-epics'] });
      queryClient.invalidateQueries({ queryKey: ['orphan-features'] });
      queryClient.invalidateQueries({ queryKey: ['orphan-stories'] });
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleRefresh = () => {
    refetchEpics();
    refetchFeatures();
    refetchStories();
    toast.success('Scanning for orphan records...');
  };

  const handleDelete = (record: OrphanRecord) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      deleteMutation.mutate(recordToDelete);
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      feature: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      story: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {type}
      </Badge>
    );
  };

  return (
    <AdminGuard>
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Data Hygiene</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Detect and clean up orphan records that lack required relationships
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Scan Now
            </Button>
          </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Orphan Epics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{orphanEpics.length}</span>
                    {orphanEpics.length > 0 && (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Epics without a strategic theme</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Orphan Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{orphanFeatures.length}</span>
                    {orphanFeatures.length > 0 && (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Features without an epic</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Orphan Stories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{orphanStories.length}</span>
                    {orphanStories.length > 0 && (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Stories without a feature</p>
                </CardContent>
              </Card>
            </div>

            {/* Orphan Records Table */}
            <Card>
              <CardHeader>
                <CardTitle>Orphan Records</CardTitle>
                <CardDescription>
                  Records that are missing required parent relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Scanning...</span>
                  </div>
                ) : allOrphans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                    <h3 className="text-lg font-medium text-foreground">All Clean!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      No orphan records detected in the system
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOrphans.map((record) => (
                        <TableRow key={`${record.type}-${record.id}`}>
                          <TableCell>{getTypeBadge(record.type)}</TableCell>
                          <TableCell className="font-medium">{record.name}</TableCell>
                          <TableCell className="text-muted-foreground">{record.reason}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {record.created_at ? new Date(record.created_at).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orphan Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{recordToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminGuard>
  );
}
