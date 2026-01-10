import React from 'react';
import { X, FileText, Shield, Languages } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const handleSave = () => {
    onClose();
    toast.success('Settings saved');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Context Settings</DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-4">
            Configure templates, compliance rules, and translation settings for this generation.
          </p>
          
          <div className="space-y-3">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Templates</h4>
              </div>
              <p className="text-[13px] text-muted-foreground">4 templates active</p>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Compliance</h4>
              </div>
              <p className="text-[13px] text-muted-foreground">DGA + NCA rules enabled</p>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Languages className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Translation</h4>
              </div>
              <p className="text-[13px] text-muted-foreground">Arabic auto-detect enabled</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2.5 mt-5 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
