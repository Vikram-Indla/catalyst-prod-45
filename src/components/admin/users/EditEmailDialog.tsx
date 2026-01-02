import { useState, useEffect } from 'react';
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
import { useUpdateUserEmail } from '@/hooks/useUsers';

interface EditEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string | null;
  currentEmail: string | null;
}

export function EditEmailDialog({
  isOpen,
  onClose,
  userId,
  userName,
  currentEmail,
}: EditEmailDialogProps) {
  const [email, setEmail] = useState(currentEmail || '');
  const updateEmail = useUpdateUserEmail();

  useEffect(() => {
    if (isOpen && currentEmail) {
      setEmail(currentEmail);
    }
  }, [isOpen, currentEmail]);

  const handleSave = () => {
    if (!userId || !email.trim()) return;

    updateEmail.mutate(
      { userId, email: email.trim() },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Email</DialogTitle>
          <DialogDescription>
            Update the email address for {userName || 'this user'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValidEmail || updateEmail.isPending}
          >
            {updateEmail.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
