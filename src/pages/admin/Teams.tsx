import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ResponsivePageContainer, ResponsivePageHeader, ResponsiveGrid, ResponsiveTableWrapper } from '@/components/layout/ResponsivePageContainer';

/**
 * Teams Management Page - Configure team structure and settings
 * Source: Administration guide PDF, Basic Structure section
 */
export default function Teams() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, projects:projects!project_id(name)')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  return (
    <AdminGuard>
      <ResponsivePageContainer>
        <ResponsivePageHeader
          title="Teams"
          description="Configure team structure and membership settings"
          actions={
            <Button className="bg-brand-gold hover:bg-brand-gold-hover">
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          }
        />

        <ResponsiveGrid cols={3}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Programs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(teams?.map((t: any) => t.projects?.name)).size || 0}
              </div>
            </CardContent>
          </Card>
        </ResponsiveGrid>

        <Card>
          <CardHeader>
            <CardTitle>Team Configuration</CardTitle>
            <CardDescription>
              Manage teams, their membership, and program associations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading teams...</div>
            ) : (
              <ResponsiveTableWrapper minWidth={600}>
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Team Name</th>
                      <th className="text-left p-3 text-sm font-medium">Program</th>
                      <th className="text-left p-3 text-sm font-medium">Members</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-right p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams?.map((team) => (
                      <tr key={team.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 text-sm">{team.name}</td>
                        <td className="p-3 text-sm">{(team as any).projects?.name || 'N/A'}</td>
                        <td className="p-3 text-sm">-</td>
                        <td className="p-3 text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-success/20 text-success-600">
                            Active
                          </span>
                        </td>
                        <td className="p-3 text-sm text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTableWrapper>
            )}
          </CardContent>
        </Card>
      </ResponsivePageContainer>
    </AdminGuard>
  );
}
