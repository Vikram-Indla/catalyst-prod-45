import { useState } from 'react';
import Spinner from '@atlaskit/spinner';
import AlertIcon from '@atlaskit/icon/core/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/admin/admin-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@/components/ui/checkbox';
import { useProductRoles } from '@/hooks/useProductRoles';
import { useCreateUser, CreateUserInput } from '@/hooks/useUsers';
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
              <AlertIcon label="" size="small" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>First Name *</label>
              <Textfield
                id="firstName"
                value={firstName}
                onChange={(e) => {
                  setFirstName((e.target as HTMLInputElement).value);
                  if (fieldErrors.firstName) {
                    setFieldErrors(prev => ({ ...prev, firstName: '' }));
                  }
                }}
                placeholder="Enter first name"
                isInvalid={!!fieldErrors.firstName}
              />
              {fieldErrors.firstName && (
                <p className="text-xs" style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>{fieldErrors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Last Name *</label>
              <Textfield
                id="lastName"
                value={lastName}
                onChange={(e) => {
                  setLastName((e.target as HTMLInputElement).value);
                  if (fieldErrors.lastName) {
                    setFieldErrors(prev => ({ ...prev, lastName: '' }));
                  }
                }}
                placeholder="Enter last name"
                isInvalid={!!fieldErrors.lastName}
              />
              {fieldErrors.lastName && (
                <p className="text-xs" style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Email *</label>
            <Textfield
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail((e.target as HTMLInputElement).value);
                if (fieldErrors.email) {
                  setFieldErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              placeholder="Enter email address"
              isInvalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p className="text-xs" style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Product Roles *</label>
            <div className={`border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto ${fieldErrors.roles ? 'border-destructive' : ''}`}>
              {rolesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="small" />
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
            <Button type="button" appearance="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              appearance="primary"
              isDisabled={createUser.isPending}
            >
              {createUser.isPending ? (
                <>
                  <Spinner size="small" />
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
