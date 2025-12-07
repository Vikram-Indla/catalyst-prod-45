import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ImportModuleConfig } from '@/lib/import/importModuleConfig';

interface ImportStepSettingsProps {
  moduleConfig: ImportModuleConfig;
  encoding: string;
  delimiter: string;
  dateFormat: string;
  targetProject: string;
  onEncodingChange: (value: string) => void;
  onDelimiterChange: (value: string) => void;
  onDateFormatChange: (value: string) => void;
  onTargetProjectChange: (value: string) => void;
  projects: Array<{ id: string; name: string }>;
}

const encodingOptions = [
  { value: 'UTF-8', label: 'UTF-8' },
  { value: 'ISO-8859-1', label: 'ISO-8859-1 (Latin-1)' },
  { value: 'Windows-1252', label: 'Windows-1252' },
];

const dateFormatOptions = [
  { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy (e.g., 31/12/2024)' },
  { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd (e.g., 2024-12-31)' },
  { value: 'MM/dd/yyyy', label: 'MM/dd/yyyy (e.g., 12/31/2024)' },
  { value: 'dd-MMM-yyyy', label: 'dd-MMM-yyyy (e.g., 31-Dec-2024)' },
  { value: 'dd/MMM/yy h:mm a', label: 'dd/MMM/yy h:mm a (e.g., 31/Dec/24 2:30 PM)' },
];

export function ImportStepSettings({
  moduleConfig,
  encoding,
  delimiter,
  dateFormat,
  targetProject,
  onEncodingChange,
  onDelimiterChange,
  onDateFormatChange,
  onTargetProjectChange,
  projects,
}: ImportStepSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure import settings for your {moduleConfig.label} data.
        </p>
      </div>
      
      <div className="border-t pt-6 space-y-6">
        {/* Target Project - only for certain modules */}
        {moduleConfig.requiresProject && projects.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="target-project">
              Import to Project <span className="text-destructive">*</span>
            </Label>
            <Select value={targetProject} onValueChange={onTargetProjectChange}>
              <SelectTrigger id="target-project" className="w-80">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* File Encoding */}
        <div className="space-y-2">
          <Label htmlFor="encoding">File encoding</Label>
          <Select value={encoding} onValueChange={onEncodingChange}>
            <SelectTrigger id="encoding" className="w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {encodingOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Delimiter */}
        <div className="space-y-2">
          <Label htmlFor="delimiter">
            Delimiter <span className="text-destructive">*</span>
          </Label>
          <Input
            id="delimiter"
            value={delimiter}
            onChange={(e) => onDelimiterChange(e.target.value)}
            className="w-80"
            placeholder=","
          />
          <p className="text-xs text-muted-foreground">
            Please use \t to have a Tabulator character
          </p>
        </div>
        
        {/* Date Format */}
        <div className="space-y-2">
          <Label htmlFor="date-format">
            Date format <span className="text-destructive">*</span>
          </Label>
          <Select value={dateFormat} onValueChange={onDateFormatChange}>
            <SelectTrigger id="date-format" className="w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFormatOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Please specify the format that dates are stored in the file.
          </p>
        </div>
      </div>
    </div>
  );
}
