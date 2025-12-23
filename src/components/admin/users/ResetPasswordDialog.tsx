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
import { Copy, Check, Loader2, KeyRound, Eye, EyeOff, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ResetPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string | null;
}

type DialogStep = 'options' | 'link-success' | 'password-success';

export function ResetPasswordDialog({ isOpen, onClose, userId, userName }: ResetPasswordDialogProps) {
  const [step, setStep] = useState<DialogStep>('options');
  const [isLoading, setIsLoading] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'password'>('password');

  const handleClose = () => {
    setStep('options');
    setResetLink('');
    setCopied(false);
    setNewPassword('');
    setShowPassword(false);
    setActiveTab('password');
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
      setStep('link-success');
      toast.success(`Password reset link created for ${userName || 'user'}`);
    } catch (error) {
      console.error('Error generating reset link:', error);
      toast.error((error as Error).message || 'Unable to generate password reset link. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!userId || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-set-password', {
        body: { userId, newPassword },
      });

      if (error) {
        throw new Error(error.message || 'Failed to set password');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setStep('password-success');
      toast.success(`Default password set for ${userName || 'user'}. They will be required to change it on next login.`);
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error((error as Error).message || 'Unable to set password. Please try again later.');
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

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy password');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {step === 'options' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-brand-primary" />
                Reset password for {userName || 'user'}
              </DialogTitle>
              <DialogDescription>
                Choose how you want to reset the user's password.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'link' | 'password')} className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password" className="text-xs">Set Default Password</TabsTrigger>
                <TabsTrigger value="link" className="text-xs">Generate Reset Link</TabsTrigger>
              </TabsList>
              
              <TabsContent value="password" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Default Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter a default password..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The user will be required to change this password on their next login.
                  </p>
                </div>
                <DialogFooter className="sm:justify-end gap-2">
                  <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleSetPassword} disabled={isLoading || !newPassword || newPassword.length < 6}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting...
                      </>
                    ) : (
                      'Set Password'
                    )}
                  </Button>
                </DialogFooter>
              </TabsContent>
              
              <TabsContent value="link" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Generate a one-time reset link that the user can use to set their own password. 
                  The link expires in 24 hours.
                </p>
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
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Generate Reset Link
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </>
        )}

        {step === 'link-success' && (
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

        {step === 'password-success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Default password set
              </DialogTitle>
              <DialogDescription>
                The user's password has been set. They will be required to change it when they next log in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Password set to:</Label>
                <div className="flex gap-2">
                  <Input
                    value={newPassword}
                    readOnly
                    type={showPassword ? 'text' : 'password'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="shrink-0"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPassword}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this password with the user securely. They will be prompted to set a new password on their first login.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCopyPassword}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Password
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
