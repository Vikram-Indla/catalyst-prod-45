import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Megaphone } from 'lucide-react';

/**
 * Announcements Page - System-wide announcements management
 * Source: Administration guide PDF, Page 69
 */
export default function Announcements() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-brand-gold" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Add Announcements</h1>
              <p className="text-muted-foreground mt-2">
                Notify users about system updates, company updates, and other announcements.
              </p>
            </div>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Create Announcement
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active and Inactive Announcements</CardTitle>
            <CardDescription>
              Manage announcements for your Jira Align instance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Announcements grid with title, message, status (active/inactive), date range, target audience, Create/Edit/Delete actions (needs confirmation - source: pg 69)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
