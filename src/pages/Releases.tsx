import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';
import { ReleaseDialog } from '@/components/forms/ReleaseDialog';
import { format } from 'date-fns';
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

export default function Releases() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'planned' | 'ready' | 'shipped' | ''>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReleaseId, setEditingReleaseId] = useState<string | undefined>();

  const { data: releases } = useQuery({
    queryKey: ['releases', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('releases')
        .select('*, release_vehicles(name, type)');

      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
      if (statusFilter) query = query.eq('status', statusFilter);

      const { data, error } = await query.order('target_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: releaseFeatures } = useQuery({
    queryKey: ['release-features', selectedRelease?.id],
    queryFn: async () => {
      if (!selectedRelease) return [];
      const { data, error } = await supabase
        .from('release_feature_links')
        .select('*, features(name, status, estimate_points)')
        .eq('release_id', selectedRelease.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRelease,
  });

  const { data: releaseStories } = useQuery({
    queryKey: ['release-stories', selectedRelease?.id],
    queryFn: async () => {
      if (!selectedRelease) return [];
      const { data, error } = await supabase
        .from('release_story_links')
        .select('*, stories(name, status, estimate_points)')
        .eq('release_id', selectedRelease.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRelease,
  });

  const calculateReadiness = () => {
    if (!releaseFeatures?.length) return { ready: 0, total: 0, pct: 0 };
    
    const total = releaseFeatures.length;
    const ready = releaseFeatures.filter(rf => rf.features?.status === 'done').length;
    const pct = Math.round((ready / total) * 100);
    
    return { ready, total, pct };
  };

  const handleRowClick = (release: any) => {
    setSelectedRelease(release);
    setDetailsOpen(true);
  };

  const handleRowSelect = (releaseId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(releaseId)) {
      newSelected.delete(releaseId);
    } else {
      newSelected.add(releaseId);
    }
    setSelectedRows(newSelected);
  };

  const handleEdit = (release: any) => {
    setEditingReleaseId(release.id);
    setDialogOpen(true);
  };

  const readiness = calculateReadiness();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Releases</h1>
          <p className="text-muted-foreground">Release management with feature/story tracking</p>
        </div>
        <PermissionGuard requiredRole="team_lead" showMessage={false}>
          <Button onClick={() => { setEditingReleaseId(undefined); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Release
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search releases..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ListScreenToolbar selectedCount={selectedRows.size} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"><Checkbox /></TableHead>
            <TableHead>Release</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Target Date</TableHead>
            <TableHead>Features</TableHead>
            <TableHead>Readiness</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {releases?.map((release) => (
            <TableRow
              key={release.id}
              className="cursor-pointer"
              onClick={() => handleRowClick(release)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedRows.has(release.id)}
                  onCheckedChange={() => handleRowSelect(release.id)}
                />
              </TableCell>
              <TableCell className="font-medium">{release.name}</TableCell>
              <TableCell>
                <div>
                  <div>{release.release_vehicles?.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {release.release_vehicles?.type}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {release.target_date ? format(new Date(release.target_date), 'MMM d, yyyy') : '-'}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {releaseFeatures?.length || 0} features
                </Badge>
              </TableCell>
              <TableCell>
                <div className="space-y-1 min-w-[120px]">
                  <Progress value={release.readiness_pct || 0} className="h-2" />
                  <span className="text-xs text-muted-foreground">
                    {release.readiness_pct || 0}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={release.status === 'shipped' ? 'default' : 'outline'}
                  className="capitalize"
                >
                  {release.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RightDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={selectedRelease?.name || ''}
        tabs={[
          {
            id: 'details',
            label: 'Details',
            content: selectedRelease && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Release Vehicle</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRelease.release_vehicles?.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Target Date</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRelease.target_date
                      ? format(new Date(selectedRelease.target_date), 'MMMM d, yyyy')
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRelease.notes || 'No notes'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Readiness</label>
                  <Progress value={readiness.pct} className="mt-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {readiness.ready} of {readiness.total} features completed ({readiness.pct}%)
                  </p>
                </div>
                <PermissionGuard requiredRole="team_lead" showMessage={false}>
                  <Button onClick={() => handleEdit(selectedRelease)} className="w-full mt-4">
                    Edit Release
                  </Button>
                </PermissionGuard>
              </div>
            ),
          },
          {
            id: 'features',
            label: 'Features',
            content: (
              <div className="space-y-3">
                {releaseFeatures?.map((rf) => (
                  <div key={rf.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{rf.features?.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {rf.features?.estimate_points} points
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rf.features?.status === 'done' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                        <Badge variant="outline" className="capitalize">
                          {rf.features?.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {(!releaseFeatures || releaseFeatures.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    No features linked to this release
                  </p>
                )}
              </div>
            ),
          },
          {
            id: 'stories',
            label: 'Stories',
            content: (
              <div className="space-y-3">
                {releaseStories?.map((rs) => (
                  <div key={rs.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{rs.stories?.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {rs.stories?.estimate_points} points
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {rs.stories?.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!releaseStories || releaseStories.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    No stories linked to this release
                  </p>
                )}
              </div>
            ),
          },
        ]}
      />

      <ReleaseDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingReleaseId(undefined); }}
        releaseId={editingReleaseId}
      />
    </div>
  );
}