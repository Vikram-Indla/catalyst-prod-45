import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface EpicImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportedEpic {
  name: string;
  epic_key?: string;
  state?: string;
  health?: string;
  owner_name?: string;
  estimate?: number;
}

export function EpicImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: EpicImportDialogProps) {
  const queryClient = useQueryClient();
  const [parsedData, setParsedData] = useState<ImportedEpic[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setParseError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const epics: ImportedEpic[] = results.data.map((row: any) => ({
          name: row.Name || row.name || row.Title || row.title || '',
          epic_key: row['Epic Key'] || row.epic_key || row.Key || row.key || '',
          state: row.State || row.state || row.Status || row.status || 'not_started',
          health: row.Health || row.health || 'green',
          owner_name: row.Owner || row.owner || row['Owner Name'] || row.owner_name || '',
          estimate: Number(row.Estimate || row.estimate || row.Points || row.points) || 0,
        })).filter((epic: ImportedEpic) => epic.name);

        if (epics.length === 0) {
          setParseError('No valid epics found in file. Ensure your CSV has a "Name" column.');
          return;
        }

        setParsedData(epics);
      },
      error: (error) => {
        setParseError(`Failed to parse file: ${error.message}`);
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      // Get the highest current rank
      const { data: maxRankData } = await supabase
        .from('epics')
        .select('global_rank')
        .order('global_rank', { ascending: false })
        .limit(1);

      let currentRank = (maxRankData?.[0]?.global_rank || 0) + 1;

      const epicsToInsert = parsedData.map(epic => ({
        name: epic.name,
        epic_key: epic.epic_key || null,
        state: 'not_started' as const,
        health: 'green' as const,
        owner_name: epic.owner_name || null,
        estimate: epic.estimate || null,
        global_rank: currentRank++,
        status: 'proposed' as const,
      }));

      const { error } = await supabase
        .from('epics')
        .insert(epicsToInsert);

      if (error) throw error;

      return epicsToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['epic-backlog'] });
      toast.success(`${count} epic(s) imported successfully`);
      onSuccess();
      onOpenChange(false);
      setParsedData([]);
      setFileName('');
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const handleClear = () => {
    setParsedData([]);
    setFileName('');
    setParseError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-gold" />
            Import Epics
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import epics. Required column: Name.
          </DialogDescription>
        </DialogHeader>

        {parsedData.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-brand-gold bg-brand-gold/5' : 'border-muted-foreground/30 hover:border-brand-gold/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-brand-gold">Drop the CSV file here...</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Drag & drop a CSV file here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported columns: Name, Epic Key, State, Health, Owner, Estimate
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-success/10 border-success/30">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>
                <span className="font-medium">{fileName}</span> parsed successfully.
                <br />
                <span className="text-sm">{parsedData.length} epic(s) ready to import.</span>
              </AlertDescription>
            </Alert>

            <div className="max-h-48 overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">State</th>
                    <th className="text-left p-2">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((epic, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{epic.name}</td>
                      <td className="p-2">{epic.state}</td>
                      <td className="p-2">{epic.health}</td>
                    </tr>
                  ))}
                  {parsedData.length > 10 && (
                    <tr className="border-t">
                      <td colSpan={3} className="p-2 text-center text-muted-foreground">
                        ... and {parsedData.length - 10} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear & Upload Different File
            </Button>
          </div>
        )}

        {parseError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={parsedData.length === 0 || importMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {importMutation.isPending ? 'Importing...' : `Import ${parsedData.length} Epic(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
