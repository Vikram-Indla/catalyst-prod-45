import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResetPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string | null;
}

type DialogStep = 'confirm' | 'success';

export function ResetPasswordDialog({ isOpen, onClose, userId, userName }: ResetPasswordDialogProps) {
  const [step, setStep] = useState<DialogStep>('confirm');
  const [isLoading, setIsLoading] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setStep('confirm');
    setResetLink('');
    setCopied(false);
    onClose();
  };

  const handleGenerateLink = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate reset link');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResetLink(data.resetLink);
      setStep('success');
      toast.success(`Password reset link created for ${userName || 'user'}`);
    } catch (error) {
      console.error('Error generating reset link:', error);
      toast.error((error as Error).message || 'Unable to generate password reset link. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-brand-gold" />
                Reset password for {userName || 'user'}?
              </DialogTitle>
              <DialogDescription>
                This will generate a one-time reset link so the user can set a new password. 
                The link will expire after 24 hours.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleGenerateLink} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Reset Link'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Password reset link created
              </DialogTitle>
              <DialogDescription>
                Share this link with the user. They can use it once to set a new password. 
                The link expires in 24 hours.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reset-link">Reset Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="reset-link"
                    value={resetLink}
                    readOnly
                    className="flex-1 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCopyLink}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
