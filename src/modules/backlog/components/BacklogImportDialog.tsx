import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BacklogImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: string;
}

export function BacklogImportDialog({
  open,
  onOpenChange,
  itemType,
}: BacklogImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (csvFile: File) => {
      const text = await csvFile.text();
      const rows = text.split('\n').slice(1); // Skip header
      
      const tableName = itemType === 'epic' ? 'epics' : itemType === 'feature' ? 'features' : 'capabilities';
      const items = rows
        .filter(row => row.trim())
        .map(row => {
          const [, name, state, , , points] = row.split(',');
          const itemData: any = {
            name: name?.replace(/"/g, '').trim(),
            points: points ? parseInt(points) : null,
          };
          
          if (state?.replace(/"/g, '').trim()) {
            itemData.state = state.replace(/"/g, '').trim();
          }
          
          return itemData;
        })
        .filter(item => item.name);

      const { error } = await supabase
        .from(tableName)
        .insert(items);

      if (error) throw error;
      return items.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success(`Successfully imported ${count} ${itemType}(s)`);
      onOpenChange(false);
      setFile(null);
    },
    onError: (error: any) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import {itemType}s from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: ID, Name, State, Owner, Points, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={importMutation.isPending}
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-2">CSV Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>First row must contain column headers</li>
              <li>Required: Name column</li>
              <li>Optional: State, Owner, Points, Description</li>
              <li>Example: "ID,Name,State,Owner,Points"</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || importMutation.isPending}>
            {importMutation.isPending ? (
              <>Importing...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
