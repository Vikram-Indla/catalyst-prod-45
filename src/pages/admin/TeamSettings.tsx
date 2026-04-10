import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * Team Settings Page - Configure team-level settings
 * Source: Administration guide PDF, Page 18
 */
export default function TeamSettings() {
  const queryClient = useQueryClient();
  const [pointSystem, setPointSystem] = useState<string>('fibonacci');
  const [pointsPerWeek, setPointsPerWeek] = useState<string>('10');

  // Load existing settings
  useQuery({
    queryKey: ['team-settings'],
    queryFn: async () => {
      const { data, error } = await typedQuery('general_settings')
        .select('key, value')
        .in('key', ['team_point_system', 'team_points_per_week']);
      if (error) throw error;
      const settings = new Map((data || []).map((s: any) => [s.key, s.value]));
      if (settings.has('team_point_system')) setPointSystem(settings.get('team_point_system') as string);
      if (settings.has('team_points_per_week')) setPointsPerWeek(settings.get('team_points_per_week') as string);
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settings = [
        { key: 'team_point_system', value: pointSystem },
        { key: 'team_points_per_week', value: pointsPerWeek },
      ];
      for (const s of settings) {
        const { error } = await typedQuery('general_settings')
          .upsert({ key: s.key, value: s.value }, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-settings'] });
      toast.success('Team estimation settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => saveMutation.mutate();

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="h-[72px] border-b bg-card flex-shrink-0">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Team Settings</h1>
              <p className="text-sm text-muted-foreground truncate">
                Configure team-level estimation and point system settings
              </p>
            </div>
            <Button onClick={handleSave} className="bg-brand-primary hover:bg-brand-primary-hover flex-shrink-0">
              Save Settings
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Story Point System</CardTitle>
                <CardDescription>
                  Configure the point system used by teams for story estimation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Point System Scale</Label>
                  <Select value={pointSystem} onValueChange={setPointSystem}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fibonacci">Fibonacci (1, 2, 3, 5, 8, 13, 21, 34)</SelectItem>
                      <SelectItem value="power_of_2">Power of 2 (1, 2, 4, 8, 16, 32, 64)</SelectItem>
                      <SelectItem value="linear">Linear (1, 2, 3, 4, 5, 6, 7, 8)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This scale will be used for story point estimation across all teams
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Story Points per Member Week</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.5"
                    value={pointsPerWeek}
                    onChange={(e) => setPointsPerWeek(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Average story points delivered per member week (used for capacity planning)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Configuration</CardTitle>
                <CardDescription>
                  Additional team-specific settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Additional configuration options will be available here
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
