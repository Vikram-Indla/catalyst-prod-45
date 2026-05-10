import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Button from '@atlaskit/button/new';
import { Lozenge } from '@/components/ads';
import Textfield from '@atlaskit/textfield';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import EditIcon from '@atlaskit/icon/core/edit';
import EyeOpenIcon from '@atlaskit/icon/core/eye-open';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import SearchIcon from '@atlaskit/icon/core/search';
import ShieldIcon from '@atlaskit/icon/core/shield';

// Product-specific permissions
const PRODUCT_PERMISSIONS = [
  'Configure Product fields',
  'Manage business lines',
  'View Product demand',
  'Create Product demand',
  'Edit Product demand',
  'Delete Product demand',
  'Manage Product workflow',
  'View Product reports',
];

export function AccessControlPanel() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users with their roles - only APPROVED users
  const { data: usersWithRoles = [], isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('approval_status', 'APPROVED');
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Combine profiles with roles
      return profiles.map(profile => ({
        ...profile,
        role: roles.find(r => r.user_id === profile.id)?.role || 'user',
      }));
    },
  });

  // Calculate stats
  const adminCount = usersWithRoles.filter(u => u.role === 'admin').length;
  const programManagerCount = usersWithRoles.filter(u => u.role === 'program_manager').length;
  const teamLeadCount = usersWithRoles.filter(u => u.role === 'team_lead').length;
  const userCount = usersWithRoles.filter(u => u.role === 'user').length;

  // Role cards with their permissions
  const roleCards = [
    {
      name: 'System Admin',
      role: 'admin',
      description: 'Full access to all Product settings and data',
      permissions: PRODUCT_PERMISSIONS,
      userCount: adminCount,
      color: 'bg-red-50 border-red-200',
    },
    {
      name: 'Program Manager',
      role: 'program_manager',
      description: 'Can manage Product demands and view reports',
      permissions: [
        'View Product demand',
        'Create Product demand',
        'Edit Product demand',
        'View Product reports',
      ],
      userCount: programManagerCount,
      color: 'bg-blue-50 border-blue-200',
    },
    {
      name: 'Team Lead',
      role: 'team_lead',
      description: 'Can view and edit Product demands',
      permissions: [
        'View Product demand',
        'Create Product demand',
        'Edit Product demand',
      ],
      userCount: teamLeadCount,
      color: 'bg-green-50 border-green-200',
    },
    {
      name: 'User',
      role: 'user',
      description: 'Can view Product demands only',
      permissions: [
        'View Product demand',
      ],
      userCount: userCount,
      color: 'bg-gray-50 border-gray-200',
    },
  ];

  const filteredRoles = roleCards.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.permissions.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Access Control</h2>
          <p className="text-sm text-muted-foreground">
            View and manage Product module permissions through System Roles.
          </p>
        </div>
        <Button appearance="default" isDisabled iconBefore={LinkExternalIcon}>
          View Roles
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <ShieldIcon label="" size="small" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roles with Access</p>
              <p className="text-2xl font-semibold">{roleCards.length}</p>
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <PeopleGroupIcon label="" size="small" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-semibold">{usersWithRoles.length}</p>
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <EditIcon label="" size="small" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Can Edit</p>
              <p className="text-2xl font-semibold">{adminCount + programManagerCount + teamLeadCount}</p>
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <EyeOpenIcon label="" size="small" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">View Only</p>
              <p className="text-2xl font-semibold">{userCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Textfield
          placeholder="Search roles or permissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          elemBeforeInput={
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              <SearchIcon label="" size="small" />
            </span>
          }
        />
      </div>

      {/* Role Cards */}
      <div className="space-y-4">
        {filteredRoles.map((role) => (
          <div
            key={role.role}
            className={`border rounded-lg overflow-hidden ${role.color}`}
          >
            <div className="flex items-start justify-between p-4 border-b bg-card/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{role.name}</h3>
                  <Lozenge appearance="default">
                    {role.userCount} users
                  </Lozenge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {role.description}
                </p>
              </div>
              <Button appearance="default" isDisabled>
                View Details
              </Button>
            </div>
            <div className="p-4 bg-card">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Product Permissions
              </p>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((permission) => (
                  <Lozenge key={permission} appearance="default">
                    {permission}
                  </Lozenge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="bg-muted/50 p-4 rounded-lg" style={{ borderLeft: '3px solid var(--accent-color)' }}>
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Product module permissions are managed through the global 
          System Roles configuration. Changes made there will affect access across all modules.
        </p>
      </div>
    </div>
  );
}
