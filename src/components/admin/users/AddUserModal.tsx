import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useProductRoles } from '@/hooks/useProductRoles';
import { useCreateUser, CreateUserInput } from '@/hooks/useUsers';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddUserModal({ isOpen, onClose }: AddUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { roles, isLoading: rolesLoading } = useProductRoles();
  const createUser = useCreateUser();

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setSelectedRoles([]);
    setError(null);
    setFieldErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (selectedRoles.length === 0) {
      errors.roles = 'At least one Product role must be selected';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
    // Clear role error when user selects a role
    if (fieldErrors.roles) {
      setFieldErrors(prev => ({ ...prev, roles: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    const input: CreateUserInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      roleIds: selectedRoles,
    };

    try {
      await createUser.mutateAsync(input);
      handleClose();
    } catch (err) {
      const errorMessage = (err as Error).message;
      if (errorMessage.includes('already exists')) {
        setError('A user with this email already exists.');
      } else {
        setError("We couldn't create this user. Please try again or contact an administrator.");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign roles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (fieldErrors.firstName) {
                    setFieldErrors(prev => ({ ...prev, firstName: '' }));
                  }
                }}
                placeholder="Enter first name"
                className={fieldErrors.firstName ? 'border-destructive' : ''}
              />
              {fieldErrors.firstName && (
                <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (fieldErrors.lastName) {
                    setFieldErrors(prev => ({ ...prev, lastName: '' }));
                  }
                }}
                placeholder="Enter last name"
                className={fieldErrors.lastName ? 'border-destructive' : ''}
              />
              {fieldErrors.lastName && (
                <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              placeholder="Enter email address"
              className={fieldErrors.email ? 'border-destructive' : ''}
            />
            {fieldErrors.email && (
              <p className="text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Product Roles *</Label>
            <div className={`border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto ${fieldErrors.roles ? 'border-destructive' : ''}`}>
              {rolesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                roles?.map((role) => (
                  <div key={role.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={() => handleRoleToggle(role.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`role-${role.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {role.name}
                      </label>
                      {role.description && (
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {fieldErrors.roles && (
              <p className="text-xs text-destructive">{fieldErrors.roles}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-brand-gold hover:bg-brand-gold-hover"
              disabled={createUser.isPending}
            >
              {createUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
