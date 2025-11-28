import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface EpicDesignTabProps {
  epic: any;
}

export function EpicDesignTab({ epic }: EpicDesignTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Design Notes</Label>
        <Textarea
          rows={6}
          placeholder="Enter design notes and specifications"
          className="mt-2"
        />
      </div>

      <div>
        <Label>Design Attachments</Label>
        <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop design files or click to upload
          </p>
          <Button variant="outline">Choose Files</Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Supported formats: PDF, PNG, JPG, SVG, Figma links
      </div>
    </div>
  );
}
