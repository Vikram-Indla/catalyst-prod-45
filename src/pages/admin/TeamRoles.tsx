import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Team Roles Management Page - Configure team-level roles
 * Source: Administration guide PDF, Page 21
 */
export default function TeamRoles() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Roles</h1>
            <p className="text-muted-foreground mt-2">
              Configure team-level roles (Scrum Master, Product Owner, Developer, Tester, etc.)
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Role Configuration</CardTitle>
            <CardDescription>
              Team-specific roles: Scrum Master, Product Owner, Developer, Tester, Architect, Designer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              TODO (needs confirmation): Team role list with permissions. Roles control access at team level. Role assignment per team member (pg 21)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
