import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Theme Groups Management Page - Configure strategic theme groupings
 * Source: Administration guide PDF, Page 19
 */

const mockThemeGroups = [
  { id: '1', name: 'Digital Transformation', description: 'Initiatives focused on digital modernization', themesCount: 5, portfolio: 'Enterprise Technology', active: true },
  { id: '2', name: 'Customer Experience', description: 'Enhancing customer-facing capabilities', themesCount: 8, portfolio: 'Commercial', active: true },
  { id: '3', name: 'Operational Excellence', description: 'Process improvement and efficiency', themesCount: 4, portfolio: 'Operations', active: true },
  { id: '4', name: 'Innovation & R&D', description: 'Research and development initiatives', themesCount: 6, portfolio: 'Product Development', active: true },
  { id: '5', name: 'Security & Compliance', description: 'Security hardening and regulatory compliance', themesCount: 3, portfolio: 'Information Security', active: true },
  { id: '6', name: 'Market Expansion', description: 'Geographic and market segment growth', themesCount: 7, portfolio: 'Growth Strategy', active: true },
  { id: '7', name: 'Platform Modernization', description: 'Infrastructure and platform upgrades', themesCount: 5, portfolio: 'Technology', active: false },
];

export default function ThemeGroups() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGroups = mockThemeGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.portfolio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Theme Groups</h1>
            <p className="text-muted-foreground mt-2">
              Manage strategic theme categorizations and portfolio groupings
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Theme Group
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockThemeGroups.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockThemeGroups.filter(g => g.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Themes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockThemeGroups.reduce((acc, g) => acc + g.themesCount, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Theme Group Configuration</CardTitle>
            <CardDescription>
              Configure theme groups for strategic organization and portfolio management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search theme groups..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">Import</Button>
              <Button variant="outline">Export</Button>
            </div>

            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Group Name</th>
                    <th className="text-left p-3 text-sm font-medium">Description</th>
                    <th className="text-left p-3 text-sm font-medium">Themes</th>
                    <th className="text-left p-3 text-sm font-medium">Portfolio</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => (
                    <tr key={group.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium">{group.name}</td>
                      <td className="p-3 text-sm max-w-md truncate">{group.description}</td>
                      <td className="p-3 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {group.themesCount} themes
                        </span>
                      </td>
                      <td className="p-3 text-sm">{group.portfolio}</td>
                      <td className="p-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          group.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {group.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-right">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
