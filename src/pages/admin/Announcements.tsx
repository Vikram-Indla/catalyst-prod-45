import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Plus, Megaphone, Edit, Trash2 } from 'lucide-react';

/**
 * Announcements Page - System-wide announcements management
 * Source: Administration guide PDF, Page 69
 */
export default function Announcements() {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: announcements?.length || 0,
    active: announcements?.filter(a => a.is_active).length || 0,
    inactive: announcements?.filter(a => !a.is_active).length || 0,
  };

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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{stats.inactive}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active and Inactive Announcements</CardTitle>
            <CardDescription>
              Manage announcements for your Jira Align instance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading announcements...</div>
            ) : announcements && announcements.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">{announcement.title}</TableCell>
                        <TableCell className="max-w-xs truncate">{announcement.message}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {announcement.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{announcement.target_audience}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(announcement.start_date), 'MMM d')} - {format(new Date(announcement.end_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={announcement.is_active ? 'default' : 'secondary'}
                            className={announcement.is_active ? 'bg-green-100 text-green-800' : ''}
                          >
                            {announcement.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">No announcements yet</p>
                <p className="text-sm">Create your first announcement to notify users</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcement Configuration</CardTitle>
            <CardDescription>
              Configure announcement settings and targeting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-1">Target Audience Options:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>All Users - Visible to everyone</li>
                  <li>By Role - Target specific system roles</li>
                  <li>By Team - Target specific teams</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Announcement Types:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Info - General information</li>
                  <li>Warning - Important notice</li>
                  <li>Alert - Urgent attention required</li>
                  <li>Maintenance - System maintenance notice</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Features:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Dismissible - Users can dismiss the announcement</li>
                  <li>Date Range - Control visibility period</li>
                  <li>Active/Inactive - Toggle announcement status</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
