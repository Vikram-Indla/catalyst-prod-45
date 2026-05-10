import AdsSelect from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
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
            <label htmlFor="target-project-select" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
              Import to Project <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
            </label>
            <div style={{ maxWidth: '320px' }}>
              <AdsSelect
                inputId="target-project-select"
                value={targetProject ? { label: projects.find(p => p.id === targetProject)?.name || targetProject, value: targetProject } : null}
                options={projects.map((project) => ({ label: project.name, value: project.id }))}
                placeholder="Select project..."
                onChange={(opt) => onTargetProjectChange(opt?.value ?? '')}
              />
            </div>
          </div>
        )}

        {/* File Encoding */}
        <div className="space-y-2">
          <label htmlFor="encoding-select" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>File encoding</label>
          <div style={{ maxWidth: '320px' }}>
            <AdsSelect
              inputId="encoding-select"
              value={{ label: encodingOptions.find(o => o.value === encoding)?.label || encoding, value: encoding }}
              options={encodingOptions}
              onChange={(opt) => onEncodingChange(opt?.value ?? 'UTF-8')}
            />
          </div>
        </div>

        {/* Delimiter */}
        <div className="space-y-2">
          <label htmlFor="delimiter" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
            Delimiter <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
          </label>
          <div style={{ maxWidth: '320px' }}>
            <Textfield
              id="delimiter"
              value={delimiter}
              onChange={(e) => onDelimiterChange((e.target as HTMLInputElement).value)}
              placeholder=","
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Please use \t to have a Tabulator character
          </p>
        </div>

        {/* Date Format */}
        <div className="space-y-2">
          <label htmlFor="date-format-select" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
            Date format <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>*</span>
          </label>
          <div style={{ maxWidth: '320px' }}>
            <AdsSelect
              inputId="date-format-select"
              value={{ label: dateFormatOptions.find(o => o.value === dateFormat)?.label || dateFormat, value: dateFormat }}
              options={dateFormatOptions}
              onChange={(opt) => onDateFormatChange(opt?.value ?? 'dd/MM/yyyy')}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Please specify the format that dates are stored in the file.
          </p>
        </div>
      </div>
    </div>
  );
}
