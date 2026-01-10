import React, { useState, useEffect } from 'react';
import { Users, Plus, Check, X as XIcon, Pen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  badgeColor: string;
  permissions: {
    generate: boolean;
    edit: boolean;
    publish: boolean;
    delete: boolean;
    admin: boolean;
  };
}

const initialRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    badgeColor: 'bg-[#7c3aed]/10 text-[#7c3aed]',
    permissions: { generate: true, edit: true, publish: true, delete: true, admin: true },
  },
  {
    id: '2',
    name: 'Manager',
    badgeColor: 'bg-[#2563eb]/10 text-[#2563eb]',
    permissions: { generate: true, edit: true, publish: true, delete: true, admin: false },
  },
  {
    id: '3',
    name: 'User',
    badgeColor: 'bg-[#64748b]/10 text-[#64748b]',
    permissions: { generate: true, edit: true, publish: false, delete: false, admin: false },
  },
  {
    id: '4',
    name: 'Viewer',
    badgeColor: 'bg-[#64748b]/10 text-[#64748b]',
    permissions: { generate: false, edit: false, publish: false, delete: false, admin: false },
  },
];

const permissionLabels = ['Generate', 'Edit', 'Publish', 'Delete', 'Admin'];

export default function RAAdminPermissions() {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [showModal, setShowModal] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    permissions: { generate: false, edit: false, publish: false, delete: false, admin: false },
  });

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleCreateRole = () => {
    if (!newRole.name.trim()) {
      toast.error('Please enter a role name');
      return;
    }
    const role: Role = {
      id: Date.now().toString(),
      name: newRole.name,
      badgeColor: 'bg-[#64748b]/10 text-[#64748b]',
      permissions: newRole.permissions,
    };
    setRoles([...roles, role]);
    setShowModal(false);
    setNewRole({ name: '', permissions: { generate: false, edit: false, publish: false, delete: false, admin: false } });
    toast.success(`Created role "${role.name}"`);
  };

  const PermissionIcon = ({ allowed }: { allowed: boolean }) => {
    if (allowed) {
      return (
        <div className="w-6 h-6 rounded-full bg-[#10b981]/10 flex items-center justify-center">
          <Check className="w-4 h-4 text-[#10b981]" />
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-[#64748b]/10 flex items-center justify-center">
        <XIcon className="w-4 h-4 text-[#64748b]" />
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-full">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">Permissions</h1>
        <p className="text-sm text-[#64748b] mt-1">Manage role-based access control for Requirement Assist</p>
      </div>

      {/* Role-Based Access Control Card */}
      <Card className="bg-white border-[#e2e8f0]">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[#0f172a] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#64748b]" />
            Role-Based Access Control
          </CardTitle>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Role
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f8fafc] border-y border-[#e2e8f0]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide px-4 py-3">Role</th>
                {permissionLabels.map(label => (
                  <th key={label} className="text-center text-xs font-semibold text-[#64748b] uppercase tracking-wide px-4 py-3 w-24">
                    {label}
                  </th>
                ))}
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide px-4 py-3 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role, index) => (
                <tr 
                  key={role.id}
                  className={index < roles.length - 1 ? 'border-b border-[#e2e8f0]' : ''}
                >
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded', role.badgeColor)}>
                      {role.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <PermissionIcon allowed={role.permissions.generate} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <PermissionIcon allowed={role.permissions.edit} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <PermissionIcon allowed={role.permissions.publish} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <PermissionIcon allowed={role.permissions.delete} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <PermissionIcon allowed={role.permissions.admin} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => toast.info('Edit functionality coming soon')}
                      className="p-1.5 rounded hover:bg-[#f8fafc] text-[#64748b] hover:text-[#0f172a]"
                    >
                      <Pen className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add Role Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
              <h2 className="text-lg font-semibold text-[#0f172a]">Add Role</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-[#f8fafc] text-[#64748b]"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#0f172a] mb-1.5 block">Role Name</label>
                <Input 
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#0f172a] mb-3 block">Permissions</label>
                <div className="space-y-3">
                  {Object.keys(newRole.permissions).map((key) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-[#475569] capitalize">{key}</span>
                      <Switch 
                        checked={newRole.permissions[key as keyof typeof newRole.permissions]}
                        onCheckedChange={(checked) => 
                          setNewRole({ 
                            ...newRole, 
                            permissions: { ...newRole.permissions, [key]: checked } 
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-[#e2e8f0]">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateRole}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                Create Role
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
