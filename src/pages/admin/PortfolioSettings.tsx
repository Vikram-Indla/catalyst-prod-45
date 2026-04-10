import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

/**
 * Program Settings Page - Configure program-level settings
 * Source: Administration guide PDF, Page 21
 */
export default function PortfolioSettings() {
  const queryClient = useQueryClient();
  const [estimationSystem, setEstimationSystem] = useState<string>('points');
  const [displayWeeksIn, setDisplayWeeksIn] = useState<string>('member_weeks');

  useQuery({
    queryKey: ['portfolio-settings'],
    queryFn: async () => {
      const { data, error } = await typedQuery('general_settings')
        .select('key, value')
        .in('key', ['program_estimation_system', 'program_display_weeks_in']);
      if (error) throw error;
      const settings = new Map((data || []).map((s: any) => [s.key, s.value]));
      if (settings.has('program_estimation_system')) setEstimationSystem(settings.get('program_estimation_system') as string);
      if (settings.has('program_display_weeks_in')) setDisplayWeeksIn(settings.get('program_display_weeks_in') as string);
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settings = [
        { key: 'program_estimation_system', value: estimationSystem },
        { key: 'program_display_weeks_in', value: displayWeeksIn },
      ];
      for (const s of settings) {
        const { error } = await typedQuery('general_settings')
          .upsert({ key: s.key, value: s.value }, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-settings'] });
      toast.success('Program estimation settings saved');
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
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Program Settings</h1>
              <p className="text-sm text-muted-foreground truncate">
                Configure program-level estimation and forecasting settings
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
                <CardTitle>Estimation System</CardTitle>
                <CardDescription>
                  Select the default estimation method for Epics, Capabilities, and Features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Estimation Method</Label>
                  <Select value={estimationSystem} onValueChange={setEstimationSystem}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">Points (Fibonacci)</SelectItem>
                      <SelectItem value="wsjf">WSJF (Prioritisation)</SelectItem>
                      <SelectItem value="tshirt">T-Shirt Sizing</SelectItem>
                      <SelectItem value="team_weeks">Team Weeks</SelectItem>
                      <SelectItem value="member_weeks">Member Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This system will be used across all work items in the program unless overridden
                  </p>
                </div>

                {(estimationSystem === 'member_weeks' || estimationSystem === 'team_weeks') && (
                  <div className="space-y-2">
                    <Label>Display Week Estimates In</Label>
                    <RadioGroup value={displayWeeksIn} onValueChange={setDisplayWeeksIn}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="member_weeks" id="member" />
                        <Label htmlFor="member" className="font-normal cursor-pointer">
                          Member Weeks (base unit)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="team_weeks" id="team" />
                        <Label htmlFor="team" className="font-normal cursor-pointer">
                          Team Weeks (1 team = 6 members)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Configuration</CardTitle>
                <CardDescription>
                  Additional program-specific settings
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
