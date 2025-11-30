import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Cities Management Page - Configure city master data
 * Source: Administration guide PDF, Page 14
 */

const mockCities = [
  { id: '1', name: 'New York', country: 'United States', region: 'North America', active: true },
  { id: '2', name: 'London', country: 'United Kingdom', region: 'Europe', active: true },
  { id: '3', name: 'Tokyo', country: 'Japan', region: 'Asia Pacific', active: true },
  { id: '4', name: 'Sydney', country: 'Australia', region: 'Asia Pacific', active: true },
  { id: '5', name: 'Toronto', country: 'Canada', region: 'North America', active: true },
  { id: '6', name: 'Berlin', country: 'Germany', region: 'Europe', active: true },
  { id: '7', name: 'Singapore', country: 'Singapore', region: 'Asia Pacific', active: true },
  { id: '8', name: 'Paris', country: 'France', region: 'Europe', active: false },
];

export default function Cities() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCities = mockCities.filter(city =>
    city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    city.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cities</h1>
            <p className="text-muted-foreground mt-2">
              Manage city reference data for organizational locations
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add City
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockCities.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Cities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockCities.filter(c => c.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(mockCities.map(c => c.region)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>City Configuration</CardTitle>
            <CardDescription>
              Configure cities for team and program locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cities..."
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
                    <th className="text-left p-3 text-sm font-medium">City Name</th>
                    <th className="text-left p-3 text-sm font-medium">Country</th>
                    <th className="text-left p-3 text-sm font-medium">Region</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCities.map((city) => (
                    <tr key={city.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium">{city.name}</td>
                      <td className="p-3 text-sm">{city.country}</td>
                      <td className="p-3 text-sm">{city.region}</td>
                      <td className="p-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          city.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {city.active ? 'Active' : 'Inactive'}
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
