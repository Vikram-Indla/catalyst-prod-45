import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';

/**
 * Users Management Page - Manage user profiles and system access
 * Source: Administration guide PDF, Page 20
 */
export default function Users() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-2">
              Manage user profiles, roles, and system access
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>
              View and manage all users in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-10"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              TODO (needs confirmation): User table with columns: Name, Email, Role, Teams, Last Login, Status. Bulk actions: Import, Export, Deactivate, Delete (pg 20-21)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
