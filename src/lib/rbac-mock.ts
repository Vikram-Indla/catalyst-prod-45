/**
 * rbac-mock.ts — typed mock data for RBAC Admin UI scaffolding.
 *
 * RBAC_SCHEMA_DEPLOYED must remain false until the rbac_* migrations
 * are authored, approved, and applied to staging + production.
 * This constant gates all write/persist paths in RBAC admin UI.
 */

export const RBAC_SCHEMA_DEPLOYED = false;

// ─── Types ────────────────────────────────────────────────────────────────────

export type RbacUser = {
  id: string;
  name: string;
  email: string;
  department?: string;
  status: 'active' | 'inactive' | 'pending';
  roles: string[];
  avatarUrl?: string;
};

export type RbacRole = {
  id: string;
  name: string;
  description?: string;
  userCount: number;
  permissionCount: number;
  systemRole?: boolean;
  isActive: boolean;
};

export type RbacPermission = {
  id: string;
  module: string;
  resource: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'admin';
  description?: string;
};

export type RbacAssignment = {
  id: string;
  userId: string;
  roleId: string;
  assignedBy?: string;
  assignedAt?: string;
};

// ─── Mock roles (representing future rbac_roles table) ────────────────────────

export const MOCK_ROLES: RbacRole[] = [
  { id: 'r1', name: 'Admin',              description: 'Full system access',                 userCount: 2,  permissionCount: 48, systemRole: true,  isActive: true  },
  { id: 'r2', name: 'Product Owner',      description: 'Owns product module access',          userCount: 4,  permissionCount: 31, systemRole: false, isActive: true  },
  { id: 'r3', name: 'Product Manager',    description: 'Manages product planning',            userCount: 3,  permissionCount: 28, systemRole: false, isActive: true  },
  { id: 'r4', name: 'Project Manager',    description: 'Owns delivery & sprint tracking',     userCount: 5,  permissionCount: 24, systemRole: false, isActive: true  },
  { id: 'r5', name: 'Developer',          description: 'Builds and delivers work items',      userCount: 12, permissionCount: 18, systemRole: false, isActive: true  },
  { id: 'r6', name: 'QA Tester',          description: 'Validates and tests deliverables',    userCount: 4,  permissionCount: 15, systemRole: false, isActive: true  },
  { id: 'r7', name: 'Release Manager',    description: 'Coordinates and approves releases',   userCount: 2,  permissionCount: 21, systemRole: false, isActive: true  },
  { id: 'r8', name: 'Business Analyst',   description: 'Analyses and documents requirements', userCount: 3,  permissionCount: 20, systemRole: false, isActive: true  },
  { id: 'r9', name: 'Governance',         description: 'Compliance and audit oversight',      userCount: 1,  permissionCount: 12, systemRole: false, isActive: true  },
  { id: 'r10', name: 'Guest',             description: 'Read-only, 48 h expiry',              userCount: 0,  permissionCount: 4,  systemRole: true,  isActive: true  },
];

// ─── Mock users ───────────────────────────────────────────────────────────────

export const MOCK_USERS: RbacUser[] = [
  { id: 'u1', name: 'Vikram Indla',    email: 'vikramataol@gmail.com',     department: 'Engineering',   status: 'active',  roles: ['r1'] },
  { id: 'u2', name: 'Syed Habib',      email: 'syed@catalyst.internal',   department: 'Engineering',   status: 'active',  roles: ['r5'] },
  { id: 'u3', name: 'Yazeed Daraz',    email: 'yazeed@catalyst.internal',  department: 'QA',            status: 'active',  roles: ['r6'] },
  { id: 'u4', name: 'Nora Al-Rashid',  email: 'nora@catalyst.internal',    department: 'Product',       status: 'active',  roles: ['r2', 'r3'] },
  { id: 'u5', name: 'Omar Khalid',     email: 'omar@catalyst.internal',    department: 'Delivery',      status: 'active',  roles: ['r4'] },
  { id: 'u6', name: 'Layla Hassan',    email: 'layla@catalyst.internal',   department: 'Release',       status: 'active',  roles: ['r7'] },
  { id: 'u7', name: 'Samir Atef',      email: 'samir@catalyst.internal',   department: 'Analysis',      status: 'active',  roles: ['r8'] },
  { id: 'u8', name: 'Reem Al-Farsi',   email: 'reem@catalyst.internal',    department: 'Governance',    status: 'inactive',roles: ['r9'] },
  { id: 'u9', name: 'Khalid Mansoor',  email: 'khalid@catalyst.internal',  department: 'Engineering',   status: 'pending', roles: [] },
  { id: 'u10', name: 'Sara Mohsen',    email: 'sara@catalyst.internal',    department: 'Product',       status: 'active',  roles: ['r3'] },
];

