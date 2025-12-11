import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { AlertTriangle, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  programId: string;
  programName: string;
  lead: string;
  type: string;
  category: string;
}

const mockUsers = [
  { label: 'Vikram Indla', value: 'vikram-indla' },
  { label: 'Jane Smith', value: 'jane-smith' },
  { label: 'Bob Johnson', value: 'bob-johnson' },
  { label: 'Alice Brown', value: 'alice-brown' },
];

export default function ProjectSettingsPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-settings', projectKey],
    queryFn: async () => {
      const mockProject: Project = {
        id: '1',
        key: projectKey || 'ICP',
        name: 'ICP Project',
        description: 'Invoice and compliance platform',
        programId: 'PROD',
        programName: 'Product Program',
        lead: 'vikram-indla',
        type: 'Scrum',
        category: 'Company-managed software',
      };
      return mockProject;
    },
    enabled: !!projectKey,
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      console.log('Updating project:', data);
      return data;
    },
    onSuccess: () => {
      toast.success('Project settings saved');
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectKey] });
    },
    onError: (error: Error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });

  if (isLoading || !project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/projects/${projectKey}`}>{project.name}</Link>
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
        <h1 className="text-xl font-medium text-foreground">Project settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage settings for {project.name}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <DetailsTab
            project={project}
            onSave={(data) => updateProjectMutation.mutate(data)}
            isSaving={updateProjectMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <AccessTab project={project} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab project={project} />
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <FeaturesTab project={project} />
        </TabsContent>

        <TabsContent value="advanced" className="mt-4">
          <AdvancedTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsTab({ project, onSave, isSaving }: { project: Project; onSave: (data: any) => void; isSaving: boolean }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [lead, setLead] = useState(project.lead);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Project name is required';
    if (name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters';
    if (!lead) newErrors.lead = 'Project lead is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSave({ name, description, lead });
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Project details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Key (read-only) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Key</Label>
            <div className="px-3 py-2 bg-muted border rounded-md text-sm">
              {project.key}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Project key cannot be changed
            </p>
          </div>

          {/* Program (read-only with link) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Program</Label>
            <div className="px-3 py-2 bg-muted border rounded-md text-sm">
              <Link
                to={`/programs/${project.programId}`}
                className="text-primary hover:underline"
              >
                {project.programName} ({project.programId})
              </Link>
            </div>
            <p className="text-[11px] text-muted-foreground">
              This project is linked to this program. Epics from this program can be linked to features in this project.
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
              placeholder="Enter project name"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            <p className="text-[11px] text-muted-foreground">
              The display name for this project
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-semibold">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project description"
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">
              A brief description of this project
            </p>
          </div>

          {/* Lead */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              Project lead <span className="text-destructive">*</span>
            </Label>
            <Select value={lead} onValueChange={setLead}>
              <SelectTrigger>
                <SelectValue placeholder="Select project lead" />
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
              The person responsible for this project
            </p>
          </div>

          {/* Type (read-only) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Project type</Label>
            <div className="px-3 py-2 bg-muted border rounded-md text-sm">
              {project.type}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Project type cannot be changed after creation
            </p>
          </div>

          {/* Category (read-only) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Category</Label>
            <div className="px-3 py-2 bg-muted border rounded-md text-sm">
              {project.category}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Project category
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

function AccessTab({ project }: { project: Project }) {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Project access</CardTitle>
        <CardDescription className="text-xs">
          Manage who can access this project and what they can do.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Access management will be implemented in a future phase (Permissions & Security).
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function NotificationsTab({ project }: { project: Project }) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);

  const handleSave = () => {
    toast.success('Notification settings saved');
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Notification settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">Email notifications</div>
            <div className="text-xs text-muted-foreground">
              Receive email updates for project activities
            </div>
          </div>
          <Switch
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium">Slack notifications</div>
            <div className="text-xs text-muted-foreground">
              Send notifications to Slack channels
            </div>
          </div>
          <Switch
            checked={slackNotifications}
            onCheckedChange={setSlackNotifications}
          />
        </div>

        <Button onClick={handleSave} className="mt-4">
          Save notification settings
        </Button>
      </CardContent>
    </Card>
  );
}

function FeaturesTab({ project }: { project: Project }) {
  const [issueTypes, setIssueTypes] = useState(true);
  const [sprints, setSprints] = useState(true);
  const [releases, setReleases] = useState(true);

  const handleSave = () => {
    toast.success('Feature settings saved');
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Project features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">Issue types</div>
            <div className="text-xs text-muted-foreground">
              Enable custom issue types for this project
            </div>
          </div>
          <Switch checked={issueTypes} onCheckedChange={setIssueTypes} />
        </div>

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <div className="text-sm font-medium">Sprints</div>
            <div className="text-xs text-muted-foreground">
              Enable sprint planning and tracking
            </div>
          </div>
          <Switch checked={sprints} onCheckedChange={setSprints} />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium">Releases</div>
            <div className="text-xs text-muted-foreground">
              Enable release management
            </div>
          </div>
          <Switch checked={releases} onCheckedChange={setReleases} />
        </div>

        <Button onClick={handleSave} className="mt-4">
          Save feature settings
        </Button>
      </CardContent>
    </Card>
  );
}

function AdvancedTab({ project }: { project: Project }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState('');
  const navigate = useNavigate();

  const handleArchive = () => {
    if (confirm('Are you sure you want to archive this project?')) {
      toast.success('Project archived');
      navigate('/projects');
    }
  };

  const handleDelete = () => {
    if (deleteConfirmKey === project.key) {
      toast.success('Project deleted permanently');
      navigate('/projects');
    } else {
      toast.error('Project key does not match');
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      {/* Archive Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Archive project</CardTitle>
          <CardDescription className="text-xs">
            Archived projects are hidden from the project list but can be restored later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={handleArchive}>
            Archive project
          </Button>
        </CardContent>
      </Card>

      {/* Delete Section */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-destructive">Delete project</CardTitle>
          <CardDescription className="text-xs">
            Permanently delete this project and all its issues. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              Delete project
            </Button>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Confirm deletion</AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-xs">
                  Type <strong>{project.key}</strong> to confirm deletion:
                </p>
                <Input
                  placeholder={project.key}
                  value={deleteConfirmKey}
                  onChange={(e) => setDeleteConfirmKey(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteConfirmKey !== project.key}
                  >
                    Delete permanently
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmKey('');
                    }}
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
