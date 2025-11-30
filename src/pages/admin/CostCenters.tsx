import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Cost Centers Management Page - Configure cost center codes
 * Source: Administration guide PDF, Page 16
 */

const mockCostCenters = [
  { id: '1', code: 'CC-1001', name: 'Engineering R&D', businessUnit: 'Technology', manager: 'John Smith', active: true },
  { id: '2', code: 'CC-1002', name: 'Product Development', businessUnit: 'Product', manager: 'Sarah Johnson', active: true },
  { id: '3', code: 'CC-2001', name: 'Marketing & Sales', businessUnit: 'Commercial', manager: 'Mike Davis', active: true },
  { id: '4', code: 'CC-2002', name: 'Customer Success', businessUnit: 'Commercial', manager: 'Emily Brown', active: true },
  { id: '5', code: 'CC-3001', name: 'Operations', businessUnit: 'Operations', manager: 'David Wilson', active: true },
  { id: '6', code: 'CC-3002', name: 'IT Infrastructure', businessUnit: 'Technology', manager: 'Lisa Anderson', active: true },
  { id: '7', code: 'CC-4001', name: 'Finance & Accounting', businessUnit: 'Finance', manager: 'Robert Taylor', active: true },
  { id: '8', code: 'CC-4002', name: 'Legal & Compliance', businessUnit: 'Legal', manager: 'Jennifer Martinez', active: false },
];

export default function CostCenters() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCostCenters = mockCostCenters.filter(cc =>
    cc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cc.businessUnit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cost Centers</h1>
            <p className="text-muted-foreground mt-2">
              Manage cost center codes for financial tracking and budget allocation
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Cost Center
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost Centers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockCostCenters.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Centers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockCostCenters.filter(c => c.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Business Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(mockCostCenters.map(c => c.businessUnit)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cost Center Configuration</CardTitle>
            <CardDescription>
              Configure cost centers for budget allocation and financial tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cost centers..."
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
                    <th className="text-left p-3 text-sm font-medium">Code</th>
                    <th className="text-left p-3 text-sm font-medium">Name</th>
                    <th className="text-left p-3 text-sm font-medium">Business Unit</th>
                    <th className="text-left p-3 text-sm font-medium">Manager</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCostCenters.map((cc) => (
                    <tr key={cc.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium">{cc.code}</td>
                      <td className="p-3 text-sm">{cc.name}</td>
                      <td className="p-3 text-sm">{cc.businessUnit}</td>
                      <td className="p-3 text-sm">{cc.manager}</td>
                      <td className="p-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          cc.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cc.active ? 'Active' : 'Inactive'}
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
