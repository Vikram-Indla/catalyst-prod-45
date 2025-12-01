import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ResponsivePageContainer, ResponsivePageHeader, ResponsiveGrid, ResponsiveTableWrapper } from '@/components/layout/ResponsivePageContainer';

/**
 * Portfolios Management Page - Configure portfolio structure and settings
 * Source: Administration guide PDF, Basic Structure section
 */
export default function Portfolios() {
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['admin-portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  return (
    <AdminGuard>
      <ResponsivePageContainer>
        <ResponsivePageHeader
          title="Portfolios"
          description="Configure portfolio structure and enterprise associations"
          actions={
            <Button className="bg-brand-gold hover:bg-brand-gold-hover">
              <Plus className="h-4 w-4 mr-2" />
              Add Portfolio
            </Button>
          }
        />

        <ResponsiveGrid cols={3}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolios?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Portfolios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolios?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        </ResponsiveGrid>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Configuration</CardTitle>
            <CardDescription>
              Manage portfolios, their programs, and strategic alignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-[var(--s4)] mb-[var(--s4)]">
              <div className="relative flex-1">
                <Search className="absolute left-[var(--s3)] top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search portfolios..."
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-[var(--s8)] text-muted-foreground">Loading portfolios...</div>
            ) : (
              <ResponsiveTableWrapper minWidth={600}>
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Portfolio Name</th>
                      <th className="text-left p-3 text-sm font-medium">Programs</th>
                      <th className="text-left p-3 text-sm font-medium">Themes</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-right p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolios?.map((portfolio) => (
                      <tr key={portfolio.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 text-sm">{portfolio.name}</td>
                        <td className="p-3 text-sm">-</td>
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
