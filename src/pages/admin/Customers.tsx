import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Customers Management Page - Configure customer master data
 * Source: Administration guide PDF, Page 15
 */
export default function Customers() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground mt-2">
              Manage customer organizations and accounts
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>
              Configure customers for work item tagging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO (needs confirmation): Customer table with Name, Code, Industry, Business Unit, Active status (pg 15)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