// ─── Mock permissions catalogue ───────────────────────────────────────────────
// Represents future rbac_role_module_permissions + rbac_role_action_permissions

export const MOCK_PERMISSIONS: RbacPermission[] = [
  // Project Hub
  { id: 'p1',  module: 'Project Hub',  resource: 'Backlog',       action: 'view',   description: 'View backlog items' },
  { id: 'p2',  module: 'Project Hub',  resource: 'Backlog',       action: 'create', description: 'Create new work items' },
  { id: 'p3',  module: 'Project Hub',  resource: 'Backlog',       action: 'edit',   description: 'Edit existing work items' },
  { id: 'p4',  module: 'Project Hub',  resource: 'Backlog',       action: 'delete', description: 'Delete work items' },
  { id: 'p5',  module: 'Project Hub',  resource: 'Board',         action: 'view',   description: 'View kanban/scrum board' },
  { id: 'p6',  module: 'Project Hub',  resource: 'Board',         action: 'edit',   description: 'Move cards and update status' },
  { id: 'p7',  module: 'Project Hub',  resource: 'Sprint',        action: 'create', description: 'Create and start sprints' },
  { id: 'p8',  module: 'Project Hub',  resource: 'Sprint',        action: 'approve',description: 'Complete and close sprints' },
  // Product Hub
  { id: 'p9',  module: 'Product Hub',  resource: 'Business Request', action: 'view',   description: 'View business requests' },
  { id: 'p10', module: 'Product Hub',  resource: 'Business Request', action: 'create', description: 'Submit new requests' },
  { id: 'p11', module: 'Product Hub',  resource: 'Business Request', action: 'approve',description: 'Approve or reject requests' },
  { id: 'p12', module: 'Product Hub',  resource: 'Roadmap',          action: 'view',   description: 'View product roadmap' },
  { id: 'p13', module: 'Product Hub',  resource: 'Roadmap',          action: 'edit',   description: 'Edit roadmap items' },
  // Release Hub
  { id: 'p14', module: 'Release Hub',  resource: 'Release',       action: 'view',   description: 'View releases' },
  { id: 'p15', module: 'Release Hub',  resource: 'Release',       action: 'create', description: 'Create release plans' },
  { id: 'p16', module: 'Release Hub',  resource: 'Release',       action: 'approve',description: 'Approve and cut releases' },
  { id: 'p17', module: 'Release Hub',  resource: 'Incident',      action: 'view',   description: 'View production incidents' },
  { id: 'p18', module: 'Release Hub',  resource: 'Incident',      action: 'create', description: 'Log new incidents' },
  // Test Hub
  { id: 'p19', module: 'Test Hub',     resource: 'Test Case',     action: 'view',   description: 'View test cases' },
  { id: 'p20', module: 'Test Hub',     resource: 'Test Case',     action: 'create', description: 'Author test cases' },
  { id: 'p21', module: 'Test Hub',     resource: 'Test Run',      action: 'create', description: 'Start test runs' },
  { id: 'p22', module: 'Test Hub',     resource: 'Test Run',      action: 'approve',description: 'Sign off on test runs' },
  // Admin
  { id: 'p23', module: 'Admin',        resource: 'Users',         action: 'admin',  description: 'Manage users and access' },
  { id: 'p24', module: 'Admin',        resource: 'Roles',         action: 'admin',  description: 'Manage RBAC roles' },
  { id: 'p25', module: 'Admin',        resource: 'Workflows',     action: 'admin',  description: 'Manage status workflows' },
  { id: 'p26', module: 'Admin',        resource: 'Connections',   action: 'admin',  description: 'Manage Jira/tool connections' },
];

