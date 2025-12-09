/**
 * Add Team Member Modal
 * Following specification exactly
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Resource } from '@/types/capacity';
import { getInitials } from '@/lib/capacityUtils';

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'allocations'>) => void;
}

export function AddMemberModal({ open, onOpenChange, onAdd }: AddMemberModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [primarySkill, setPrimarySkill] = useState<Resource['primarySkill']>('Frontend');
  const [location, setLocation] = useState<Resource['location']>('Onsite');
  const [department, setDepartment] = useState<Resource['department']>('Engineering');

  const isValid = firstName.trim() && lastName.trim() && role.trim();

  const handleSubmit = () => {
    if (!isValid) return;

    const name = `${firstName.trim()} ${lastName.trim()}`;
    onAdd({
      name,
      initials: getInitials(name),
      role: role.trim(),
      email: email.trim() || undefined,
      primarySkill,
      location,
      department,
      capacity: 100,
      startDate: new Date().toISOString().split('T')[0],
    });

    // Reset form
    setFirstName('');
    setLastName('');
    setRole('');
    setEmail('');
    setPrimarySkill('Frontend');
    setLocation('Onsite');
    setDepartment('Engineering');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role / Title *</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Senior Developer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Skill</Label>
              <Select value={primarySkill} onValueChange={(v) => setPrimarySkill(v as Resource['primarySkill'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Frontend">Frontend</SelectItem>
                  <SelectItem value="Backend">Backend</SelectItem>
                  <SelectItem value="Full Stack">Full Stack</SelectItem>
                  <SelectItem value="DevOps">DevOps</SelectItem>
                  <SelectItem value="QA">QA</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Data">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={location} onValueChange={(v) => setLocation(v as Resource['location'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Onsite">Onsite</SelectItem>
                  <SelectItem value="Offshore">Offshore</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={department} onValueChange={(v) => setDepartment(v as Resource['department'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid}
            className="bg-[#c69c6d] hover:bg-[#8b7355] text-white"
          >
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
