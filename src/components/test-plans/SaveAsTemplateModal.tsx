import { useState } from 'react';
import { Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSaveAsTemplate } from '@/hooks/useTestPlansG26';

interface Props { open: boolean; onClose: () => void; planId: string; planName: string; }

export function SaveAsTemplateModal({ open, onClose, planId, planName }: Props) {
  const [templateName, setTemplateName] = useState(planName + ' Template');
  const saveAsTemplate = useSaveAsTemplate();

  const handleSave = async () => {
    await saveAsTemplate.mutateAsync({ planId, templateName });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Save as Template</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Template Name</Label><Input value={templateName} onChange={e => setTemplateName(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!templateName.trim()}><Save className="h-4 w-4 mr-2" />Save Template</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
