/**
 * Run Setup Section - Create new mock data run
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, FileText, FileSpreadsheet, Code, Sparkles, Loader2, Sheet } from 'lucide-react';
import { CreateRunData } from '@/hooks/useMockDataRuns';

interface RunSetupSectionProps {
  onCreateRun: (data: CreateRunData) => Promise<void>;
  isLoading: boolean;
}

const SOURCE_TYPES = [
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Upload PDF document' },
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Upload CSV file' },
  { value: 'excel', label: 'Excel', icon: Sheet, description: 'Upload Excel file' },
  { value: 'markdown', label: 'Markdown', icon: Code, description: 'Upload Markdown file' },
  { value: 'text', label: 'Plain Text', icon: FileText, description: 'Upload text file' },
  { value: 'synthetic', label: 'No Source', icon: Sparkles, description: 'Generate synthetic data' },
];

export function RunSetupSection({ onCreateRun, isLoading }: RunSetupSectionProps) {
  const [sourceType, setSourceType] = useState('synthetic');
  const [seed, setSeed] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const getAcceptedFileTypes = () => {
    switch (sourceType) {
      case 'pdf': return '.pdf';
      case 'csv': return '.csv';
      case 'excel': return '.xlsx,.xls';
      case 'markdown': return '.md,.markdown';
      case 'text': return '.txt';
      default: return '*';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateRun({
      sourceType,
      sourceName: file?.name,
      seed: seed || undefined,
      notes: notes || undefined,
      file: file || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Create Run
            </CardTitle>
            <CardDescription>
              Configure a new mock data generation run
            </CardDescription>
          </div>

          {/* Always-visible submit button (some screens hide the bottom CTA) */}
          <Button
            type="submit"
            form="create-run-form"
            disabled={isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Run'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form id="create-run-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Source Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Source Type</Label>
            <RadioGroup
              value={sourceType}
              onValueChange={setSourceType}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
            >
              {SOURCE_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer
                    transition-all duration-200
                    ${sourceType === type.value 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  <RadioGroupItem value={type.value} className="sr-only" />
                  <type.icon className={`h-6 w-6 ${sourceType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${sourceType === type.value ? 'text-primary' : 'text-foreground'}`}>
                    {type.label}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    {type.description}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* File Upload - Only shown if source type is not synthetic */}
          {sourceType !== 'synthetic' && (
            <div className="space-y-2">
              <Label htmlFor="file">Upload File</Label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    file 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <>
                        <FileSpreadsheet className="w-8 h-8 mb-2 text-primary" />
                        <p className="mb-1 text-sm font-medium text-primary">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click to change file
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="mb-1 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sourceType.toUpperCase()} files only
                        </p>
                      </>
                    )}
                  </div>
                  <input 
                    id="file" 
                    type="file" 
                    className="hidden" 
                    accept={getAcceptedFileTypes()}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Seed */}
          <div className="space-y-2">
            <Label htmlFor="seed">Seed (Optional)</Label>
            <Input
              id="seed"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Enter seed for deterministic generation"
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              Use the same seed to reproduce identical data sets
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this run..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Run'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
