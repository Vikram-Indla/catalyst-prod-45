import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Cities Management Page - Configure city master data
 * Source: Administration guide PDF, Page 14
 */
export default function Cities() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cities</h1>
            <p className="text-muted-foreground mt-2">
              Manage city reference data for organizational locations
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add City
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>City List</CardTitle>
            <CardDescription>
              Configure cities for team and program locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO (needs confirmation): City table with Name, Country, Region, Active status. Import/Export options (pg 14)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
