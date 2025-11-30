import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Regions Management Page - Configure regional groupings
 * Source: Administration guide PDF, Page 19
 */
export default function Regions() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Regions</h1>
            <p className="text-muted-foreground mt-2">
              Manage regional groupings for global organization
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Region
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Region List</CardTitle>
            <CardDescription>
              Configure regions for geographic organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO (needs confirmation): Region table with Name, Code, Countries, Regional Manager, Active status (pg 19)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
