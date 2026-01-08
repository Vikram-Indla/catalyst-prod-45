import { useState, useEffect } from 'react';
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
import { Loader2, Save, X, User, Building, MapPin, Briefcase } from 'lucide-react';
import { UserProfile } from '@/hooks/useUsers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCountryInfo } from '@/lib/countryLookup';
import { format } from 'date-fns';

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
    assignment: '',
    contract_end_date: '',
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // Fetch available roles
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        vendor: user.vendor || '',
        location: user.location || '',
        country: user.country || '',
        assignment: user.assignment_name || '',
        contract_end_date: user.contract_end_date ? format(new Date(user.contract_end_date), 'yyyy-MM-dd') : '',
      });
      setSelectedRoleIds(user.roles.map(r => r.role_id));
    }
  }, [user]);

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
      const selectedAssignment = assignments.find(a => a.name === formData.assignment);

      // Update profile fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          email: formData.email.toLowerCase().trim() || null,
          vendor: formData.vendor || null,
          location: formData.location || null,
          country: countryInfo?.name || formData.country || null,
          country_code: countryInfo?.code || selectedCountry?.code || null,
          country_flag_svg_url: countryInfo?.svg || null,
          contract_end_date: formData.contract_end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;
      
      // Update resource_inventory if the user has a linked record
      const { data: inventoryRecord } = await supabase
        .from('resource_inventory')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();
      
      if (inventoryRecord) {
        const { error: inventoryError } = await supabase
          .from('resource_inventory')
          .update({
            vendor_id: selectedVendor?.id || null,
            vendor_name: formData.vendor || null,
            location_id: selectedLocation?.id || null,
            country_id: selectedCountry?.id || null,
            assignment_id: selectedAssignment?.id || null,
            contract_end_date: formData.contract_end_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', inventoryRecord.id);
        
        if (inventoryError) throw inventoryError;
      }

      // Update roles - delete existing and insert new
      const { error: deleteRolesError } = await supabase
        .from('user_product_roles')
        .delete()
        .eq('user_id', user.id);

      if (deleteRolesError) throw deleteRolesError;

      if (selectedRoleIds.length > 0) {
        const roleInserts = selectedRoleIds.map(roleId => ({
          user_id: user.id,
          role_id: roleId,
          business_lines: [],
        }));

        const { error: insertRolesError } = await supabase
          .from('user_product_roles')
          .insert(roleInserts);

        if (insertRolesError) throw insertRolesError;
      }

      // Log the update
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase.from('auth_audit_log').insert({
        user_id: user.id,
        event_type: 'user_profile_updated',
        actor_id: currentUser?.id,
        event_details: { fields_updated: Object.keys(formData) },
        created_at: new Date().toISOString(),
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('User updated successfully');
      onClose();
    },
    onError: (error) => {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user: ' + (error as Error).message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <Separator />

            {/* Roles Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Roles
              </h3>
              <div className="flex flex-wrap gap-2">
                {productRoles?.map((role) => (
                  <Badge
                    key={role.id}
                    variant={selectedRoleIds.includes(role.id) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleRole(role.id)}
                  >
                    {selectedRoleIds.includes(role.id) && '✓ '}
                    {role.name}
                  </Badge>
                ))}
              </div>
              {selectedRoleIds.length === 0 && (
                <p className="text-xs text-muted-foreground">Click on a role to assign it</p>
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
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vendor: value === '__none__' ? '' : value }))}
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
                  value={formData.assignment || '__none__'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, assignment: value === '__none__' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not assigned</SelectItem>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
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
            disabled={updateUser.isPending} 
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
