import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ImportEpicsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportEpicsDialog({ open, onOpenChange }: ImportEpicsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const lines = csvData.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const epicsToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const epic: any = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            epic[header.toLowerCase().replace(/ /g, '_')] = values[index];
          }
        });
        if (epic.name) {
          epicsToImport.push({
            name: epic.name,
            description: epic.description || null,
            epic_key: epic.epic_key || null,
            state: epic.state || 'funnel',
            health: epic.health || 'green'
          });
        }
      }

      const { data, error } = await supabase
        .from('epics')
        .insert(epicsToImport)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success(`Imported ${data.length} epics successfully`);
      onOpenChange(false);
      setFile(null);
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      importMutation.mutate(text);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Epics</DialogTitle>
          <DialogDescription>
            Upload a CSV file with epic data (Name, Description, Epic Key, State, Health)
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="csv-file">CSV File</Label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          {file && (
            <div className="mt-2 text-sm text-muted-foreground">
              Selected: {file.name}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || importMutation.isPending}>
            {importMutation.isPending ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
