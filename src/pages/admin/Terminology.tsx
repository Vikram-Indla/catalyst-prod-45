import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useState } from 'react';

/**
 * Terminology Page - Configure SAFe/DAD/LeSS terminology sets
 * Source: Administration guide PDF, Page 14-15
 */
export default function Terminology() {
  const [selectedSet, setSelectedSet] = useState('safe-40');

  const terminologySets = [
    { value: 'system-default', label: 'System Default' },
    { value: 'safe-25', label: 'SAFe 2.5' },
    { value: 'safe-30', label: 'SAFe 3.0' },
    { value: 'safe-40', label: 'SAFe 4.0' },
    { value: 'dad', label: 'DAD' },
    { value: 'less', label: 'LeSS' },
  ];

  return (
    <AdminGuard>
      <div className="h-full flex flex-col bg-background">
        <div className="border-b bg-card px-6 py-4">
          <h1 className="text-2xl font-semibold text-foreground">Platform Terminology</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure terminology sets (SAFe, DAD, LeSS) to match your processes and external tools.
          </p>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Important: You must sign out and sign back in to see terminology updates.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Terminology Configuration</CardTitle>
            <CardDescription>
              Select and customize terminology based on your framework
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Terminology Shown</Label>
                <Select value={selectedSet} onValueChange={setSelectedSet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select terminology set" />
                  </SelectTrigger>
                  <SelectContent>
                    {terminologySets.map((set) => (
                      <SelectItem key={set.value} value={set.value}>
                        {set.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Input defaultValue="Strategic Theme" />
                </div>
                <div className="space-y-2">
                  <Label>Epic</Label>
                  <Input defaultValue="Epic" />
                </div>
                <div className="space-y-2">
                  <Label>Capability</Label>
                  <Input defaultValue="Capability" />
                </div>
                <div className="space-y-2">
                  <Label>Feature</Label>
                  <Input defaultValue="Feature" />
                </div>
                <div className="space-y-2">
                  <Label>Story</Label>
                  <Input defaultValue="User Story" />
                </div>
                <div className="space-y-2">
                  <Label>Program Increment</Label>
                  <Input defaultValue="PI" />
                </div>
                <div className="space-y-2">
                  <Label>Iteration</Label>
                  <Input defaultValue="Sprint" />
                </div>
                <div className="space-y-2">
                  <Label>Release Vehicle</Label>
                  <Input defaultValue="Release Train" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Reset to Default</Button>
                <Button className="bg-brand-gold hover:bg-brand-gold-hover">
                  Update Terminology
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customize Pyramid Display</CardTitle>
            <CardDescription>
              Select areas to display in Strategy Room pyramid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Mission</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Vision</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Values</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">North Star</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Long Term Goal/Strategy</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Yearly Goal</span>
                </label>
              </div>

              <Button className="bg-brand-gold hover:bg-brand-gold-hover">
                Update Pyramid
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Record Terminology</CardTitle>
            <CardDescription>
              Configure person record terminology separately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Person/User</Label>
                  <Input defaultValue="User" />
                </div>
                <div className="space-y-2">
                  <Label>Team Member</Label>
                  <Input defaultValue="Team Member" />
                </div>
                <div className="space-y-2">
                  <Label>Product Owner</Label>
                  <Input defaultValue="Product Owner" />
                </div>
                <div className="space-y-2">
                  <Label>Scrum Master</Label>
                  <Input defaultValue="Scrum Master" />
                </div>
              </div>

              <Button className="bg-brand-gold hover:bg-brand-gold-hover">
                Update Terminology
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
