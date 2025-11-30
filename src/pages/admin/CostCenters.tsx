import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Cost Centers Management Page - Configure cost center codes
 * Source: Administration guide PDF, Page 16
 */
export default function CostCenters() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cost Centers</h1>
            <p className="text-muted-foreground mt-2">
              Manage cost center codes for financial tracking
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Cost Center
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cost Center List</CardTitle>
            <CardDescription>
              Configure cost centers for budget allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO (needs confirmation): Cost center table with Code, Name, Business Unit, Manager, Active status (pg 16)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
