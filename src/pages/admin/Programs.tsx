import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ResponsivePageContainer, ResponsivePageHeader, ResponsiveGrid, ResponsiveTableWrapper } from '@/components/layout/ResponsivePageContainer';

/**
 * Programs Management Page - Configure program structure and settings
 * Source: Administration guide PDF, Basic Structure section
 */
export default function Programs() {
  const { data: programs, isLoading } = useQuery({
    queryKey: ['admin-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*, portfolios(name)')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  return (
    <AdminGuard>
      <ResponsivePageContainer>
        <ResponsivePageHeader
          title="Programs"
          description="Configure program structure and portfolio associations"
          actions={
            <Button className="bg-brand-gold hover:bg-brand-gold-hover">
              <Plus className="h-4 w-4 mr-2" />
              Add Program
            </Button>
          }
        />

        <ResponsiveGrid cols={3}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(programs?.map(p => p.portfolios?.name)).size || 0}
              </div>
            </CardContent>
          </Card>
        </ResponsiveGrid>

        <Card>
          <CardHeader>
            <CardTitle>Program Configuration</CardTitle>
            <CardDescription>
              Manage programs, their teams, and portfolio associations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-[var(--s4)] mb-[var(--s4)]">
              <div className="relative flex-1">
                <Search className="absolute left-[var(--s3)] top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search programs..."
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-[var(--s8)] text-muted-foreground">Loading programs...</div>
            ) : (
              <ResponsiveTableWrapper minWidth={600}>
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Program Name</th>
                      <th className="text-left p-3 text-sm font-medium">Portfolio</th>
                      <th className="text-left p-3 text-sm font-medium">Teams</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-right p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs?.map((program) => (
                      <tr key={program.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 text-sm">{program.name}</td>
                        <td className="p-3 text-sm">{program.portfolios?.name || 'N/A'}</td>
                        <td className="p-3 text-sm">-</td>
                        <td className="p-3 text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
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
