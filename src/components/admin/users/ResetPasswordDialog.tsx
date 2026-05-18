import { useState } from 'react';
import Spinner from '@atlaskit/spinner';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CopyIcon from '@atlaskit/icon/core/copy';
import EyeOpenIcon from '@atlaskit/icon/core/eye-open';
import EyeOpenStrikethroughIcon from '@atlaskit/icon/core/eye-open-strikethrough';
import LinkIcon from '@atlaskit/icon/core/link';
import LockLockedIcon from '@atlaskit/icon/core/lock-locked';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/admin/admin-dialog';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
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
                <LockLockedIcon label="" size="small" />
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
                  <label htmlFor="new-password" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Default Password</label>
                  <Textfield
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter a default password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                    elemAfterInput={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ display: 'flex', alignItems: 'center', padding: '0 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}
                      >
                        {showPassword ? <EyeOpenStrikethroughIcon label="" size="small" /> : <EyeOpenIcon label="" size="small" />}
                      </button>
                    }
                  />
                  <p className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                    The user will be required to change this password on their next login.
                  </p>
                </div>
                <DialogFooter className="sm:justify-end gap-2">
                  <Button appearance="default" onClick={handleClose} isDisabled={isLoading}>
                    Cancel
                  </Button>
                  <Button appearance="primary" onClick={handleSetPassword} isDisabled={isLoading || !newPassword || newPassword.length < 6}>
                    {isLoading ? (
                      <>
                        <Spinner size="small" />
                        Setting...
                      </>
                    ) : (
                      'Set Password'
                    )}
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="link" className="space-y-4 mt-4">
                <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                  Generate a one-time reset link that the user can use to set their own password.
                  The link expires in 24 hours.
                </p>
                <DialogFooter className="sm:justify-end gap-2">
                  <Button appearance="default" onClick={handleClose} isDisabled={isLoading}>
                    Cancel
                  </Button>
                  <Button appearance="primary" onClick={handleGenerateLink} isDisabled={isLoading} iconBefore={LinkIcon}>
                    {isLoading ? (
                      <>
                        <Spinner size="small" />
                        Generating...
                      </>
                    ) : (
                      'Generate Reset Link'
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
                <CheckMarkIcon label="" size="small" />
                Password reset link created
              </DialogTitle>
              <DialogDescription>
                Share this link with the user. They can use it once to set a new password. 
                The link expires in 24 hours.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="reset-link" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Reset Link</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Textfield
                      id="reset-link"
                      value={resetLink}
                      isReadOnly
                    />
                  </div>
                  <Button
                    appearance="default"
                    onClick={handleCopyLink}
                    iconBefore={copied ? CheckMarkIcon : CopyIcon}
                  >{null}</Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button appearance="default" onClick={handleCopyLink} iconBefore={copied ? CheckMarkIcon : CopyIcon}>
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button appearance="primary" onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}

        {step === 'password-success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckMarkIcon label="" size="small" />
                Default password set
              </DialogTitle>
              <DialogDescription>
                The user's password has been set. They will be required to change it when they next log in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Password set to:</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Textfield
                      value={newPassword}
                      isReadOnly
                      type={showPassword ? 'text' : 'password'}
                    />
                  </div>
                  <IconButton
                    appearance="default"
                    onClick={() => setShowPassword(!showPassword)}
                    icon={showPassword ? EyeOpenStrikethroughIcon : EyeOpenIcon}
                    label={showPassword ? 'Hide password' : 'Show password'}
                  />
                  <IconButton
                    appearance="default"
                    onClick={handleCopyPassword}
                    icon={copied ? CheckMarkIcon : CopyIcon}
                    label="Copy password"
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                  Share this password with the user securely. They will be prompted to set a new password on their first login.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button appearance="default" onClick={handleCopyPassword} iconBefore={copied ? CheckMarkIcon : CopyIcon}>
                {copied ? 'Copied!' : 'Copy Password'}
              </Button>
              <Button appearance="primary" onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
