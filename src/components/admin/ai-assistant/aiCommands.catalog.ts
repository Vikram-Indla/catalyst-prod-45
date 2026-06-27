// AI Admin Console — command catalog + matching/filtering helpers.
// Grounded in the real tables: profiles, user_roles, product_roles,
// user_product_roles, product_role_permissions, user_permission_overrides,
// departments — and PERMISSION_GROUPS (e.g. "Product: Create Sprint").
import type { Command, CommandGroup, CommandView } from './aiAdminConsole.types';

export const COMMANDS: Command[] = [
  // Users
  { cat: ‘Users’, title: ‘Invite a new user’, desc: ‘Send an invite to an email address’, example: ‘Invite j.khan@mim.gov.sa as Product Owner’, risk: ‘Low’, slug: ‘invite user’, keywords: ‘invite add email product owner’ },
  { cat: ‘Users’, title: ‘Create an account’, desc: ‘Add a person directly, no invite’, example: ‘Add Priya Sharma, priya@mim.gov.sa’, risk: ‘Low’, slug: ‘add user’, keywords: ‘create account person add’ },
  { cat: ‘Users’, title: ‘Rename a user’, desc: ‘Change a person’s display name’, example: ‘Rename Vikram Indla to Vikram’, risk: ‘Low’, slug: ‘rename user’, keywords: ‘rename change name’ },
  { cat: ‘Users’, title: ‘Update a user email’, desc: ‘Change the email on an account’, example: ‘Change email for Sikander Ahmad to s.ahmad@mim.gov.sa’, risk: ‘Medium’, slug: ‘update email’, keywords: ‘email change address update’ },
  { cat: ‘Users’, title: ‘Deactivate a user’, desc: ‘Suspend access without deleting’, example: ‘Deactivate Sikander Ahmad’, risk: ‘Medium’, slug: ‘deactivate user’, keywords: ‘disable suspend off deactivate’ },
  { cat: ‘Users’, title: ‘Delete a user’, desc: ‘Permanently remove an account’, example: ‘Delete user Adnan Ali’, risk: ‘High’, slug: ‘delete user’, keywords: ‘remove delete destroy’ },
  { cat: ‘Users’, title: ‘Send a password reset link’, desc: ‘Email a secure reset link’, example: ‘Reset password for Vikram Indla’, risk: ‘Low’, slug: ‘reset password’, keywords: ‘reset password forgot’ },
  { cat: ‘Users’, title: ‘Resend an invitation’, desc: ‘Send the invite email again’, example: ‘Resend invite to j.khan@mim.gov.sa’, risk: ‘Low’, slug: ‘resend invite’, keywords: ‘resend invite again’ },
  { cat: ‘Users’, title: ‘Look up a user’, desc: ‘View a person’s roles and details’, example: ‘Look up Vikram Indla’, risk: ‘Low’, slug: ‘lookup user’, keywords: ‘lookup find profile search view’ },
  // Roles
  { cat: 'Roles', title: 'Assign a product role', desc: 'Give a person a role', example: 'Make Vikram a Product Owner', risk: 'Low', slug: 'assign role', keywords: 'assign add role product owner make' },
  { cat: 'Roles', title: 'Remove a role', desc: 'Take a role away from a person', example: 'Remove Product Owner from Vikram', risk: 'Medium', slug: 'remove role', keywords: 'remove role revoke' },
  { cat: 'Roles', title: 'Replace a user’s role', desc: 'Swap one role for another', example: 'Change Sarah’s role to Product Manager', risk: 'Medium', slug: 'replace role', keywords: 'replace swap change role' },
  { cat: 'Roles', title: 'Create a role', desc: 'Define a new role', example: 'Create role QA Lead', risk: 'Low', slug: 'create role', keywords: 'create new role' },
  { cat: 'Roles', title: 'Deactivate a role', desc: 'Retire a role from use', example: 'Deactivate the Contractor role', risk: 'High', slug: 'deactivate role', keywords: 'deactivate disable role retire' },
  // Permissions (over PERMISSION_GROUPS)
  { cat: 'Permissions', title: 'Allow a permission', desc: 'Grant an action to a role', example: 'Allow Senior Developer to Create Sprint', risk: 'High', slug: 'allow permission', keywords: 'allow grant permission create sprint' },
  { cat: 'Permissions', title: 'Deny a permission', desc: 'Block an action for a role', example: 'Deny Team Lead from Delete Project', risk: 'High', slug: 'deny permission', keywords: 'deny block permission' },
  { cat: 'Permissions', title: 'Reset a role’s permissions', desc: 'Return a role to defaults', example: 'Reset permissions for Senior Developer', risk: 'High', slug: 'reset permissions', keywords: 'reset default permissions' },
  { cat: 'Permissions', title: 'Set a user exception', desc: 'Make a per-person exception', example: 'Allow Vikram to Export Data', risk: 'Medium', slug: 'set override', keywords: 'override exception user permission allow' },
  // Departments
  { cat: 'Departments', title: 'Create a department', desc: 'Add a new department', example: 'Create department Platform', risk: 'Low', slug: 'create department', keywords: 'create department team' },
  { cat: 'Departments', title: 'Move a user to a department', desc: 'Reassign a person’s department', example: 'Move Vikram to Platform', risk: 'Low', slug: 'move to department', keywords: 'move department transfer' },
  { cat: 'Departments', title: 'Set a department owner', desc: 'Name a department lead', example: 'Make Vikram owner of Platform', risk: 'Medium', slug: 'set department owner', keywords: 'owner lead department set' },
  // Module access
  { cat: 'Module access', title: 'Grant module access', desc: 'Open a module for a person or role', example: 'Give Vikram access to Releases', risk: 'Medium', slug: 'grant module', keywords: 'grant module project product releases give access' },
  { cat: 'Module access', title: 'Revoke module access', desc: 'Close a module for a person or role', example: 'Remove Test Hub from Contractors', risk: 'Medium', slug: 'revoke module', keywords: 'revoke module remove access' },
  // Bulk operations
  { cat: 'Bulk operations', title: 'Invite multiple users', desc: 'Invite a list of people at once', example: 'Invite Priya Sharma, Adnan Ali as React Developer', risk: 'Low', bulk: true, slug: 'invite users', keywords: 'invite bulk multiple users people csv' },
  { cat: 'Bulk operations', title: 'Deactivate multiple users', desc: 'Suspend several accounts', example: 'Deactivate Sikander Ahmad, Abdullah Alshammari', risk: 'Medium', bulk: true, slug: 'deactivate users', keywords: 'deactivate bulk multiple' },
  { cat: 'Bulk operations', title: 'Delete multiple users', desc: 'Remove several accounts', example: 'Delete Sikander Ahmad, Abdullah Alshammari', risk: 'High', bulk: true, slug: 'delete users', keywords: 'delete bulk multiple remove' },
  { cat: 'Bulk operations', title: 'Assign a role to many users', desc: 'Give many people the same role', example: 'Make Ana, Ben and Cara Developers', risk: 'Medium', bulk: true, slug: 'assign role', keywords: 'assign bulk role multiple many' },
  { cat: 'Bulk operations', title: 'Remove a permission from many', desc: 'Block an action across roles', example: 'Remove Create Sprint from Developer and QA', risk: 'High', bulk: true, slug: 'remove permission', keywords: 'remove bulk permission multiple many' },
  { cat: 'Bulk operations', title: 'Move many users to a department', desc: 'Reassign many people at once', example: 'Move Ana and Ben to Platform', risk: 'Low', bulk: true, slug: 'move to department', keywords: 'move bulk department multiple many' },
];

