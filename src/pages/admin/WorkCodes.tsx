import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';

/**
 * Work Codes Page - Create, update, and search identification and work codes
 * Source: Administration guide PDF, Page 10
 */

type WorkCode = {
  id: string;
  code: string;
  type: string;
  description: string;
  costCenter: string[];
  state: 'enabled' | 'disabled';
};

export default function WorkCodes() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - would be fetched from Supabase
  const workCodes: WorkCode[] = [
    {
      id: '1',
      code: 'CAP-001',
      type: 'Capitalized',
      description: 'Infrastructure investment projects',
      costCenter: ['IT-001', 'IT-002'],
      state: 'enabled',
    },
    {
      id: '2',
      code: 'OPS-001',
      type: 'Operational',
      description: 'Business as usual operations',
      costCenter: ['OPS-001'],
      state: 'enabled',
    },
    {
      id: '3',
      code: 'RND-001',
      type: 'R&D',
      description: 'Research and development initiatives',
      costCenter: ['RND-001', 'RND-002'],
      state: 'disabled',
    },
  ];

  const filteredCodes = workCodes.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Work Codes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create, update, and search for identification and work codes.
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover">
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

        <Card>
          <CardHeader>
            <CardTitle>Manage Identification Codes and Work Codes</CardTitle>
            <CardDescription>
              Requires Administration &gt; Work Code Admin permission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search work codes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">Apply Filters</Button>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost Centers</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-medium">{code.code}</TableCell>
                        <TableCell>{code.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{code.description}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {code.costCenter.map((cc) => (
                              <Badge key={cc} variant="outline" className="text-xs">
                                {cc}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={code.state === 'enabled' ? 'default' : 'secondary'}
                            className={code.state === 'enabled' ? 'bg-success/20 text-success-600' : ''}
                          >
                            {code.state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Work Code Fields:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Work Code (name) - Required</li>
                  <li>Type (dropdown) - Cannot change after creation</li>
                  <li>Description - Optional</li>
                  <li>Cost Center (multi-select) - Link to cost centers</li>
                  <li>State (enabled/disabled) - Controls visibility</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
