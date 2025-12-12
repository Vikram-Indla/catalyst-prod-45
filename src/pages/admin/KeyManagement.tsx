import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Check, X, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { generateUniqueKey, isThreeLetterKey } from '@/lib/programKeyUtils';

const KEY_REGEX = /^[A-Z]{3}$/;

interface KeyMapping {
  id: string;
  name: string;
  currentKey: string;
  newKey: string;
  isValid: boolean;
  error: string;
  status: 'suggested' | 'edited' | 'valid' | 'none';
}

export default function KeyManagement() {
  const queryClient = useQueryClient();
  const [programMappings, setProgramMappings] = useState<KeyMapping[]>([]);
  const [projectMappings, setProjectMappings] = useState<KeyMapping[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [migrationType, setMigrationType] = useState<'programs' | 'projects'>('programs');

  // Fetch programs
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['admin-program-keys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, key').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['admin-project-keys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name, key, program_id').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Generate suggestions for all programs using STYLE A
  const generateProgramSuggestions = useCallback(() => {
    if (!programs) return;
    
    // Collect all existing valid 3-letter keys
    const existingKeys = new Set<string>();
    programs.forEach(p => {
      if (isThreeLetterKey(p.key)) {
        existingKeys.add(p.key!);
      }
    });

    setProgramMappings(programs.map(p => {
      // If already has valid 3-letter key, mark as valid
      if (isThreeLetterKey(p.key)) {
        return {
          id: p.id,
          name: p.name,
          currentKey: p.key || '',
          newKey: p.key || '',
          isValid: true,
          error: '',
          status: 'valid' as const,
        };
      }

      // Generate suggestion using STYLE A
      const suggestedKey = generateUniqueKey(p.name, existingKeys);
      existingKeys.add(suggestedKey); // Reserve it for uniqueness

      return {
        id: p.id,
        name: p.name,
        currentKey: p.key || '',
        newKey: suggestedKey,
        isValid: true,
        error: '',
        status: 'suggested' as const,
      };
    }));
  }, [programs]);

  // Generate suggestions for all projects using STYLE A
  const generateProjectSuggestions = useCallback(() => {
    if (!projects) return;
    
    const existingKeys = new Set<string>();
    projects.forEach(p => {
      if (isThreeLetterKey(p.key)) {
        existingKeys.add(p.key!);
      }
    });

    setProjectMappings(projects.map(p => {
      if (isThreeLetterKey(p.key)) {
        return {
          id: p.id,
          name: p.name,
          currentKey: p.key || '',
          newKey: p.key || '',
          isValid: true,
          error: '',
          status: 'valid' as const,
        };
      }

      const suggestedKey = generateUniqueKey(p.name, existingKeys);
      existingKeys.add(suggestedKey);

      return {
        id: p.id,
        name: p.name,
        currentKey: p.key || '',
        newKey: suggestedKey,
        isValid: true,
        error: '',
        status: 'suggested' as const,
      };
    }));
  }, [projects]);

  // Auto-generate suggestions on data load
  React.useEffect(() => {
    if (programs && programMappings.length === 0) {
      generateProgramSuggestions();
    }
  }, [programs, programMappings.length, generateProgramSuggestions]);

  React.useEffect(() => {
    if (projects && projectMappings.length === 0) {
      generateProjectSuggestions();
    }
  }, [projects, projectMappings.length, generateProjectSuggestions]);

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
    const existingKeys = programs?.filter(p => p.id !== id && isThreeLetterKey(p.key)).map(p => p.key!) || [];
    setProgramMappings(prev => prev.map(m => {
      if (m.id !== id) return m;
      const error = validateKey(upperValue, prev, id, existingKeys);
      return { 
        ...m, 
        newKey: upperValue, 
        isValid: !error || !upperValue, 
        error,
        status: m.status === 'valid' ? 'valid' : 'edited' as const,
      };
    }));
  };

  const handleProjectKeyChange = (id: string, value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const existingKeys = projects?.filter(p => p.id !== id && isThreeLetterKey(p.key)).map(p => p.key!) || [];
    setProjectMappings(prev => prev.map(m => {
      if (m.id !== id) return m;
      const error = validateKey(upperValue, prev, id, existingKeys);
      return { 
        ...m, 
        newKey: upperValue, 
        isValid: !error || !upperValue, 
        error,
        status: m.status === 'valid' ? 'valid' : 'edited' as const,
      };
    }));
  };

  // Regenerate only non-edited suggestions
  const regenerateProgramSuggestions = () => {
    if (!programs) return;
    
    const existingKeys = new Set<string>();
    // First pass: collect all valid keys and edited keys
    programMappings.forEach(m => {
      if (m.status === 'valid' || m.status === 'edited') {
        if (isThreeLetterKey(m.newKey)) existingKeys.add(m.newKey);
      }
    });
    programs.forEach(p => {
      if (isThreeLetterKey(p.key)) existingKeys.add(p.key!);
    });

    setProgramMappings(prev => prev.map(m => {
      if (m.status === 'valid' || m.status === 'edited') return m;
      
      const suggestedKey = generateUniqueKey(m.name, existingKeys);
      existingKeys.add(suggestedKey);
      
      return { ...m, newKey: suggestedKey, isValid: true, error: '', status: 'suggested' as const };
    }));
    
    toast.success('Regenerated suggestions for unedited items');
  };

  const regenerateProjectSuggestions = () => {
    if (!projects) return;
    
    const existingKeys = new Set<string>();
    projectMappings.forEach(m => {
      if (m.status === 'valid' || m.status === 'edited') {
        if (isThreeLetterKey(m.newKey)) existingKeys.add(m.newKey);
      }
    });
    projects.forEach(p => {
      if (isThreeLetterKey(p.key)) existingKeys.add(p.key!);
    });

    setProjectMappings(prev => prev.map(m => {
      if (m.status === 'valid' || m.status === 'edited') return m;
      
      const suggestedKey = generateUniqueKey(m.name, existingKeys);
      existingKeys.add(suggestedKey);
      
      return { ...m, newKey: suggestedKey, isValid: true, error: '', status: 'suggested' as const };
    }));
    
    toast.success('Regenerated suggestions for unedited items');
  };

  const migrateProgramsMutation = useMutation({
    mutationFn: async () => {
      const toMigrate = programMappings.filter(m => m.newKey && m.newKey.length === 3 && m.isValid && m.status !== 'valid');
      for (const mapping of toMigrate) {
        if (mapping.currentKey) {
          await supabase.from('program_key_aliases').insert({
            program_id: mapping.id,
            old_key: mapping.currentKey,
          }).select();
        }
        const { error } = await supabase.from('programs').update({ key: mapping.newKey }).eq('id', mapping.id);
        if (error) throw error;
      }
      return toMigrate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-program-keys'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-programs'] });
      toast.success(`Migrated ${count} program keys successfully`);
      setShowConfirmDialog(false);
      setConfirmText('');
      setProgramMappings([]);
    },
    onError: (error) => toast.error('Migration failed: ' + error.message),
  });

  const migrateProjectsMutation = useMutation({
    mutationFn: async () => {
      const toMigrate = projectMappings.filter(m => m.newKey && m.newKey.length === 3 && m.isValid && m.status !== 'valid');
      for (const mapping of toMigrate) {
        if (mapping.currentKey) {
          await supabase.from('project_key_aliases').insert({
            project_id: mapping.id,
            old_key: mapping.currentKey,
          }).select();
        }
        const { error } = await supabase.from('projects').update({ key: mapping.newKey }).eq('id', mapping.id);
        if (error) throw error;
      }
      return toMigrate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-project-keys'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-projects'] });
      toast.success(`Migrated ${count} project keys successfully`);
      setShowConfirmDialog(false);
      setConfirmText('');
      setProjectMappings([]);
    },
    onError: (error) => toast.error('Migration failed: ' + error.message),
  });

  const handleRunMigration = () => {
    if (confirmText !== 'MIGRATE KEYS') return;
    if (migrationType === 'programs') migrateProgramsMutation.mutate();
    else migrateProjectsMutation.mutate();
  };

  const programsToMigrate = programMappings.filter(m => m.newKey && m.newKey.length === 3 && m.isValid && m.status !== 'valid');
  const projectsToMigrate = projectMappings.filter(m => m.newKey && m.newKey.length === 3 && m.isValid && m.status !== 'valid');
  const programsAlreadyValid = programMappings.filter(m => m.status === 'valid').length;
  const projectsAlreadyValid = projectMappings.filter(m => m.status === 'valid').length;

  const getStatusBadge = (status: KeyMapping['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Already valid</Badge>;
      case 'suggested':
        return <Badge variant="outline" className="bg-brand-gold/10 text-brand-gold border-brand-gold/30"><Sparkles className="h-3 w-3 mr-1" />Suggested</Badge>;
      case 'edited':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Edited</Badge>;
      default:
        return null;
    }
  };

  if (programsLoading || projectsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Key Management</h1>
        <p className="text-muted-foreground">Migrate program and project keys to 3-letter format (A-Z only)</p>
      </div>

      <Tabs defaultValue="programs">
        <TabsList>
          <TabsTrigger value="programs">Program Keys</TabsTrigger>
          <TabsTrigger value="projects">Project Keys</TabsTrigger>
        </TabsList>
        
        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Program Keys</CardTitle>
                  <CardDescription>
                    {programsAlreadyValid} already valid · {programsToMigrate.length} to migrate
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={regenerateProgramSuggestions}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate suggestions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {programMappings.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.name}</p>
                    </div>
                    {getStatusBadge(m.status)}
                    <Badge variant="outline" className="font-mono">{m.currentKey || '—'}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <div className="w-24">
                      <Input 
                        value={m.newKey} 
                        onChange={e => handleProgramKeyChange(m.id, e.target.value)} 
                        placeholder="ABC" 
                        maxLength={3} 
                        className={`font-mono uppercase ${m.error ? 'border-destructive' : m.status === 'valid' ? 'bg-muted' : ''}`}
                        disabled={m.status === 'valid'}
                      />
                    </div>
                    {m.newKey && m.status !== 'valid' && (
                      m.isValid ? <Check className="h-4 w-4 text-green-500 flex-shrink-0" /> : <X className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    {m.error && <span className="text-xs text-destructive">{m.error}</span>}
                  </div>
                ))}
              </div>
              <Button 
                className="mt-4 bg-brand-gold hover:bg-brand-gold-hover" 
                onClick={() => { setMigrationType('programs'); setShowConfirmDialog(true); }} 
                disabled={programsToMigrate.length === 0}
              >
                Migrate {programsToMigrate.length} Program Keys
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Keys</CardTitle>
                  <CardDescription>
                    {projectsAlreadyValid} already valid · {projectsToMigrate.length} to migrate
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={regenerateProjectSuggestions}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate suggestions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectMappings.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.name}</p>
                    </div>
                    {getStatusBadge(m.status)}
                    <Badge variant="outline" className="font-mono">{m.currentKey || '—'}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <div className="w-24">
                      <Input 
                        value={m.newKey} 
                        onChange={e => handleProjectKeyChange(m.id, e.target.value)} 
                        placeholder="ABC" 
                        maxLength={3} 
                        className={`font-mono uppercase ${m.error ? 'border-destructive' : m.status === 'valid' ? 'bg-muted' : ''}`}
                        disabled={m.status === 'valid'}
                      />
                    </div>
                    {m.newKey && m.status !== 'valid' && (
                      m.isValid ? <Check className="h-4 w-4 text-green-500 flex-shrink-0" /> : <X className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    {m.error && <span className="text-xs text-destructive">{m.error}</span>}
                  </div>
                ))}
              </div>
              <Button 
                className="mt-4 bg-brand-gold hover:bg-brand-gold-hover" 
                onClick={() => { setMigrationType('projects'); setShowConfirmDialog(true); }} 
                disabled={projectsToMigrate.length === 0}
              >
                Migrate {projectsToMigrate.length} Project Keys
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Migration
            </DialogTitle>
            <DialogDescription>
              This will update {migrationType === 'programs' ? programsToMigrate.length : projectsToMigrate.length} keys. 
              Old keys will be saved as aliases for backward compatibility. Type MIGRATE KEYS to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input 
            value={confirmText} 
            onChange={e => setConfirmText(e.target.value.toUpperCase())} 
            placeholder="Type MIGRATE KEYS" 
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleRunMigration} 
              disabled={confirmText !== 'MIGRATE KEYS'} 
              className="bg-brand-gold hover:bg-brand-gold-hover"
            >
              Run Migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
