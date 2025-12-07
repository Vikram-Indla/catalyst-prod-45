import { useState } from 'react';
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
  const [pointSystem, setPointSystem] = useState<string>('fibonacci');
  const [pointsPerWeek, setPointsPerWeek] = useState<string>('10');
  
  const handleSave = () => {
    // TODO: Save to team_point_system_settings table
    toast.success('Team estimation settings saved');
  };

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="h-[72px] border-b bg-card px-6 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground truncate">Team Settings</h1>
              <p className="text-sm text-muted-foreground truncate">
                Configure team-level estimation and point system settings
              </p>
            </div>
            <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold-hover flex-shrink-0">
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
