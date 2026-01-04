import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
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
import { Loader2, Save, X, User, Building, MapPin, Globe, Calendar } from 'lucide-react';
import { UserProfile, useUpdateUserEmail } from '@/hooks/useUsers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VENDORS, LOCATIONS, COUNTRIES, getCountryInfo } from '@/lib/countryLookup';
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

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        vendor: user.vendor || '',
        location: user.location || '',
        country: user.country || '',
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

      // Update profile fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          email: formData.email.toLowerCase().trim() || null,
          vendor: formData.vendor || null,
          location: formData.location || null,
          country: countryInfo?.name || formData.country || null,
          country_code: countryInfo?.code || null,
          country_flag_svg_url: countryInfo?.svg || null,
          contract_end_date: formData.contract_end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

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
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User
          </SheetTitle>
          <SheetDescription>
            Update profile information, roles, and metadata for {user.full_name || user.email}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
                  {VENDORS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
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
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
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
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.name}>
                      <span className="flex items-center gap-2">
                        <img src={c.svg} alt={c.name} className="h-3 w-5 object-cover rounded-sm" />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending} className="bg-brand-primary hover:bg-brand-primary-hover">
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
        </form>
      </SheetContent>
    </Sheet>
  );
}
