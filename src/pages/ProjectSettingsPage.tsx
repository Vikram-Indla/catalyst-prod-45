import React, { useState, useEffect } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Info, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  key: string;
  name: string;
  description: string | null;
  program_id: string;
  programs: {
    id: string;
    name: string;
    key: string;
  } | null;
}

export default function ProjectSettingsPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-settings', projectKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, key, name, description, program_id, programs(id, name, key)')
        .eq('key', projectKey!)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectKey,
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
              <Link to={`/projects/${project.key}`}>{project.name}</Link>
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
          <DetailsTab project={project} />
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <AccessTab />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <FeaturesTab />
        </TabsContent>

        <TabsContent value="advanced" className="mt-4">
          <AdvancedTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsTab({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [programId, setProgramId] = useState(project.program_id);
  const [originalProgramId] = useState(project.program_id);
  const [programSearch, setProgramSearch] = useState('');
  const [showProgramChangeConfirm, setShowProgramChangeConfirm] = useState(false);
  const [pendingProgramId, setPendingProgramId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch programs for dropdown
  const { data: programs } = useQuery({
    queryKey: ['programs-for-project'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, key')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const filteredPrograms = programs?.filter(p => 
    p.name.toLowerCase().includes(programSearch.toLowerCase()) ||
    p.key?.toLowerCase().includes(programSearch.toLowerCase())
  );

  const updateProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('projects')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          program_id: programId,
        })
        .eq('id', project.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-settings'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });

  const handleProgramChange = (newProgramId: string) => {
    if (newProgramId !== originalProgramId) {
      setPendingProgramId(newProgramId);
      setShowProgramChangeConfirm(true);
    } else {
      setProgramId(newProgramId);
    }
  };

  const confirmProgramChange = () => {
    if (pendingProgramId) {
      setProgramId(pendingProgramId);
    }
    setShowProgramChangeConfirm(false);
    setPendingProgramId(null);
  };

  const cancelProgramChange = () => {
    setShowProgramChangeConfirm(false);
    setPendingProgramId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Project name is required';
    if (name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    updateProject.mutate();
  };

  const selectedProgram = programs?.find(p => p.id === programId);
  const originalProgram = programs?.find(p => p.id === originalProgramId);
  const pendingProgram = programs?.find(p => p.id === pendingProgramId);

  return (
    <>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Project details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Key (read-only) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Key</Label>
              <div className="px-3 py-2 bg-muted border rounded-md text-sm font-mono">
                {project.key}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Project key cannot be changed here. Use Key Migration for key changes.
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
            </div>

            {/* Program */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Program <span className="text-destructive">*</span>
              </Label>
              <Select value={programId} onValueChange={handleProgramChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a program">
                    {selectedProgram ? `${selectedProgram.name} (${selectedProgram.key})` : 'Select a program'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[400]">
                  <div className="px-2 py-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search programs..."
                        value={programSearch}
                        onChange={(e) => setProgramSearch(e.target.value)}
                        className="pl-8 h-8"
                      />
                    </div>
                  </div>
                  {filteredPrograms?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name} ({program.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {programId !== originalProgramId && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Program will be changed from {originalProgram?.name} to {selectedProgram?.name}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                This project is linked to this program. Epics from this program can be linked to features in this project.
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
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={updateProject.isPending} className="bg-brand-gold hover:bg-brand-gold-hover">
                {updateProject.isPending ? 'Saving...' : 'Save changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setName(project.name);
                setDescription(project.description || '');
                setProgramId(project.program_id);
              }}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Program Change Confirmation */}
      <AlertDialog open={showProgramChangeConfirm} onOpenChange={setShowProgramChangeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirm Program Change
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are moving this project from <strong>{originalProgram?.name}</strong> to{' '}
                <strong>{pendingProgram?.name}</strong>.
              </p>
              <p className="text-sm">
                This will affect:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Program → Project filtering</li>
                <li>Inherited access permissions</li>
                <li>Work item visibility in program views</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelProgramChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmProgramChange} className="bg-brand-gold hover:bg-brand-gold-hover">
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AccessTab() {
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

function NotificationsTab() {
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

function FeaturesTab() {
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
  const queryClient = useQueryClient();

  const deleteProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted permanently');
      navigate('/projects');
    },
    onError: (error) => {
      toast.error('Failed to delete project: ' + error.message);
    },
  });

  const handleArchive = () => {
    if (confirm('Are you sure you want to archive this project?')) {
      toast.success('Project archived');
      navigate('/projects');
    }
  };

  const handleDelete = () => {
    if (deleteConfirmKey === project.key) {
      deleteProject.mutate();
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
                    disabled={deleteConfirmKey !== project.key || deleteProject.isPending}
                  >
                    {deleteProject.isPending ? 'Deleting...' : 'Delete permanently'}
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
