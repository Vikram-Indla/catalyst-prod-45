import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Countries Management Page - Configure country master data
 * Source: Administration guide PDF, Page 17
 */
export default function Countries() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Countries</h1>
            <p className="text-muted-foreground mt-2">
              Manage country reference data for global operations
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Country
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Country List</CardTitle>
            <CardDescription>
              Configure countries for organizational structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO (needs confirmation): Country table with Name, ISO Code, Region, Currency, Active status (pg 17)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
