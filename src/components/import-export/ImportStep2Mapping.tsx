import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImportPreview, ColumnMapping, autoDetectMapping } from '@/services/importService';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImportStep2MappingProps {
  preview: ImportPreview;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
}

const SYSTEM_FIELDS = [
  { value: '', label: '(Ignore)' },
  { value: 'title', label: 'Title *' },
  { value: 'objective', label: 'Objective' },
  { value: 'preconditions', label: 'Preconditions' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'type', label: 'Type' },
  { value: 'estimated_effort', label: 'Estimated Effort' },
  { value: 'component', label: 'Component' },
  { value: 'release', label: 'Release' },
  { value: 'labels', label: 'Labels' },
];

export function ImportStep2Mapping({
  preview,
  mapping,
  onMappingChange,
  onBack,
  onNext,
  onCancel,
}: ImportStep2MappingProps) {
  useEffect(() => {
    // Auto-detect mapping on mount
    if (Object.keys(mapping).length === 0) {
      const detected = autoDetectMapping(preview.headers);
      onMappingChange(detected);
    }
  }, []);

  const handleMappingChange = (fileColumn: string, systemField: string) => {
    const newMapping = { ...mapping };
    if (systemField === '') {
      delete newMapping[fileColumn];
    } else {
      newMapping[fileColumn] = systemField;
    }
    onMappingChange(newMapping);
  };

  const mappedCount = Object.keys(mapping).length;
  const hasTitleMapping = Object.values(mapping).includes('title');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">Map File Columns to System Fields</h3>
        <div className="space-y-3">
          {preview.headers.map((header) => (
            <div key={header} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-normal truncate block">
                  {header}
                </Label>
              </div>
              <div className="flex-shrink-0">→</div>
              <div className="flex-1">
                <Select
                  value={mapping[header] || ''}
                  onValueChange={(value) => handleMappingChange(header, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEM_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-muted p-4 space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className={hasTitleMapping ? 'text-green-600' : 'text-orange-600'}>
            {hasTitleMapping ? '✓' : '⚠'}
          </span>
          <span>
            {hasTitleMapping
              ? 'Title field mapped (required)'
              : 'Title field must be mapped to continue'}
          </span>
        </div>
        <div>
          Auto-detected {mappedCount} of {preview.headers.length} columns
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onNext}
            disabled={!hasTitleMapping}
            className="bg-[#c69c6d] text-[#1a1a1a] hover:bg-[#b8905f]"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
