import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, ChevronRight } from 'lucide-react';
import { useState } from 'react';

/**
 * Business Units Management Page - Configure business unit hierarchy
 * Source: Administration guide PDF, Page 18
 */

const mockBusinessUnits = [
  { id: '1', name: 'Enterprise Technology', code: 'ENT-TECH', parentUnit: null, leader: 'John Smith', active: true },
  { id: '2', name: 'Product Engineering', code: 'PROD-ENG', parentUnit: 'Enterprise Technology', leader: 'Sarah Johnson', active: true },
  { id: '3', name: 'Platform Services', code: 'PLAT-SVC', parentUnit: 'Enterprise Technology', leader: 'Mike Davis', active: true },
  { id: '4', name: 'Financial Services', code: 'FIN-SVC', parentUnit: null, leader: 'Emily Brown', active: true },
  { id: '5', name: 'Commercial Banking', code: 'COMM-BANK', parentUnit: 'Financial Services', leader: 'David Wilson', active: true },
  { id: '6', name: 'Investment Banking', code: 'INV-BANK', parentUnit: 'Financial Services', leader: 'Lisa Anderson', active: true },
  { id: '7', name: 'Operations', code: 'OPS', parentUnit: null, leader: 'Robert Taylor', active: true },
  { id: '8', name: 'Supply Chain', code: 'SUPPLY', parentUnit: 'Operations', leader: 'Jennifer Martinez', active: true },
  { id: '9', name: 'Customer Success', code: 'CUST-SUC', parentUnit: null, leader: 'William Garcia', active: false },
];

export default function BusinessUnits() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUnits = mockBusinessUnits.filter(unit =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (unit.parentUnit && unit.parentUnit.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Business Units</h1>
            <p className="text-muted-foreground mt-2">
              Manage business unit organizational hierarchy and structure
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Business Unit
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockBusinessUnits.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockBusinessUnits.filter(u => u.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top-Level Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockBusinessUnits.filter(u => !u.parentUnit).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Unit Hierarchy</CardTitle>
            <CardDescription>
              Configure business units for portfolio grouping and organizational structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search business units..."
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
                    <th className="text-left p-3 text-sm font-medium">Unit Name</th>
                    <th className="text-left p-3 text-sm font-medium">Code</th>
                    <th className="text-left p-3 text-sm font-medium">Parent Unit</th>
                    <th className="text-left p-3 text-sm font-medium">Leader</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((unit) => (
                    <tr key={unit.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {unit.parentUnit && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          {unit.name}
                        </div>
                      </td>
                      <td className="p-3 text-sm">{unit.code}</td>
                      <td className="p-3 text-sm">{unit.parentUnit || '-'}</td>
                      <td className="p-3 text-sm">{unit.leader}</td>
                      <td className="p-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          unit.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {unit.active ? 'Active' : 'Inactive'}
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
