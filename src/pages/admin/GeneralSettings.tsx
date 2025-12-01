import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

/**
 * General Settings Page - System-wide general settings
 * Source: Administration guide PDF, Page 29
 */
export default function GeneralSettings() {
  const handleSave = () => {
    toast.success('General settings saved successfully');
  };

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gold/10">
                <Settings className="h-5 w-5 text-brand-gold" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">General Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure system-wide general settings and preferences
                </p>
              </div>
            </div>
            <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold-hover">
              Save Settings
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input id="org-name" defaultValue="Acme Corporation" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-description">Description</Label>
                  <Textarea
                    id="org-description"
                    defaultValue="Leading provider of enterprise solutions"
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fiscal-year-start">Fiscal Year Start</Label>
                    <Select defaultValue="january">
                      <SelectTrigger id="fiscal-year-start">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="january">January</SelectItem>
                        <SelectItem value="february">February</SelectItem>
                        <SelectItem value="march">March</SelectItem>
                        <SelectItem value="april">April</SelectItem>
                        <SelectItem value="may">May</SelectItem>
                        <SelectItem value="june">June</SelectItem>
                        <SelectItem value="july">July</SelectItem>
                        <SelectItem value="august">August</SelectItem>
                        <SelectItem value="september">September</SelectItem>
                        <SelectItem value="october">October</SelectItem>
                        <SelectItem value="november">November</SelectItem>
                        <SelectItem value="december">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">EST (US Eastern)</SelectItem>
                        <SelectItem value="cst">CST (US Central)</SelectItem>
                        <SelectItem value="mst">MST (US Mountain)</SelectItem>
                        <SelectItem value="pst">PST (US Pacific)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Date & Time Formats</CardTitle>
                <CardDescription>
                  Configure how dates and times are displayed throughout the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select defaultValue="mm-dd-yyyy">
                      <SelectTrigger id="date-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time-format">Time Format</Label>
                    <Select defaultValue="12h">
                      <SelectTrigger id="time-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="week-start">Week Starts On</Label>
                  <Select defaultValue="sunday">
                    <SelectTrigger id="week-start">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Work Item Defaults</CardTitle>
                <CardDescription>
                  Default settings for new work items
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default-state">Default State for New Items</Label>
                  <Select defaultValue="funnel">
                    <SelectTrigger id="default-state">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="funnel">Funnel</SelectItem>
                      <SelectItem value="analyzing">Analyzing</SelectItem>
                      <SelectItem value="backlog">Backlog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-assign to creator</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign new work items to their creator
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require description</Label>
                    <p className="text-sm text-muted-foreground">
                      Make description field mandatory for all work items
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Configure system notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for important events
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>In-app notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications within the application
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily digest emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Send daily summary of activity
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Maintenance</CardTitle>
                <CardDescription>
                  System maintenance and data retention settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="retention-days">Activity Log Retention (days)</Label>
                  <Input
                    id="retention-days"
                    type="number"
                    defaultValue="90"
                    min="30"
                    max="365"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of days to retain activity logs before automatic cleanup
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-archive completed items</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically archive items after 180 days of completion
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
