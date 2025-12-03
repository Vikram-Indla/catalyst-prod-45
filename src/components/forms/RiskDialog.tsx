import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface RiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk?: any;
  defaultProgramId?: string;
  defaultPiId?: string;
}

export function RiskDialog({ open, onOpenChange, risk, defaultProgramId, defaultPiId }: RiskDialogProps) {
  const [title, setTitle] = useState(risk?.title || '');
  const [description, setDescription] = useState(risk?.description || '');
  const [status, setStatus] = useState(risk?.status || 'Open');
  const [resolutionMethod, setResolutionMethod] = useState(risk?.resolution_method || 'Owned');
  const [programId, setProgramId] = useState(risk?.program_id || defaultProgramId || '');
  const [piId, setPiId] = useState(risk?.program_increment_id || defaultPiId || '');
  const [impact, setImpact] = useState(risk?.impact || 'Medium');
  const [occurrence, setOccurrence] = useState(risk?.occurrence || 'Medium');
  const [relationship, setRelationship] = useState(risk?.relationship || 'Program');

  const queryClient = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: pis } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('program_increments').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (risk) {
        const { error } = await supabase
          .from('risks')
          .update(data)
          .eq('id', risk.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('risks')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['epic-linked-risks'] });
      toast.success(risk ? 'Risk updated' : 'Risk created');
      onOpenChange(false);
      // Reset form
      setTitle('');
      setDescription('');
      setStatus('Open');
      setResolutionMethod('Owned');
      setImpact('Medium');
      setOccurrence('Medium');
    },
    onError: (error: any) => {
      console.error('Risk save error:', error);
      toast.error('Failed to save risk');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a risk title');
      return;
    }
    if (!programId) {
      toast.error('Please select a program');
      return;
    }
    if (!piId) {
      toast.error('Please select a PI');
      return;
    }
    
    // Get a placeholder owner_id and created_by (in real app, use auth user)
    const placeholderId = '00000000-0000-0000-0000-000000000000';
    
    mutation.mutate({
      title: title.trim(),
      description: description.trim() || title.trim(),
      status,
      resolution_method: resolutionMethod,
      program_id: programId,
      program_increment_id: piId,
      impact,
      occurrence,
      relationship,
      owner_id: risk?.owner_id || placeholderId,
      created_by: risk?.created_by || placeholderId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{risk ? 'Edit Risk' : 'Create Risk'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Name *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="program">Program *</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pi">PI *</Label>
              <Select value={piId} onValueChange={setPiId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PI" />
                </SelectTrigger>
                <SelectContent>
                  {pis?.map((pi) => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">ROAM Status</Label>
              <Select value={resolutionMethod} onValueChange={setResolutionMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Owned">Owned</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Mitigated">Mitigated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="impact">Impact (1-5)</Label>
              <Select value={impact} onValueChange={setImpact}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Very Low">1 - Very Low</SelectItem>
                  <SelectItem value="Low">2 - Low</SelectItem>
                  <SelectItem value="Medium">3 - Medium</SelectItem>
                  <SelectItem value="High">4 - High</SelectItem>
                  <SelectItem value="Very High">5 - Very High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="occurrence">Probability (1-5)</Label>
              <Select value={occurrence} onValueChange={setOccurrence}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Very Low">1 - Very Low</SelectItem>
                  <SelectItem value="Low">2 - Low</SelectItem>
                  <SelectItem value="Medium">3 - Medium</SelectItem>
                  <SelectItem value="High">4 - High</SelectItem>
                  <SelectItem value="Very High">5 - Very High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
