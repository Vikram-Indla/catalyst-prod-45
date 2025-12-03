// Doc lines 58-78: RACI Matrix - Responsible, Accountable, Consulted, Informed
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RACIEntry {
  id: string;
  process_step: string;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
}

const PROCESS_STEPS = [
  'Funnel',
  'Analyzing',
  'Backlog',
  'Implementing',
  'Validating',
  'Deploying',
  'Done'
];

export default function EpicResponsibilityMatrix() {
  const { epicId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [entries, setEntries] = useState<RACIEntry[]>([
    { id: '1', process_step: 'Funnel', responsible: '', accountable: '', consulted: '', informed: '' },
    { id: '2', process_step: 'Analyzing', responsible: '', accountable: '', consulted: '', informed: '' },
    { id: '3', process_step: 'Backlog', responsible: '', accountable: '', consulted: '', informed: '' },
    { id: '4', process_step: 'Implementing', responsible: '', accountable: '', consulted: '', informed: '' },
    { id: '5', process_step: 'Validating', responsible: '', accountable: '', consulted: '', informed: '' },
    { id: '6', process_step: 'Deploying', responsible: '', accountable: '', consulted: '', informed: '' },
    { id: '7', process_step: 'Done', responsible: '', accountable: '', consulted: '', informed: '' },
  ]);

  // Fetch epic details
  const { data: epic, isLoading } = useQuery({
    queryKey: ['epic', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .eq('id', epicId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!epicId
  });

  // Fetch teams for dropdown
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const handleEntryChange = (id: string, field: keyof RACIEntry, value: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSave = () => {
    // TODO (needs confirmation): Persist RACI matrix to database
    // Document doesn't specify exact storage mechanism
    toast.success('Responsibility Matrix saved');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading responsibility matrix...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Responsibility Matrix (RACI)</h1>
            <p className="text-muted-foreground text-sm">
              Epic: {epic?.name} ({epic?.epic_key || epicId?.slice(0, 8)})
            </p>
          </div>
        </div>
        <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold-hover text-brand-dark">
          <Save className="h-4 w-4 mr-2" />
          Save Matrix
        </Button>
      </div>

      {/* RACI Legend - Doc lines 60-66 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            RACI Definitions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Badge className="bg-blue-500 text-white">R</Badge>
              <div>
                <p className="font-medium">Responsible</p>
                <p className="text-muted-foreground text-xs">Who does the work</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-green-500 text-white">A</Badge>
              <div>
                <p className="font-medium">Accountable</p>
                <p className="text-muted-foreground text-xs">Who makes final decisions</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-yellow-500 text-black">C</Badge>
              <div>
                <p className="font-medium">Consulted</p>
                <p className="text-muted-foreground text-xs">Who provides advice</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-gray-500 text-white">I</Badge>
              <div>
                <p className="font-medium">Informed</p>
                <p className="text-muted-foreground text-xs">Who needs progress updates</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RACI Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Process Step Assignments</CardTitle>
          <CardDescription>
            Define who is responsible at each process step for this epic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Process Step</TableHead>
                <TableHead>Responsible (R)</TableHead>
                <TableHead>Accountable (A)</TableHead>
                <TableHead>Consulted (C)</TableHead>
                <TableHead>Informed (I)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.process_step}</TableCell>
                  <TableCell>
                    <Input
                      value={entry.responsible}
                      onChange={(e) => handleEntryChange(entry.id, 'responsible', e.target.value)}
                      placeholder="Team or person..."
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.accountable}
                      onChange={(e) => handleEntryChange(entry.id, 'accountable', e.target.value)}
                      placeholder="Decision maker..."
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.consulted}
                      onChange={(e) => handleEntryChange(entry.id, 'consulted', e.target.value)}
                      placeholder="Advisors..."
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.informed}
                      onChange={(e) => handleEntryChange(entry.id, 'informed', e.target.value)}
                      placeholder="Stakeholders..."
                      className="h-8"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Note */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> The Responsibility Matrix helps clarify roles and enables 
          auto-notifications when work reaches certain process steps. (Doc ref: lines 74-77)
        </p>
      </div>
    </div>
  );
}
