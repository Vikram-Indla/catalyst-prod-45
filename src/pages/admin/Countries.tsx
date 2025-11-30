import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Countries Management Page - Configure country master data
 * Source: Administration guide PDF, Page 17
 */

const mockCountries = [
  { id: '1', name: 'United States', isoCode: 'US', region: 'North America', currency: 'USD', active: true },
  { id: '2', name: 'United Kingdom', isoCode: 'GB', region: 'Europe', currency: 'GBP', active: true },
  { id: '3', name: 'Germany', isoCode: 'DE', region: 'Europe', currency: 'EUR', active: true },
  { id: '4', name: 'France', isoCode: 'FR', region: 'Europe', currency: 'EUR', active: true },
  { id: '5', name: 'Japan', isoCode: 'JP', region: 'Asia Pacific', currency: 'JPY', active: true },
  { id: '6', name: 'Australia', isoCode: 'AU', region: 'Asia Pacific', currency: 'AUD', active: true },
  { id: '7', name: 'Canada', isoCode: 'CA', region: 'North America', currency: 'CAD', active: true },
  { id: '8', name: 'Singapore', isoCode: 'SG', region: 'Asia Pacific', currency: 'SGD', active: true },
  { id: '9', name: 'India', isoCode: 'IN', region: 'Asia Pacific', currency: 'INR', active: true },
  { id: '10', name: 'Brazil', isoCode: 'BR', region: 'South America', currency: 'BRL', active: false },
];

export default function Countries() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCountries = mockCountries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.isoCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Countries</h1>
            <p className="text-muted-foreground mt-2">
              Manage country reference data for global operations
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Add Country
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockCountries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockCountries.filter(c => c.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(mockCountries.map(c => c.region)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Country Configuration</CardTitle>
            <CardDescription>
              Configure countries for organizational structure and regional management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search countries..."
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
                    <th className="text-left p-3 text-sm font-medium">Country Name</th>
                    <th className="text-left p-3 text-sm font-medium">ISO Code</th>
                    <th className="text-left p-3 text-sm font-medium">Region</th>
                    <th className="text-left p-3 text-sm font-medium">Currency</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCountries.map((country) => (
                    <tr key={country.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium">{country.name}</td>
                      <td className="p-3 text-sm">{country.isoCode}</td>
                      <td className="p-3 text-sm">{country.region}</td>
                      <td className="p-3 text-sm">{country.currency}</td>
                      <td className="p-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          country.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {country.active ? 'Active' : 'Inactive'}
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
