import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Shield, Users, Eye } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * System Roles Management Page - Configure system-wide roles
 * Source: Administration guide PDF, Page 22
 */

const mockSystemRoles = [
  { 
    id: '1', 
    name: 'Super Admin', 
    code: 'super_admin',
    userCount: 3, 
    description: 'Full system access with all permissions',
    permissions: ['All'],
    color: 'red',
    active: true 
  },
  { 
    id: '2', 
    name: 'Program Manager', 
    code: 'program_manager',
    userCount: 12, 
    description: 'Manage programs, features, and team assignments',
    permissions: ['Programs', 'Features', 'Teams', 'Backlog'],
    color: 'blue',
    active: true 
  },
  { 
    id: '3', 
    name: 'Portfolio Manager', 
    code: 'portfolio_manager',
    userCount: 8, 
    description: 'Manage portfolios, epics, and strategic planning',
    permissions: ['Portfolios', 'Epics', 'Themes', 'Roadmaps'],
    color: 'purple',
    active: true 
  },
  { 
    id: '4', 
    name: 'Team Lead', 
    code: 'team_lead',
    userCount: 25, 
    description: 'Manage team backlogs, stories, and sprint planning',
    permissions: ['Team Backlog', 'Stories', 'Sprints', 'Tasks'],
    color: 'green',
    active: true 
  },
  { 
    id: '5', 
    name: 'Product Owner', 
    code: 'product_owner',
    userCount: 15, 
    description: 'Prioritize backlog and define product requirements',
    permissions: ['Backlog', 'Features', 'Stories', 'Acceptance Criteria'],
    color: 'orange',
    active: true 
  },
  { 
    id: '6', 
    name: 'Scrum Master', 
    code: 'scrum_master',
    userCount: 18, 
    description: 'Facilitate agile ceremonies and remove impediments',
    permissions: ['Sprints', 'Ceremonies', 'Impediments', 'Metrics'],
    color: 'teal',
    active: true 
  },
  { 
    id: '7', 
    name: 'User', 
    code: 'user',
    userCount: 142, 
    description: 'Read-only access to assigned work items',
    permissions: ['View Work Items', 'View Reports'],
    color: 'gray',
    active: true 
  },
  { 
    id: '8', 
    name: 'Guest', 
    code: 'guest',
    userCount: 5, 
    description: 'Limited view-only access',
    permissions: ['View Dashboard'],
    color: 'gray',
    active: false 
  },
];

export default function SystemRoles() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRoles = mockSystemRoles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">System Roles</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure system-wide roles and permissions hierarchy
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockSystemRoles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockSystemRoles.filter(r => r.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockSystemRoles.reduce((acc, r) => acc + r.userCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockSystemRoles.find(r => r.code === 'super_admin')?.userCount || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Role Configuration</CardTitle>
            <CardDescription>
              Manage system-wide roles with hierarchical permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search roles..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Permissions Matrix
              </Button>
            </div>

            <div className="space-y-4">
              {filteredRoles.map((role) => (
                <Card key={role.id} className="border-l-4" style={{ borderLeftColor: `var(--${role.color}-500, #888)` }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          <Badge variant={role.active ? "default" : "secondary"}>
                            {role.active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {role.userCount} users
                          </Badge>
                        </div>
                        <CardDescription>{role.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((permission, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Hierarchy</CardTitle>
            <CardDescription>
              System roles inherit permissions based on organizational hierarchy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 pl-4">
              <div className="flex items-center gap-3 p-2 border-l-2 border-red-500">
                <Shield className="h-5 w-5 text-red-500" />
                <span className="font-medium">Super Admin</span>
                <span className="text-xs text-muted-foreground">→ All Permissions</span>
              </div>
              <div className="flex items-center gap-3 p-2 border-l-2 border-purple-500 ml-6">
                <Shield className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Portfolio Manager</span>
                <span className="text-xs text-muted-foreground">→ Portfolio + Program Permissions</span>
              </div>
              <div className="flex items-center gap-3 p-2 border-l-2 border-blue-500 ml-12">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Program Manager</span>
                <span className="text-xs text-muted-foreground">→ Program + Team Permissions</span>
              </div>
              <div className="flex items-center gap-3 p-2 border-l-2 border-green-500 ml-18">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="font-medium">Team Lead</span>
                <span className="text-xs text-muted-foreground">→ Team-Level Permissions</span>
              </div>
              <div className="flex items-center gap-3 p-2 border-l-2 border-gray-500 ml-24">
                <Eye className="h-5 w-5 text-gray-500" />
                <span className="font-medium">User</span>
                <span className="text-xs text-muted-foreground">→ Read-Only Access</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
