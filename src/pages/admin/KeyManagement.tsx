import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const KEY_REGEX = /^[A-Z]{3}$/;

interface KeyMapping {
  id: string;
  name: string;
  currentKey: string;
  newKey: string;
  isValid: boolean;
  error: string;
}

export default function KeyManagement() {
  const queryClient = useQueryClient();
  const [programMappings, setProgramMappings] = useState<KeyMapping[]>([]);
  const [projectMappings, setProjectMappings] = useState<KeyMapping[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [migrationType, setMigrationType] = useState<'programs' | 'projects'>('programs');

  // Fetch programs (portfolios)
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['admin-program-keys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('portfolios').select('id, name, key').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects (programs table)
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['admin-project-keys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, key, portfolio_id').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  React.useEffect(() => {
    if (programs) {
      setProgramMappings(programs.map(p => ({
        id: p.id,
        name: p.name,
        currentKey: p.key || '',
        newKey: '',
        isValid: true,
        error: '',
      })));
    }
  }, [programs]);

  React.useEffect(() => {
    if (projects) {
      setProjectMappings(projects.map(p => ({
        id: p.id,
        name: p.name,
        currentKey: p.key || '',
        newKey: '',
        isValid: true,
        error: '',
      })));
    }
  }, [projects]);

  const validateKey = (value: string, mappings: KeyMapping[], currentId: string, existingKeys: string[]): string => {
    if (!value) return '';
    if (!KEY_REGEX.test(value)) return 'Must be exactly 3 uppercase letters';
    const duplicateInMappings = mappings.some(m => m.id !== currentId && m.newKey === value);
    if (duplicateInMappings) return 'Duplicate key in mappings';
    if (existingKeys.includes(value)) return 'Key already exists';
    return '';
  };

  const handleProgramKeyChange = (id: string, value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const existingKeys = programs?.filter(p => p.id !== id).map(p => p.key) || [];
    setProgramMappings(prev => prev.map(m => {
      if (m.id !== id) return m;
      const error = validateKey(upperValue, prev, id, existingKeys);
      return { ...m, newKey: upperValue, isValid: !error || !upperValue, error };
    }));
  };

  const handleProjectKeyChange = (id: string, value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const existingKeys = projects?.filter(p => p.id !== id).map(p => p.key) || [];
    setProjectMappings(prev => prev.map(m => {
      if (m.id !== id) return m;
      const error = validateKey(upperValue, prev, id, existingKeys);
      return { ...m, newKey: upperValue, isValid: !error || !upperValue, error };
    }));
  };

  const migrateProgramsMutation = useMutation({
    mutationFn: async () => {
      const toMigrate = programMappings.filter(m => m.newKey && m.newKey.length === 3 && m.isValid);
      for (const mapping of toMigrate) {
        // Store old key as alias
        if (mapping.currentKey) {
          await supabase.from('program_key_aliases').insert({
            program_id: mapping.id,
            old_key: mapping.currentKey,
          }).select();
        }
        // Update program key
        const { error } = await supabase.from('portfolios').update({ key: mapping.newKey }).eq('id', mapping.id);
        if (error) throw error;
      }
      return toMigrate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-program-keys'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast.success(`Migrated ${count} program keys successfully`);
      setShowConfirmDialog(false);
      setConfirmText('');
    },
    onError: (error) => toast.error('Migration failed: ' + error.message),
  });

  const migrateProjectsMutation = useMutation({
    mutationFn: async () => {
      const toMigrate = projectMappings.filter(m => m.newKey && m.newKey.length === 3 && m.isValid);
      for (const mapping of toMigrate) {
        if (mapping.currentKey) {
          await supabase.from('project_key_aliases').insert({
            project_id: mapping.id,
            old_key: mapping.currentKey,
          }).select();
        }
        const { error } = await supabase.from('programs').update({ key: mapping.newKey }).eq('id', mapping.id);
        if (error) throw error;
      }
      return toMigrate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-project-keys'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success(`Migrated ${count} project keys successfully`);
      setShowConfirmDialog(false);
      setConfirmText('');
    },
    onError: (error) => toast.error('Migration failed: ' + error.message),
  });

  const handleRunMigration = () => {
    if (confirmText !== 'MIGRATE KEYS') return;
    if (migrationType === 'programs') migrateProgramsMutation.mutate();
    else migrateProjectsMutation.mutate();
  };

  const programsToMigrate = programMappings.filter(m => m.newKey && m.newKey.length === 3 && m.isValid);
  const projectsToMigrate = projectMappings.filter(m => m.newKey && m.newKey.length === 3 && m.isValid);

  if (programsLoading || projectsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Key Management</h1>
        <p className="text-muted-foreground">Migrate program and project keys to 3-letter format</p>
      </div>

      <Tabs defaultValue="programs">
        <TabsList><TabsTrigger value="programs">Program Keys</TabsTrigger><TabsTrigger value="projects">Project Keys</TabsTrigger></TabsList>
        
        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Program Keys</CardTitle><CardDescription>Assign 3-letter keys to programs</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {programMappings.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1"><p className="font-medium">{m.name}</p></div>
                    <Badge variant="outline">{m.currentKey || 'No key'}</Badge>
                    <span>→</span>
                    <div className="w-24">
                      <Input value={m.newKey} onChange={e => handleProgramKeyChange(m.id, e.target.value)} placeholder="ABC" maxLength={3} className={m.error ? 'border-destructive' : ''} />
                    </div>
                    {m.newKey && (m.isValid ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-destructive" />)}
                  </div>
                ))}
              </div>
              <Button className="mt-4 bg-brand-gold hover:bg-brand-gold-hover" onClick={() => { setMigrationType('programs'); setShowConfirmDialog(true); }} disabled={programsToMigrate.length === 0}>
                Migrate {programsToMigrate.length} Program Keys
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Project Keys</CardTitle><CardDescription>Assign 3-letter keys to projects</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectMappings.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1"><p className="font-medium">{m.name}</p></div>
                    <Badge variant="outline">{m.currentKey || 'No key'}</Badge>
                    <span>→</span>
                    <div className="w-24">
                      <Input value={m.newKey} onChange={e => handleProjectKeyChange(m.id, e.target.value)} placeholder="ABC" maxLength={3} className={m.error ? 'border-destructive' : ''} />
                    </div>
                    {m.newKey && (m.isValid ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-destructive" />)}
                  </div>
                ))}
              </div>
              <Button className="mt-4 bg-brand-gold hover:bg-brand-gold-hover" onClick={() => { setMigrationType('projects'); setShowConfirmDialog(true); }} disabled={projectsToMigrate.length === 0}>
                Migrate {projectsToMigrate.length} Project Keys
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Confirm Migration</DialogTitle>
            <DialogDescription>This will update {migrationType === 'programs' ? programsToMigrate.length : projectsToMigrate.length} keys. Type MIGRATE KEYS to confirm.</DialogDescription>
          </DialogHeader>
          <Input value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} placeholder="Type MIGRATE KEYS" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onClick={handleRunMigration} disabled={confirmText !== 'MIGRATE KEYS'} className="bg-brand-gold hover:bg-brand-gold-hover">Run Migration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
