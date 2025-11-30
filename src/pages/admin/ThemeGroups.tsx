import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Theme Groups Management Page - Configure strategic theme groupings
 * Source: Administration guide PDF, Page 19
 */
export default function ThemeGroups() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Theme Groups</h1>
            <p className="text-muted-foreground mt-2">
              Manage strategic theme categorizations and groupings
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Theme Group
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Theme Group List</CardTitle>
            <CardDescription>
              Configure theme groups for strategic organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO (needs confirmation): Theme group table with Name, Description, Themes Count, Portfolio, Active status. Used for grouping strategic themes (pg 19)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
