import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Save, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * General Settings Configuration Page
 * Source: Administration guide PDF, Page 23-24
 */
export default function GeneralConfig() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'General configuration has been updated successfully.',
    });
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-brand-gold" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">General Settings</h1>
              <p className="text-muted-foreground mt-2">
                Configure system-wide settings and preferences
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            className="bg-brand-gold hover:bg-brand-gold-hover"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>

        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
            <CardDescription>
              Configure your organization's basic information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input id="orgName" defaultValue="Acme Corporation" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="orgUrl">Organization URL</Label>
                <Input id="orgUrl" defaultValue="https://acme.example.com" type="url" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" defaultValue="support@acme.example.com" type="email" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Select defaultValue="america-new-york">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america-new-york">America/New York (EST)</SelectItem>
                    <SelectItem value="america-los-angeles">America/Los Angeles (PST)</SelectItem>
                    <SelectItem value="america-chicago">America/Chicago (CST)</SelectItem>
                    <SelectItem value="europe-london">Europe/London (GMT)</SelectItem>
                    <SelectItem value="asia-tokyo">Asia/Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Week Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Work Week Configuration</CardTitle>
            <CardDescription>
              Define working days and capacity planning defaults
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Working Days</Label>
                <div className="grid grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={idx < 5}
                        className="rounded"
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="hoursPerDay">Hours Per Day</Label>
                  <Input id="hoursPerDay" type="number" defaultValue="8" min="1" max="24" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="daysPerSprint">Days Per Sprint</Label>
                  <Input id="daysPerSprint" type="number" defaultValue="10" min="1" max="30" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time Formats */}
        <Card>
          <CardHeader>
            <CardTitle>Date & Time Formats</CardTitle>
            <CardDescription>
              Configure how dates and times are displayed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select defaultValue="mm-dd-yyyy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm-dd-yyyy">MM/DD/YYYY (12/31/2024)</SelectItem>
                    <SelectItem value="dd-mm-yyyy">DD/MM/YYYY (31/12/2024)</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD (2024-12-31)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select defaultValue="12h">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour (3:30 PM)</SelectItem>
                    <SelectItem value="24h">24-hour (15:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="firstDayOfWeek">First Day of Week</Label>
                <Select defaultValue="monday">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Toggles</CardTitle>
            <CardDescription>
              Enable or disable specific platform features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Dependencies Management</p>
                  <p className="text-sm text-muted-foreground">Allow users to create and track dependencies</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Risk Management</p>
                  <p className="text-sm text-muted-foreground">Track risks and mitigation strategies</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Capacity Planning</p>
                  <p className="text-sm text-muted-foreground">Plan and track team capacity across PIs</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Custom Fields</p>
                  <p className="text-sm text-muted-foreground">Allow custom field definitions on work items</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Enable File Attachments</p>
                  <p className="text-sm text-muted-foreground">Allow file uploads on work items</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Defaults</CardTitle>
            <CardDescription>
              Configure default notification preferences for new users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-sm text-muted-foreground">Send email for important updates</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Assignment notifications</p>
                  <p className="text-sm text-muted-foreground">Notify when assigned to work items</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Comment notifications</p>
                  <p className="text-sm text-muted-foreground">Notify when mentioned in comments</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Daily digest</p>
                  <p className="text-sm text-muted-foreground">Send daily summary of activities</p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Session & Security</CardTitle>
            <CardDescription>
              Configure session timeout and security policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input id="sessionTimeout" type="number" defaultValue="60" min="5" max="1440" />
                <p className="text-xs text-muted-foreground">Users will be logged out after this period of inactivity</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                <Input id="passwordExpiry" type="number" defaultValue="90" min="0" max="365" />
                <p className="text-xs text-muted-foreground">Set to 0 to disable password expiration</p>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Enforce two-factor authentication</p>
                  <p className="text-sm text-muted-foreground">Require 2FA for all user accounts</p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
