import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { AlertTriangle } from 'lucide-react';

interface Program {
  id: string;
  key: string;
  name: string;
  description: string;
  lead: string;
  type: string;
}

const mockProgram: Program = {
  id: '1',
  key: 'PROD',
  name: 'Product Program',
  description: 'Main product program with all product-related epics and features',
  lead: 'john-doe',
  type: 'standard',
};

const mockUsers = [
  { label: 'John Doe', value: 'john-doe' },
  { label: 'Jane Smith', value: 'jane-smith' },
  { label: 'Bob Johnson', value: 'bob-johnson' },
  { label: 'Alice Brown', value: 'alice-brown' },
];

export default function ProgramSettingsPage({ programKey }: { programKey: string }) {
  const [program, setProgram] = useState<Program>(mockProgram);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDetails = async (data: any) => {
    setIsSaving(true);
    try {
      setProgram({
        ...program,
        name: data.name || program.name,
        description: data.description || program.description,
        lead: data.lead || program.lead,
        type: data.type || program.type,
      });
    } catch (error) {
      console.error('Error updating program:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/programs">Programs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/programs/${programKey}`}>{program.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground">Program settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage settings for {program.name}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <DetailsTab
            program={program}
            onSave={handleSaveDetails}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Program permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Permissions management will be implemented in Phase 10
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Notification settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Notification settings will be implemented in Phase 10
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-4">
          <AdvancedTab program={program} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsTab({ program, onSave, isSaving }: { program: Program; onSave: (data: any) => void; isSaving: boolean }) {
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description);
  const [lead, setLead] = useState(program.lead);
  const [type, setType] = useState(program.type);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Program name is required';
    if (name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters';
    if (!lead) newErrors.lead = 'Program lead is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSave({ name, description, lead, type });
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Program details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Key (read-only) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Key</Label>
            <div className="px-3 py-2 bg-muted border rounded-md text-sm">
              {program.key}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Program key cannot be changed
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Program name"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            <p className="text-[11px] text-muted-foreground">
              The display name for this program
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-semibold">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Program description"
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">
              A brief description of this program
            </p>
          </div>

          {/* Lead */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              Program lead <span className="text-destructive">*</span>
            </Label>
            <Select value={lead} onValueChange={setLead}>
              <SelectTrigger>
                <SelectValue placeholder="Select program lead" />
              </SelectTrigger>
              <SelectContent>
                {mockUsers.map((user) => (
                  <SelectItem key={user.value} value={user.value}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lead && <p className="text-xs text-destructive">{errors.lead}</p>}
            <p className="text-[11px] text-muted-foreground">
              The person responsible for this program
            </p>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              Program type <span className="text-destructive">*</span>
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select program type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="initiative">Initiative</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              The type of program structure
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AdvancedTab({ program }: { program: Program }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleArchive = () => {
    if (confirm('Are you sure you want to archive this program?')) {
      // TODO: Call API to archive program
    }
  };

  const handleDelete = () => {
    if (program.key === 'DEFAULT') {
      alert('Cannot delete the Default program');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteConfirmText === program.key) {
      // TODO: Call API to delete program
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      {/* Archive Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Archive program</CardTitle>
          <CardDescription className="text-xs">
            Archived programs are hidden from the program list but can be restored later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={handleArchive}>
            Archive program
          </Button>
        </CardContent>
      </Card>

      {/* Delete Section */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-destructive">Delete program</CardTitle>
          <CardDescription className="text-xs">
            Permanently delete this program and all its epics. This action cannot be undone.
            {program.key === 'DEFAULT' && (
              <strong> The Default program cannot be deleted.</strong>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={program.key === 'DEFAULT'}
            >
              Delete program
            </Button>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Confirm deletion</AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-xs">
                  Type <strong>{program.key}</strong> to confirm deletion:
                </p>
                <Input
                  placeholder={program.key}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={confirmDelete}
                    disabled={deleteConfirmText !== program.key}
                  >
                    Delete permanently
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
