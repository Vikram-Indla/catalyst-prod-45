import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Regions Management Page - Configure regional groupings
 * Source: Administration guide PDF, Page 19
 */

const mockRegions = [
  { id: '1', name: 'North America', code: 'NA', countries: 'US, CA, MX', manager: 'John Smith', active: true },
  { id: '2', name: 'Europe', code: 'EU', countries: 'GB, DE, FR, IT, ES', manager: 'Sarah Johnson', active: true },
  { id: '3', name: 'Asia Pacific', code: 'APAC', countries: 'JP, AU, SG, IN, CN', manager: 'Mike Davis', active: true },
  { id: '4', name: 'Latin America', code: 'LATAM', countries: 'BR, AR, CL, CO', manager: 'Emily Brown', active: true },
  { id: '5', name: 'Middle East & Africa', code: 'MEA', countries: 'AE, SA, ZA, EG', manager: 'David Wilson', active: true },
  { id: '6', name: 'United Kingdom & Ireland', code: 'UKI', countries: 'GB, IE', manager: 'Lisa Anderson', active: true },
  { id: '7', name: 'Nordic Countries', code: 'NORDIC', countries: 'SE, NO, DK, FI', manager: 'Robert Taylor', active: false },
];

export default function Regions() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRegions = mockRegions.filter(region =>
    region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    region.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    region.countries.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Regions</h1>
            <p className="text-muted-foreground mt-2">
              Manage regional groupings for global organizational structure
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Region
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockRegions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockRegions.filter(r => r.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockRegions.reduce((acc, r) => acc + r.countries.split(',').length, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Regional Configuration</CardTitle>
            <CardDescription>
              Configure regions for geographic organization and management structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search regions..."
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
                    <th className="text-left p-3 text-sm font-medium">Region Name</th>
                    <th className="text-left p-3 text-sm font-medium">Code</th>
                    <th className="text-left p-3 text-sm font-medium">Countries</th>
                    <th className="text-left p-3 text-sm font-medium">Regional Manager</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegions.map((region) => (
                    <tr key={region.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium">{region.name}</td>
                      <td className="p-3 text-sm">{region.code}</td>
                      <td className="p-3 text-sm">{region.countries}</td>
                      <td className="p-3 text-sm">{region.manager}</td>
                      <td className="p-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          region.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {region.active ? 'Active' : 'Inactive'}
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