// ─── Mock assignments ─────────────────────────────────────────────────────────

export const MOCK_ASSIGNMENTS: RbacAssignment[] = [
  { id: 'a1',  userId: 'u1', roleId: 'r1',  assignedBy: 'system',  assignedAt: '2026-05-01T10:00:00Z' },
  { id: 'a2',  userId: 'u2', roleId: 'r5',  assignedBy: 'u1',      assignedAt: '2026-05-15T09:30:00Z' },
  { id: 'a3',  userId: 'u3', roleId: 'r6',  assignedBy: 'u1',      assignedAt: '2026-05-15T09:35:00Z' },
  { id: 'a4',  userId: 'u4', roleId: 'r2',  assignedBy: 'u1',      assignedAt: '2026-05-20T11:00:00Z' },
  { id: 'a5',  userId: 'u4', roleId: 'r3',  assignedBy: 'u1',      assignedAt: '2026-05-20T11:05:00Z' },
  { id: 'a6',  userId: 'u5', roleId: 'r4',  assignedBy: 'u1',      assignedAt: '2026-06-01T08:00:00Z' },
  { id: 'a7',  userId: 'u6', roleId: 'r7',  assignedBy: 'u1',      assignedAt: '2026-06-01T08:10:00Z' },
  { id: 'a8',  userId: 'u7', roleId: 'r8',  assignedBy: 'u1',      assignedAt: '2026-06-10T14:00:00Z' },
  { id: 'a9',  userId: 'u8', roleId: 'r9',  assignedBy: 'u1',      assignedAt: '2026-06-12T10:00:00Z' },
  { id: 'a10', userId: 'u10',roleId: 'r3',  assignedBy: 'u1',      assignedAt: '2026-06-20T13:00:00Z' },
];

// ─── Role permission matrix (which roles hold which permissions) ───────────────
// role id → set of permission ids

export const MOCK_ROLE_PERMISSIONS: Record<string, string[]> = {
  r1:  ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12','p13','p14','p15','p16','p17','p18','p19','p20','p21','p22','p23','p24','p25','p26'],
  r2:  ['p1','p2','p3','p5','p9','p10','p11','p12','p13','p14','p17'],
  r3:  ['p1','p2','p3','p5','p9','p10','p12','p13'],
  r4:  ['p1','p2','p3','p5','p6','p7','p8','p14','p15','p17','p18'],
  r5:  ['p1','p2','p3','p5','p6'],
  r6:  ['p1','p5','p17','p19','p20','p21','p22'],
  r7:  ['p1','p5','p14','p15','p16','p17','p18'],
  r8:  ['p1','p2','p3','p5','p9','p10','p12'],
  r9:  ['p1','p5','p9','p12','p14','p17','p19'],
  r10: ['p1','p5','p9','p12'],
};

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function roleById(id: string): RbacRole | undefined {
  return MOCK_ROLES.find(r => r.id === id);
}

export function userById(id: string): RbacUser | undefined {
  return MOCK_USERS.find(u => u.id === id);
}

export function usersForRole(roleId: string): RbacUser[] {
  return MOCK_USERS.filter(u => u.roles.includes(roleId));
}

export function permissionsForRole(roleId: string): RbacPermission[] {
  const ids = new Set(MOCK_ROLE_PERMISSIONS[roleId] ?? []);
  return MOCK_PERMISSIONS.filter(p => ids.has(p.id));
}

export function distinctModules(): string[] {
  return [...new Set(MOCK_PERMISSIONS.map(p => p.module))];
}

export function distinctRoleNames(): string[] {
  return MOCK_ROLES.filter(r => r.isActive).map(r => r.name);
}
