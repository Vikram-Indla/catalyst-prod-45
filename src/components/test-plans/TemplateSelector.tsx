import { useState } from 'react';
import { FileText, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTemplates } from '@/hooks/useTestPlansG26';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: any) => void;
}

export function TemplateSelector({ open, onClose, onSelect }: TemplateSelectorProps) {
  const { data: templates, isLoading } = useTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleUse = () => {
    const template = templates?.find((t) => t.id === selectedId);
    if (template) {
      onSelect(template);
      onClose();
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setSelectedId(null); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Select Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !templates?.length ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-medium">No templates available yet.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Save a test plan as a template first.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:border-primary/50',
                    selectedId === template.id && 'border-primary ring-1 ring-primary/20'
                  )}
                  onClick={() => setSelectedId(template.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{template.template_name || template.name}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{template.description}</p>
                      )}
                    </div>
                    {selectedId === template.id && (
                      <Check className="h-5 w-5 text-primary shrink-0 ml-3" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { onClose(); setSelectedId(null); }}>Cancel</Button>
            <Button onClick={handleUse} disabled={!selectedId}>Use Template</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
