import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImportOptions } from '@/services/importService';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImportStep4OptionsProps {
  options: ImportOptions;
  onOptionsChange: (options: ImportOptions) => void;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
}

export function ImportStep4Options({
  options,
  onOptionsChange,
  onBack,
  onNext,
  onCancel,
}: ImportStep4OptionsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Folder Assignment</Label>
        <Select
          value={options.folderId || 'none'}
          onValueChange={(v) =>
            onOptionsChange({ ...options, folderId: v === 'none' ? null : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not Assigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Duplicate Handling</Label>
        <RadioGroup
          value={options.duplicateHandling}
          onValueChange={(v: any) =>
            onOptionsChange({ ...options, duplicateHandling: v })
          }
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="skip" id="skip" />
            <Label htmlFor="skip" className="font-normal">
              Skip duplicates
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="overwrite" id="overwrite" />
            <Label htmlFor="overwrite" className="font-normal">
              Overwrite existing
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="version" id="version" />
            <Label htmlFor="version" className="font-normal">
              Create new version
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label>Additional Options</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="onlyUpdateEmpty"
              checked={options.onlyUpdateEmpty}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, onlyUpdateEmpty: checked as boolean })
              }
            />
            <Label htmlFor="onlyUpdateEmpty" className="font-normal text-sm">
              Only update empty fields
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createActivityLog"
              checked={options.createActivityLog}
              onCheckedChange={(checked) =>
                onOptionsChange({ ...options, createActivityLog: checked as boolean })
              }
            />
            <Label htmlFor="createActivityLog" className="font-normal text-sm">
              Create activity log entries
            </Label>
          </div>
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
            className="bg-[#c69c6d] text-[#1a1a1a] hover:bg-[#b8905f]"
          >
            Import
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
