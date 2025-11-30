import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Customers Management Page - Configure customer master data
 * Source: Administration guide PDF, Page 15
 */

const mockCustomers = [
  { id: '1', name: 'Acme Corporation', code: 'ACME', industry: 'Technology', businessUnit: 'Enterprise', active: true },
  { id: '2', name: 'Global Financial Services', code: 'GFS', industry: 'Finance', businessUnit: 'Financial Services', active: true },
  { id: '3', name: 'Healthcare Plus', code: 'HCP', industry: 'Healthcare', businessUnit: 'Health & Wellness', active: true },
  { id: '4', name: 'Retail Innovations', code: 'RETI', industry: 'Retail', businessUnit: 'Consumer', active: true },
  { id: '5', name: 'Manufacturing Pro', code: 'MANPRO', industry: 'Manufacturing', businessUnit: 'Industrial', active: true },
  { id: '6', name: 'Education Systems', code: 'EDUSYS', industry: 'Education', businessUnit: 'Public Sector', active: true },
  { id: '7', name: 'Transportation Hub', code: 'TRANS', industry: 'Transportation', businessUnit: 'Logistics', active: false },
];

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockCustomers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockCustomers.filter(c => c.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Industries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(mockCustomers.map(c => c.industry)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Configuration</CardTitle>
            <CardDescription>
              Configure customers for work item tagging and portfolio management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
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
                    <th className="text-left p-3 text-sm font-medium">Customer Name</th>
                    <th className="text-left p-3 text-sm font-medium">Code</th>
                    <th className="text-left p-3 text-sm font-medium">Industry</th>
                    <th className="text-left p-3 text-sm font-medium">Business Unit</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium">{customer.name}</td>
                      <td className="p-3 text-sm">{customer.code}</td>
                      <td className="p-3 text-sm">{customer.industry}</td>
                      <td className="p-3 text-sm">{customer.businessUnit}</td>
                      <td className="p-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          customer.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.active ? 'Active' : 'Inactive'}
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
