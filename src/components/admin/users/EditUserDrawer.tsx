import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from '@/components/ui/sheet';
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, Save, X, User, Building, MapPin, Briefcase, Check, ChevronsUpDown } from 'lucide-react';
import { UserProfile } from '@/hooks/useUsers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCountryInfo } from '@/lib/countryLookup';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EditUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export function EditUserDrawer({ isOpen, onClose, user }: EditUserDrawerProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    vendor: '',
    location: '',
    country: '',
    department: '',
    contract_start_date: '',
    contract_end_date: '',
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedJobRole, setSelectedJobRole] = useState<string>('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [roleSearchOpen, setRoleSearchOpen] = useState(false);
  
  // Track initial values for dirty checking
  const [initialFormData, setInitialFormData] = useState(formData);
  const [initialRoleIds, setInitialRoleIds] = useState<string[]>([]);
  const [initialJobRole, setInitialJobRole] = useState<string>('');
  const [initialAssignmentId, setInitialAssignmentId] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{ full_name?: string; email?: string; department?: string }>({});
  
  // Compute isDirty (avoid mutating state arrays)
  const isDirty =
    JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
    JSON.stringify([...selectedRoleIds].sort()) !== JSON.stringify([...initialRoleIds].sort()) ||
    selectedJobRole !== initialJobRole ||
    (selectedAssignmentId || '') !== (initialAssignmentId || '');

  // Fetch available roles from product_roles (for system roles)
  const { data: productRoles } = useQuery({
    queryKey: ['product-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_roles')
        .select('id, name, code')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch distinct job roles from resource_inventory (actual roles in use)
  const { data: inventoryRoles = [] } = useQuery({
    queryKey: ['inventory-job-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('role_name')
        .not('role_name', 'is', null)
        .order('role_name');
      if (error) throw error;
      // Get unique role names
      const uniqueRoles = [...new Set(data?.map(r => r.role_name).filter(Boolean) as string[])];
      return uniqueRoles.sort();
    },
  });

  // Fetch vendors from resource_vendors table with realtime subscription
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

  // Fetch locations from resource_locations table with realtime subscription
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

  // Fetch countries from resource_countries table with realtime subscription
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

  // Fetch assignments from resource_assignments table with realtime subscription
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

  // Fetch departments from capacity_departments table
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

  // Set up realtime subscriptions for all reference tables
  useEffect(() => {
    const channel = supabase
      .channel('edit-user-refs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_vendors' }, () => {
        queryClient.invalidateQueries({ queryKey: ['resource-vendors'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_locations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['resource-locations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_countries' }, () => {
        queryClient.invalidateQueries({ queryKey: ['resource-countries'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capacity_departments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-departments'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_roles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['product-roles'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_inventory' }, () => {
        queryClient.invalidateQueries({ queryKey: ['inventory-job-roles'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch user's resource_inventory record (for assignment_id + contract dates)
  const { data: userInventory } = useQuery({
    queryKey: ['user-inventory', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // If the user has an email, it's a real profile user and resource_inventory is linked by profile_id.
      // Otherwise it's an imported inventory-only row, linked by resource_inventory.id.
      const isProfileUser = !!user.email;

      const base = supabase
        .from('resource_inventory')
        .select('id, profile_id, assignment_id, contract_start_date, contract_end_date');

      const { data, error } = isProfileUser
        ? await base.eq('profile_id', user.id).maybeSingle()
        : await base.eq('id', user.id).maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      const currentYear = new Date().getFullYear();
      const isPermanent = user.vendor?.toLowerCase() === 'permanent' || user.vendor?.toLowerCase() === 'permenant';
      
      const newFormData = {
        full_name: user.full_name || '',
        email: user.email || '',
        vendor: user.vendor || '',
        location: user.location || '',
        country: user.country || '',
        department: user.department_name || '',
        contract_start_date: isPermanent 
          ? `${currentYear}-01-01` 
          : (user.contract_start_date ? format(new Date(user.contract_start_date), 'yyyy-MM-dd') : ''),
        contract_end_date: isPermanent 
          ? `${currentYear}-12-31` 
          : (user.contract_end_date ? format(new Date(user.contract_end_date), 'yyyy-MM-dd') : ''),
      };
      
      const newRoleIds = user.roles.map(r => r.role_id);
      const newJobRole = user.job_role || '';
      
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setSelectedRoleIds(newRoleIds);
      setInitialRoleIds(newRoleIds);
      setSelectedJobRole(newJobRole);
      setInitialJobRole(newJobRole);
    }
  }, [user]);

  // Set assignment from inventory data (resource_inventory.assignment_id)
  useEffect(() => {
    const nextAssignmentId = (userInventory as any)?.assignment_id || '';
    setSelectedAssignmentId(nextAssignmentId);
    setInitialAssignmentId(nextAssignmentId);
  }, [userInventory]);

  // Auto-set contract dates when vendor changes to "Permanent"
  const handleVendorChange = (value: string) => {
    const isPermanent = value.toLowerCase() === 'permanent' || value.toLowerCase() === 'permenant';
    const currentYear = new Date().getFullYear();
    
    if (isPermanent) {
      setFormData(prev => ({
        ...prev,
        vendor: value === '__none__' ? '' : value,
        contract_start_date: `${currentYear}-01-01`,
        contract_end_date: `${currentYear}-12-31`,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vendor: value === '__none__' ? '' : value,
      }));
    }
  };

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user selected');

      // Get country info for code and flag
      const countryInfo = formData.country ? getCountryInfo(formData.country) : null;
      
      // Find IDs for the selected values
      const selectedVendor = vendors.find(v => v.name === formData.vendor);
      const selectedLocation = locations.find(l => l.name === formData.location);
      const selectedCountry = countries.find(c => c.name === formData.country);
      const selectedDepartment = departments.find(d => d.name === formData.department);
      
      // Use the selected job role directly (from searchable listbox)
      const jobRoleName = selectedJobRole || null;

      // Determine whether this row is a real profile user or an imported (resource_inventory-only) user.
      // Imported users appear in the list with user.id = resource_inventory.id.
      const { data: profileRow, error: profileLookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileLookupError) throw profileLookupError;

      if (profileRow?.id) {
        // Update profile fields (and ensure an actual row was updated)
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name || null,
            email: formData.email.toLowerCase().trim() || null,
            vendor: formData.vendor || null,
            location: formData.location || null,
            country: countryInfo?.name || formData.country || null,
            country_code: countryInfo?.code || selectedCountry?.code || null,
            country_flag_svg_url: countryInfo?.svg || null,
            contract_start_date: formData.contract_start_date || null,
            contract_end_date: formData.contract_end_date || null,
            department_id: selectedDepartment?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select('id')
          .maybeSingle();

        if (profileError) throw profileError;
        if (!updatedProfile?.id) {
          throw new Error('Profile not found or you do not have permission to update it.');
        }

        // Update or create resource_inventory record (linked by profile_id)
        const { data: inventoryRecord, error: inventoryLookupError } = await supabase
          .from('resource_inventory')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (inventoryLookupError) throw inventoryLookupError;

          if (inventoryRecord?.id) {
            // Update existing record
            const { data: updatedInventory, error: inventoryError } = await supabase
              .from('resource_inventory')
              .update({
                name: formData.full_name || null,
                vendor_id: selectedVendor?.id || null,
                vendor_name: formData.vendor || null,
                location_id: selectedLocation?.id || null,
                country_id: selectedCountry?.id || null,
                department_id: selectedDepartment?.id || null,
                department_name: selectedDepartment?.name || null,
                role_name: jobRoleName,
                assignment_id: selectedAssignmentId || null,
                contract_start_date: formData.contract_start_date || null,
                contract_end_date: formData.contract_end_date || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', inventoryRecord.id)
              .select('id')
              .maybeSingle();

          if (inventoryError) throw inventoryError;
          if (!updatedInventory?.id) {
            throw new Error('Resource inventory record not found or you do not have permission to update it.');
          }
        } else {
          // Create new resource_inventory record for this user
          const { error: insertError } = await supabase.from('resource_inventory').insert({
            profile_id: user.id,
            name: formData.full_name || null,
            vendor_id: selectedVendor?.id || null,
            vendor_name: formData.vendor || null,
            location_id: selectedLocation?.id || null,
            country_id: selectedCountry?.id || null,
            department_id: selectedDepartment?.id || null,
            department_name: selectedDepartment?.name || null,
            role_name: jobRoleName,
            assignment_id: selectedAssignmentId || null,
            contract_start_date: formData.contract_start_date || null,
            contract_end_date: formData.contract_end_date || null,
            is_active: true,
          });

          if (insertError) throw insertError;
        }

        // Update roles - delete existing and insert new
        const { error: deleteRolesError } = await supabase
          .from('user_product_roles')
          .delete()
          .eq('user_id', user.id);

        if (deleteRolesError) throw deleteRolesError;

        if (selectedRoleIds.length > 0) {
          const roleInserts = selectedRoleIds.map((roleId) => ({
            user_id: user.id,
            role_id: roleId,
            business_lines: [],
          }));

          const { error: insertRolesError } = await supabase
            .from('user_product_roles')
            .insert(roleInserts);

          if (insertRolesError) throw insertRolesError;
        }
      } else {
        // Imported / inventory-only user: update the resource_inventory row directly.
        const { data: updatedInventoryOnly, error: inventoryOnlyUpdateError } = await supabase
          .from('resource_inventory')
          .update({
            name: formData.full_name || null,
            vendor_id: selectedVendor?.id || null,
            vendor_name: formData.vendor || null,
            location_id: selectedLocation?.id || null,
            country_id: selectedCountry?.id || null,
            department_id: selectedDepartment?.id || null,
            department_name: selectedDepartment?.name || null,
            role_name: jobRoleName,
            assignment_id: selectedAssignmentId || null,
            contract_start_date: formData.contract_start_date || null,
            contract_end_date: formData.contract_end_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select('id')
          .maybeSingle();

        if (inventoryOnlyUpdateError) throw inventoryOnlyUpdateError;
        if (!updatedInventoryOnly?.id) {
          throw new Error('Resource inventory record not found or you do not have permission to update it.');
        }
      }

      // Log the update with detailed field changes
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Compute changed fields diff
      const changedFields: string[] = [];
      if (formData.full_name !== initialFormData.full_name) changedFields.push('full_name');
      if (formData.email !== initialFormData.email) changedFields.push('email');
      if (formData.vendor !== initialFormData.vendor) changedFields.push('vendor');
      if (formData.location !== initialFormData.location) changedFields.push('location');
      if (formData.country !== initialFormData.country) changedFields.push('country');
      if (formData.department !== initialFormData.department) changedFields.push('department');
      if (formData.contract_start_date !== initialFormData.contract_start_date) changedFields.push('contract_start_date');
      if (formData.contract_end_date !== initialFormData.contract_end_date) changedFields.push('contract_end_date');
      if (JSON.stringify([...selectedRoleIds].sort()) !== JSON.stringify([...initialRoleIds].sort())) changedFields.push('roles');
      if ((selectedAssignmentId || '') !== (initialAssignmentId || '')) changedFields.push('assignment');
      
      if (changedFields.length > 0) {
        await supabase.from('auth_audit_log').insert({
          user_id: user.id,
          event_type: 'user_profile_updated',
          actor_id: currentUser?.id,
          event_details: { 
            route: '/admin/users',
            fields_updated: changedFields,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        });
      }

      return true;
    },
    onSuccess: () => {
      // Build updated roles array for cache
      const updatedRoles = selectedRoleIds.map(roleId => {
        const role = productRoles?.find(r => r.id === roleId);
        return {
          id: roleId,
          role_id: roleId,
          role_name: role?.name || '',
          role_code: role?.code || '',
          business_lines: [],
        };
      });

      // Update cached list immediately so the table reflects the change without waiting for a full refetch
      queryClient.setQueryData(['users-list'], (prev: unknown) => {
        if (!Array.isArray(prev)) return prev;

        const updatedUserId = user?.id;
        if (!updatedUserId) return prev;

        // Resolve department name
        const selectedDepartment = departments.find(d => d.name === formData.department);
        const updatedDepartmentName = selectedDepartment?.name || null;

        // Resolve assignment name
        const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);
        const updatedAssignmentName = selectedAssignment?.name || null;

        // Use the selected job role directly
        const updatedJobRole = selectedJobRole || null;

        return (prev as UserProfile[]).map((u) =>
          u.id === updatedUserId
            ? {
                ...u,
                full_name: formData.full_name || null,
                email: formData.email.toLowerCase().trim() || null,
                vendor: formData.vendor || null,
                location: formData.location || null,
                country: formData.country || null,
                contract_start_date: formData.contract_start_date || null,
                contract_end_date: formData.contract_end_date || null,
                department_name: updatedDepartmentName,
                assignment_name: updatedAssignmentName,
                job_role: updatedJobRole,
                roles: updatedRoles,
              }
            : u
        );
      });

      // Invalidate ALL resource-related caches for full consistency across views
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      queryClient.invalidateQueries({ queryKey: ['user-inventory', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['resource-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });

      setInitialFormData(formData);
      setInitialRoleIds(selectedRoleIds);
      setInitialAssignmentId(selectedAssignmentId || '');
      setFieldErrors({});

      toast.success('User updated successfully');
      onClose();
    },
    onError: (error) => {
      console.error('Failed to update user:', error);

      const err: any = error;
      const code: string | undefined = err?.code;
      const message: string = err?.message || (error as Error)?.message || 'Unknown error';

      // Field-level mapping for common DB errors
      if (code === '23505') {
        // Unique constraint violations
        if (message.includes('profiles_email_key')) {
          setFieldErrors((prev) => ({ ...prev, email: 'Email is already in use.' }));
        }
        if (message.includes('resource_inventory_name_key')) {
          setFieldErrors((prev) => ({ ...prev, full_name: 'Name already exists.' }));
        }
      }

      if (message.includes('permission') || message.includes('policy') || message.includes('RLS')) {
        toast.error('Permission denied: You do not have access to update this user.');
        return;
      }

      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const email = formData.email.trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setFieldErrors({ email: 'Enter a valid email address.' });
      toast.error('Enter a valid email address.');
      return;
    }

    updateUser.mutate();
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent width="medium">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User
          </SheetTitle>
          <SheetDescription>
            Update profile information, roles, and metadata for {user.full_name || user.email}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  aria-invalid={!!fieldErrors.full_name}
                  className={fieldErrors.full_name ? 'border-destructive focus-visible:ring-destructive' : ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, full_name: e.target.value }));
                    if (fieldErrors.full_name) setFieldErrors((prev) => ({ ...prev, full_name: undefined }));
                  }}
                  placeholder="Enter full name"
                />
                {fieldErrors.full_name ? (
                  <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  aria-invalid={!!fieldErrors.email}
                  className={fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="Enter email address"
                />
                {fieldErrors.email ? (
                  <p className="text-xs text-destructive">{fieldErrors.email}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department || '__none__'}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, department: value === '__none__' ? '' : value }));
                    if (fieldErrors.department) setFieldErrors((prev) => ({ ...prev, department: undefined }));
                  }}
                >
                  <SelectTrigger className={fieldErrors.department ? 'border-destructive focus-visible:ring-destructive' : ''}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.department ? (
                  <p className="text-xs text-destructive">{fieldErrors.department}</p>
                ) : null}
              </div>
            </div>

            <Separator />

            {/* Job Role Section - syncs to user list via searchable combobox */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Job Role
              </h3>
              <Popover open={roleSearchOpen} onOpenChange={setRoleSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={roleSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedJobRole || "Select job role..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search job roles..." />
                    <CommandList>
                      <CommandEmpty>No role found.</CommandEmpty>
                      <CommandGroup heading="Roles in Use">
                        {inventoryRoles.map((role) => (
                          <CommandItem
                            key={role}
                            value={role}
                            onSelect={(currentValue) => {
                              setSelectedJobRole(currentValue === selectedJobRole ? '' : currentValue);
                              setRoleSearchOpen(false);
                            }}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  selectedJobRole === role ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{role}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">In Use</Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {productRoles && productRoles.length > 0 && (
                        <CommandGroup heading="System Roles">
                          {productRoles
                            .filter(pr => !inventoryRoles.includes(pr.name))
                            .map((role) => (
                              <CommandItem
                                key={role.id}
                                value={role.name}
                                onSelect={(currentValue) => {
                                  setSelectedJobRole(currentValue === selectedJobRole ? '' : currentValue);
                                  setRoleSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedJobRole === role.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {role.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedJobRole && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">{selectedJobRole}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setSelectedJobRole('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Vendor/Contract Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building className="h-4 w-4" />
                Vendor & Contract
              </h3>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Select
                  value={formData.vendor || '__none__'}
                  onValueChange={handleVendorChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_start_date">Contract Start Date</Label>
                  <Input
                    id="contract_start_date"
                    type="date"
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_end_date">Contract End Date</Label>
                  <Input
                    id="contract_end_date"
                    type="date"
                    value={formData.contract_end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_end_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Assignment Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Assignment
              </h3>

              <div className="space-y-2">
                <Label htmlFor="assignment">Assignment</Label>
                <Select
                  value={selectedAssignmentId || '__none__'}
                  onValueChange={(value) => setSelectedAssignmentId(value === '__none__' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Location Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h3>

              <div className="space-y-2">
                <Label htmlFor="location">Work Location</Label>
                <Select
                  value={formData.location || '__none__'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, location: value === '__none__' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country || '__none__'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, country: value === '__none__' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not specified</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </SheetBody>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="edit-user-form"
            disabled={updateUser.isPending || !isDirty} 
            className="bg-brand-primary hover:bg-brand-primary-hover"
          >
            {updateUser.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
