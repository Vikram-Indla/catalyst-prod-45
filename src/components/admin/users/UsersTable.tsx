import { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, MoreHorizontal, Power, PowerOff, Trash2, KeyRound, CheckCircle, XCircle, Clock, Upload, Pencil } from 'lucide-react';
import { UserProfile, useDeleteUser, useApproveUser, useRejectUser, useDisableUser, ApprovalStatus, getDisplayStatus } from '@/hooks/useUsers';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ResponsiveTableWrapper } from '@/components/layout/ResponsivePageContainer';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { BulkUpdateDrawer } from './BulkUpdateDrawer';
import { BulkEditCommandBar } from './BulkEditCommandBar';
import { EditUserDrawer } from './EditUserDrawer';
import { UserInlineCell } from './UserInlineCell';
import { useIsSuperAdmin } from '@/hooks/useUsers';
import { useUserInlineEdit } from '@/hooks/useUserInlineEdit';
import { formatContractEndDate, getCountryInfo } from '@/lib/countryLookup';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsersTableProps {
  users: UserProfile[];
  isLoading: boolean;
  onEditRoles?: (userId: string) => void;
  onEditPermissions?: (userId: string) => void;
}

export function UsersTable({ users, isLoading }: UsersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [userToReject, setUserToReject] = useState<UserProfile | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserProfile | null>(null);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const deleteUser = useDeleteUser();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();
  const disableUser = useDisableUser();
  const { data: isSuperAdmin } = useIsSuperAdmin();

  // Fetch reference data for inline editing dropdowns
  const { data: vendors = [] } = useQuery({
    queryKey: ['resource-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_vendors')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['resource-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_locations')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['resource-countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_countries')
        .select('id, name, code')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['capacity-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_departments')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['resource-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Reference data for inline edit hook
  const referenceData = useMemo(() => ({
    vendors,
    locations,
    countries,
    departments,
    assignments,
  }), [vendors, locations, countries, departments, assignments]);

  // Inline edit mutation
  const inlineEdit = useUserInlineEdit(referenceData);

  // Dropdown options for inline cells
  const vendorOptions = useMemo(() => 
    vendors.map(v => ({ value: v.id, label: v.name })), [vendors]);
  const locationOptions = useMemo(() => 
    locations.map(l => ({ value: l.id, label: l.name })), [locations]);
  const countryOptions = useMemo(() => 
    countries.map(c => ({ value: c.id, label: c.name })), [countries]);
  const departmentOptions = useMemo(() => 
    departments.map(d => ({ value: d.id, label: d.name })), [departments]);
  const assignmentOptions = useMemo(() => 
    assignments.map(a => ({ value: a.id, label: a.name })), [assignments]);
  const resourceTypeOptions = [
    { value: 'Permanent', label: 'Permanent' },
    { value: 'Fixed', label: 'Fixed' },
    { value: 'Variable', label: 'Variable' },
    { value: 'Freelance', label: 'Freelance' },
  ];

  // Get unique values for filter dropdowns
  const allRoles = [...new Set(users.flatMap(u => u.roles.map(r => r.role_name)))];
  const uniqueVendors = [...new Set(users.map(u => u.vendor).filter(Boolean))];
  const uniqueCountries = [...new Set(users.map(u => u.country).filter(Boolean))];
  const uniqueLocations = [...new Set(users.map(u => u.location).filter(Boolean))];
  const uniqueDepartments = [...new Set(users.map(u => u.department_name).filter(Boolean))];
  const uniqueAssignments = [...new Set(users.map(u => u.assignment_name).filter(Boolean))];

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.job_role?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesRole = roleFilter === 'all' || 
      user.roles.some(r => r.role_name === roleFilter);
    
    const matchesApproval = approvalFilter === 'all' || user.approval_status === approvalFilter;
    
    const matchesVendor = vendorFilter === 'all' || user.vendor === vendorFilter;
    const matchesCountry = countryFilter === 'all' || user.country === countryFilter;
    const matchesLocation = locationFilter === 'all' || user.location === locationFilter;
    const matchesDepartment = departmentFilter === 'all' || user.department_name === departmentFilter;
    const matchesAssignment = assignmentFilter === 'all' || user.assignment_name === assignmentFilter;
    
    return matchesSearch && matchesRole && matchesApproval && matchesVendor && matchesCountry && matchesLocation && matchesDepartment && matchesAssignment;
  });

  // Bulk selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [filteredUsers]);

  const handleSelectRow = useCallback((userId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
  const someSelected = filteredUsers.some(u => selectedIds.has(u.id)) && !allSelected;


  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return '-';
    const date = new Date(lastLogin);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    }
    if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, yyyy');
  };

  const getInitials = (fullName: string | null) => {
    if (!fullName) return '??';
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700 hover:bg-green-100';
      case 'Inactive':
        return 'bg-muted text-muted-foreground hover:bg-muted';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
      default:
        return '';
    }
  };

  const getApprovalBadge = (approvalStatus: ApprovalStatus | null) => {
    switch (approvalStatus) {
      case 'PENDING_APPROVAL':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'DISABLED':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><PowerOff className="h-3 w-3 mr-1" />Disabled</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Unknown</Badge>;
    }
  };

  const handleApprove = (userId: string) => {
    approveUser.mutate(userId);
  };

  const handleReject = (user: UserProfile) => {
    setUserToReject(user);
  };

  const confirmReject = () => {
    if (userToReject) {
      rejectUser.mutate({ userId: userToReject.id });
      setUserToReject(null);
    }
  };

  const handleDisable = (userId: string) => {
    disableUser.mutate(userId);
  };


  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUser.mutate(userToDelete.id);
      setUserToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>View and manage all users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg sm:text-xl">User List</CardTitle>
          <CardDescription className="text-xs sm:text-sm">View and manage all users in the system</CardDescription>
        </div>
        {isSuperAdmin && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsBulkUpdateOpen(true)}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            Bulk Update
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Filters - Row 1 */}
        <div className="flex flex-col gap-3 mb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {allRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Approval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assign</SelectItem>
                {uniqueAssignments.map(asn => (
                  <SelectItem key={asn} value={asn!}>{asn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {uniqueVendors.map(vendor => (
                  <SelectItem key={vendor} value={vendor!}>{vendor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {uniqueCountries.map(country => (
                  <SelectItem key={country} value={country!}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map(loc => (
                  <SelectItem key={loc} value={loc!}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden space-y-3">
          {filteredUsers.map((user) => (
            <div key={user.id} className="border rounded-lg p-4 bg-card hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => setEditUser(user)}
                    className="h-10 w-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-sm font-medium text-brand-primary hover:bg-brand-primary/30 transition-colors cursor-pointer flex-shrink-0"
                    title="Edit user"
                  >
                    {getInitials(user.full_name)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{user.full_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    {user.job_role && (
                      <div className="text-xs text-muted-foreground mt-0.5">{user.job_role}</div>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.approval_status === 'PENDING_APPROVAL' && (
                      <>
                        <DropdownMenuItem onClick={() => handleApprove(user.id)} className="text-green-600">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReject(user)} className="text-red-600">
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setEditUser(user)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit User
                    </DropdownMenuItem>
                    {user.approval_status === 'APPROVED' && isSuperAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setResetPasswordUser(user)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    {user.approval_status === 'APPROVED' && (
                      <DropdownMenuItem onClick={() => handleDisable(user.id)}>
                        <PowerOff className="h-4 w-4 mr-2" />
                        Disable User
                      </DropdownMenuItem>
                    )}
                    {user.approval_status === 'DISABLED' && (
                      <DropdownMenuItem onClick={() => handleApprove(user.id)}>
                        <Power className="h-4 w-4 mr-2" />
                        Enable User
                      </DropdownMenuItem>
                    )}
                    {user.approval_status === 'REJECTED' && (
                      <DropdownMenuItem onClick={() => handleApprove(user.id)} className="text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteUser(user)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {user.department_name && (
                  <div>
                    <span className="text-muted-foreground">Dept:</span>{' '}
                    <Badge variant="outline" className="text-xs ml-1">{user.department_name}</Badge>
                  </div>
                )}
                {user.vendor && (
                  <div className="truncate">
                    <span className="text-muted-foreground">Vendor:</span> {user.vendor}
                  </div>
                )}
                {user.country && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Country:</span>
                    {(() => {
                      const flagUrl = user.country_flag_svg_url || 
                        (user.country ? getCountryInfo(user.country)?.svg : null);
                      return flagUrl ? (
                        <img src={flagUrl} alt={user.country} className="h-3 w-4 object-cover rounded-sm ml-1" />
                      ) : null;
                    })()}
                    <span>{user.country}</span>
                  </div>
                )}
                {user.location && (
                  <div>
                    <span className="text-muted-foreground">Location:</span>{' '}
                    <Badge variant="outline" className="text-xs ml-1">{user.location}</Badge>
                  </div>
                )}
              </div>
              
              {(user.contract_start_date || user.contract_end_date) && (
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  {user.contract_start_date && (
                    <span>Start: {formatContractEndDate(user.contract_start_date)}</span>
                  )}
                  {user.contract_end_date && (
                    <span>End: {formatContractEndDate(user.contract_end_date)}</span>
                  )}
                </div>
              )}
              
              <div className="mt-2">
                {getApprovalBadge(user.approval_status)}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <ResponsiveTableWrapper minWidth={1200}>
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-10 py-3 px-3">
                    <Checkbox 
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className={cn(someSelected && "data-[state=checked]:bg-primary/50")}
                    />
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground w-16">RID</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Job Role</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Department</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Assignment</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Contract Start</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Contract End</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Vendor</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Resource Type</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Country</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Location</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={cn(
                      "border-b last:border-b-0 hover:bg-muted/20 transition-colors",
                      selectedIds.has(user.id) && "bg-primary/5"
                    )}
                  >
                    <td className="py-3 px-3">
                      <Checkbox 
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={(checked) => handleSelectRow(user.id, !!checked)}
                        aria-label={`Select ${user.full_name}`}
                      />
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-muted-foreground">
                      {user.rid || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditUser(user)}
                          className="h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-xs font-medium text-brand-primary hover:bg-brand-primary/30 transition-colors cursor-pointer flex-shrink-0"
                          title="Edit user"
                        >
                          {getInitials(user.full_name)}
                        </button>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{user.full_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <UserInlineCell
                        type="text"
                        value={user.job_role}
                        placeholder="-"
                        onSave={async (value) => {
                          await inlineEdit.mutateAsync({
                            userId: user.id,
                            field: 'job_role',
                            value,
                            displayValue: value,
                            hasEmail: !!user.email,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <UserInlineCell
                        type="select"
                        value={departments.find(d => d.name === user.department_name)?.id || null}
                        displayValue={user.department_name ? (
                          <Badge variant="outline" className="text-xs">{user.department_name}</Badge>
                        ) : undefined}
                        options={departmentOptions}
                        placeholder="-"
                        onSave={async (value, displayValue) => {
                          await inlineEdit.mutateAsync({
                            userId: user.id,
                            field: 'department_id',
                            value,
                            displayValue,
                            hasEmail: !!user.email,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <UserInlineCell
                        type="select"
                        value={assignments.find(a => a.name === user.assignment_name)?.id || null}
                        displayValue={user.assignment_name || undefined}
                        options={assignmentOptions}
                        placeholder="-"
                        onSave={async (value, displayValue) => {
                          await inlineEdit.mutateAsync({
                            userId: user.id,
                            field: 'assignment_id',
                            value,
                            displayValue,
                            hasEmail: !!user.email,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <UserInlineCell
                        type="date"
                        value={user.contract_start_date}
                        formatDate
                        placeholder="-"
                        onSave={async (value) => {
                          await inlineEdit.mutateAsync({
                            userId: user.id,
                            field: 'contract_start_date',
                            value,
                            displayValue: value,
                            hasEmail: !!user.email,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <UserInlineCell
                        type="date"
                        value={user.contract_end_date}
                        formatDate
                        placeholder="-"
                        onSave={async (value) => {
                          await inlineEdit.mutateAsync({
                            userId: user.id,
                            field: 'contract_end_date',
                            value,
                            displayValue: value,
                            hasEmail: !!user.email,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <UserInlineCell
                        type="select"
                        value={vendors.find(v => v.name === user.vendor)?.id || null}
                        displayValue={user.vendor || undefined}
                        options={vendorOptions}
                        placeholder="-"
                        onSave={async (value, displayValue) => {
                          await inlineEdit.mutateAsync({
                            userId: user.id,
                            field: 'vendor_id',
                            value,
                            displayValue,
                            hasEmail: !!user.email,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <UserInlineCell
                        type="select"
                        value={user.resource_type}
                        displayValue={user.resource_type ? (
                          <Badge variant="outline" className="text-xs">{user.resource_type}</Badge>
                        ) : undefined}
                        options={resourceTypeOptions}
                        placeholder="-"
                        onSave={async (value, displayValue) => {
                          await inlineEdit.mutateAsync({
                            userId: user.id,
                            field: 'resource_type',
                            value,
                            displayValue,
                            hasEmail: !!user.email,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <UserInlineCell
                        type="select"
                        value={countries.find(c => c.name === user.country)?.id || null}
                        displayValue={user.country ? (
                          <div className="flex items-center gap-1">
                            {(() => {
                              const flagUrl = user.country_flag_svg_url || getCountryInfo(user.country)?.svg;
                              return flagUrl ? (
                                <img src={flagUrl} alt={user.country} className="h-3 w-5 object-cover rounded-sm" />
                              ) : null;
                            })()}
                            <span className="text-sm">{user.country}</span>
                          </div>
                        ) : undefined}
                        options={countryOptions}
                        placeholder="-"
                        onSave={async (value, displayValue) => {
                          await inlineEdit.mutateAsync({
                            userId: user.id,
                            field: 'country_id',
                            value,
                            displayValue,
                            hasEmail: !!user.email,
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <UserInlineCell
                        type="select"
                        value={locations.find(l => l.name === user.location)?.id || null}
                        displayValue={user.location ? (
                          <Badge variant="outline" className="text-xs">{user.location}</Badge>
                        ) : undefined}
                        options={locationOptions}
                        placeholder="-"
                        onSave={async (value, displayValue) => {
                          await inlineEdit.mutateAsync({
                            userId: user.id,
                            field: 'location_id',
                            value,
                            displayValue,
                            hasEmail: !!user.email,
                          });
                        }}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.approval_status === 'PENDING_APPROVAL' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(user.id)} className="text-green-600">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(user)} className="text-red-600">
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => setEditUser(user)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            {user.approval_status === 'APPROVED' && isSuperAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setResetPasswordUser(user)}>
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            {user.approval_status === 'APPROVED' && (
                              <DropdownMenuItem onClick={() => handleDisable(user.id)}>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Disable User
                              </DropdownMenuItem>
                            )}
                            {user.approval_status === 'DISABLED' && (
                              <DropdownMenuItem onClick={() => handleApprove(user.id)}>
                                <Power className="h-4 w-4 mr-2" />
                                Enable User
                              </DropdownMenuItem>
                            )}
                            {user.approval_status === 'REJECTED' && (
                              <DropdownMenuItem onClick={() => handleApprove(user.id)} className="text-green-600">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTableWrapper>
        </div>

        {filteredUsers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No users found matching your search criteria.
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>Showing {filteredUsers.length} of {users.length} users</span>
        </div>
      </CardContent>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove <strong>{userToDelete?.full_name || userToDelete?.email}</strong> from the system? 
              This action cannot be undone and will delete all associated data including roles and permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject User Confirmation Dialog */}
      <AlertDialog open={!!userToReject} onOpenChange={(open) => !open && setUserToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject <strong>{userToReject?.full_name || userToReject?.email}</strong>? 
              They will not be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        isOpen={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        userId={resetPasswordUser?.id || null}
        userName={resetPasswordUser?.full_name || resetPasswordUser?.email || null}
      />

      {/* Edit User Drawer */}
      <EditUserDrawer
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
      />

      {/* Bulk Update Drawer */}
      <BulkUpdateDrawer
        isOpen={isBulkUpdateOpen}
        onClose={() => setIsBulkUpdateOpen(false)}
        users={users}
      />

      {/* Bulk Edit Command Bar */}
      <BulkEditCommandBar
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
        referenceData={referenceData}
      />
    </Card>
  );
}
