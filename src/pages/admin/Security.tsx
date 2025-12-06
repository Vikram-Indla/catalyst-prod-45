import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Security Settings Page - Configure security policies and access controls
 * Source: Administration guide PDF, Basic Structure section
 */
export default function Security() {
  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Security</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure security policies, access controls, and authentication
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            Save Changes
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

        <Card>
          <CardHeader>
            <CardTitle>Authentication Settings</CardTitle>
            <CardDescription>
              Configure authentication requirements and session management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input type="number" defaultValue="60" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require email verification</Label>
                <p className="text-sm text-muted-foreground">
                  Users must verify email before accessing system
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable single sign-on (SSO)</Label>
                <p className="text-sm text-muted-foreground">
                  Allow authentication via enterprise SSO
                </p>
              </div>
              <Switch />
            </div>

            <div className="space-y-2">
              <Label>Password Policy</Label>
              <Select defaultValue="strong">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                  <SelectItem value="strong">Strong (8+ chars, mixed case, numbers)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (12+ chars, symbols required)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
            <CardDescription>
              Configure role-based access control and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable role hierarchy</Label>
                <p className="text-sm text-muted-foreground">
                  Higher roles inherit permissions from lower roles
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Scope-based access</Label>
                <p className="text-sm text-muted-foreground">
                  Restrict data visibility by portfolio/program/team membership
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Audit user actions</Label>
                <p className="text-sm text-muted-foreground">
                  Log all create, update, and delete operations
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Protection</CardTitle>
            <CardDescription>
              Configure data encryption and retention policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Encrypt sensitive data</Label>
                <p className="text-sm text-muted-foreground">
                  Encrypt sensitive fields at rest
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="space-y-2">
              <Label>Data Retention Period (days)</Label>
              <Input type="number" defaultValue="365" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable soft delete</Label>
                <p className="text-sm text-muted-foreground">
                  Mark items as deleted instead of permanent removal
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IP Restrictions</CardTitle>
            <CardDescription>
              Restrict access by IP address or network range
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable IP whitelisting</Label>
                <p className="text-sm text-muted-foreground">
                  Only allow access from approved IP addresses
                </p>
              </div>
              <Switch />
            </div>

            <div className="space-y-2">
              <Label>Allowed IP Addresses</Label>
              <Input placeholder="e.g., 192.168.1.0/24, 10.0.0.1" />
              <p className="text-xs text-muted-foreground">
                Enter IP addresses or CIDR ranges, separated by commas
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
