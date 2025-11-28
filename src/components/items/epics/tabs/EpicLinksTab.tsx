import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ExternalLink, Trash2 } from 'lucide-react';

interface EpicLinksTabProps {
  epic: any;
}

export function EpicLinksTab({ epic }: EpicLinksTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          External links for design, approvals, compliance, and documentation
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Link Type</Label>
            <Select>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="approval">Approval</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="documentation">Documentation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>URL</Label>
            <Input
              type="url"
              placeholder="https://"
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Input
            type="text"
            placeholder="Brief description of this link"
            className="mt-2"
          />
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        <div className="p-4 text-center text-sm text-muted-foreground">
          No external links added yet
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Add external links to reference designs, approvals, compliance docs, and other resources
      </div>
    </div>
  );
}
