import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

/**
 * Security Settings Page - Configure security and access controls
 * Source: Administration guide PDF, Page 33
 */
export default function SecuritySettings() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-brand-gold" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
              <p className="text-muted-foreground mt-2">
                Configure security policies, access controls, and permissions.
              </p>
            </div>
          </div>
          <Button variant="default" className="bg-brand-gold hover:bg-brand-gold-hover">
            Save Settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Security Configuration</CardTitle>
            <CardDescription>
              Security policies and access control settings per Jira Align specification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Security settings fields (password policies, session timeout, IP restrictions, etc.) (needs confirmation - source: pg 33-34)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