const CAT_ORDER: Command['cat'][] = ['Learned', 'Users', 'Roles', 'Permissions', 'Departments', 'Module access', 'Bulk operations'];

export const norm = (q: string) => q.trim().toLowerCase().replace(/^\//, '').trim();

/** Ranked fuzzy filter for the palette. */
export function filterCommands(all: Command[], q: string): Command[] {
  const n = norm(q);
  if (!n) return all;
  const score = (c: Command) => {
    const t = c.title.toLowerCase(), s = c.slug.toLowerCase(), kw = c.keywords.toLowerCase();
    if (s.startsWith(n) || t.startsWith(n)) return 3;
    if (s.includes(n) || t.includes(n)) return 2;
    if (n.split(' ').some(w => w && (kw.includes(w) || t.includes(w) || s.includes(w)))) return 1;
    return 0;
  };
  return all.map(c => [c, score(c)] as const).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}

/** Resolve a typed request to a command. `pick` is the last explicit selection. */
export function matchCommand(all: Command[], q: string, pick: { text: string; cmd: Command } | null): Command | null {
  const n = norm(q);
  if (!n) return null;
  if (pick && q.trim() === pick.text) return pick.cmd;
  const bySlug = all.filter(c => n.startsWith(c.slug)).sort((a, b) => b.slug.length - a.slug.length);
  if (bySlug[0]) return bySlug[0];
  const byVerb = all.filter(c => {
    const v = c.slug.split(' ')[0];
    return n.startsWith(v) || c.keywords.split(' ').some(w => w && n.startsWith(w));
  }).sort((a, b) => b.slug.length - a.slug.length);
  return byVerb[0] || null;
}

export function groupCommands(list: Command[], toView: (c: Command) => CommandView): CommandGroup[] {
  const by: Record<string, Command[]> = {};
  list.forEach(c => { (by[c.cat] = by[c.cat] || []).push(c); });
  return CAT_ORDER.filter(c => by[c]).map(cat => ({ cat, count: by[cat].length, items: by[cat].map(toView) }));
}
