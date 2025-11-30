import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Business Units Management Page - Configure business unit hierarchy
 * Source: Administration guide PDF, Page 18
 */
export default function BusinessUnits() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Business Units</h1>
            <p className="text-muted-foreground mt-2">
              Manage business unit organizational hierarchy
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Business Unit
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Unit List</CardTitle>
            <CardDescription>
              Configure business units for portfolio grouping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO (needs confirmation): Business unit tree with Name, Code, Parent Unit, Leader, Active status. Drag-drop hierarchy (pg 18)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
