/**
 * Real-time hook for resource profile data with contract status calculations
 * Integrates with /admin/users data for contract, location, and country info
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';

export interface ResourceProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url?: string | null;
  country?: string | null;
  country_code?: string | null;
  country_flag_svg_url?: string | null;
  location?: string | null;
  contract_end_date?: string | null;
  vendor?: string | null;
  department_id?: string | null;
}

export interface ContractStatus {
  status: 'healthy' | 'warning' | 'critical' | 'expired' | 'permanent';
  daysRemaining: number | null;
  color: string;
  ringColor: string;
  bgColor: string;
  label: string;
  textColor: string;
}

// Calculate contract status based on days remaining
export function getContractStatus(endDate: string | null | undefined): ContractStatus {
  if (!endDate) {
    return {
      status: 'permanent',
      daysRemaining: null,
      color: 'hsl(var(--muted-foreground))',
      ringColor: 'ring-muted-foreground/50',
      bgColor: 'bg-muted',
      textColor: 'text-muted-foreground',
      label: 'Permanent'
    };
  }

  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      status: 'expired',
      daysRemaining: 0,
      color: 'hsl(var(--muted-foreground))',
      ringColor: 'ring-muted-foreground/50',
      bgColor: 'bg-muted',
      textColor: 'text-muted-foreground',
      label: 'Expired'
    };
  }

  if (daysRemaining < 30) {
    return {
      status: 'critical',
      daysRemaining,
      color: '#be123c', // Rose - matches Catalyst danger
      ringColor: 'ring-[#be123c]',
      bgColor: 'bg-red-50',
      textColor: 'text-[#be123c]',
      label: `${daysRemaining}d`
    };
  }

  if (daysRemaining < 60) {
    return {
      status: 'warning',
      daysRemaining,
      color: '#ca8a04', // Gold/Amber - matches Catalyst warning
      ringColor: 'ring-[#ca8a04]',
      bgColor: 'bg-amber-50',
      textColor: 'text-[#ca8a04]',
      label: `${daysRemaining}d`
    };
  }

  return {
    status: 'healthy',
    daysRemaining,
    color: '#0d9488', // Teal - matches Catalyst success
    ringColor: 'ring-[#0d9488]',
    bgColor: 'bg-teal-50',
    textColor: 'text-[#0d9488]',
    label: `${daysRemaining}d`
  };
}

// Get flag emoji from country code
export function getFlagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode) return '🏳️';
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

// Format date for display
export function formatContractDate(date: string | null | undefined): string {
  if (!date) return 'No Limit';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Get initials from full name
export function getInitials(fullName: string | null): string {
  if (!fullName) return '??';
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return fullName.substring(0, 2).toUpperCase();
}

// Main hook for fetching resource profiles
export function useResourceProfiles() {
  const queryClient = useQueryClient();

  const { data: profiles = new Map<string, ResourceProfile>(), isLoading, error, refetch } = useQuery({
    queryKey: ['resource-profiles'],
    queryFn: async () => {
      // Fetch profiles and roles in parallel
      const [profilesResult, userProductRolesResult, productRolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, role, avatar_url, country, country_code, country_flag_svg_url, location, contract_end_date, vendor, department_id'),
        supabase
          .from('user_product_roles')
          .select('user_id, role_id'),
        supabase
          .from('product_roles')
          .select('id, name'),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      // Build role lookup maps from user_product_roles (authoritative source from /admin/users)
      const roleIdToName = new Map<string, string>(
        (productRolesResult.data || []).map((r) => [r.id, r.name])
      );
      const userRoleMap = new Map<string, string>();
      (userProductRolesResult.data || []).forEach((upr) => {
        const roleName = roleIdToName.get(upr.role_id);
        if (roleName && !userRoleMap.has(upr.user_id)) {
          userRoleMap.set(upr.user_id, roleName);
        }
      });

      const profileMap = new Map<string, ResourceProfile>();
      profilesResult.data?.forEach(profile => {
        // Override deprecated profile.role with role from user_product_roles
        const roleFromAdmin = userRoleMap.get(profile.id) || profile.role;
        profileMap.set(profile.id, {
          ...profile,
          role: roleFromAdmin,
        });
      });

      return profileMap;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('profiles-realtime-capacity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile change received:', payload.eventType);
          
          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey: ['resource-profiles'] });
          queryClient.invalidateQueries({ queryKey: ['capacity-heatmap-resources'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Get profile by ID with computed contract status
  const getProfile = useCallback((id: string) => {
    const profile = profiles.get(id);
    if (!profile) return null;

    return {
      ...profile,
      contractStatus: getContractStatus(profile.contract_end_date),
      flag: profile.country_flag_svg_url || getFlagEmoji(profile.country_code),
      formattedContractDate: formatContractDate(profile.contract_end_date),
      initials: getInitials(profile.full_name),
    };
  }, [profiles]);

  return {
    profiles,
    isLoading,
    error,
    getProfile,
    refetch
  };
}

// Hook for enhanced profile data (extends the base profile with computed fields)
export interface EnhancedResourceProfile extends ResourceProfile {
  contractStatus: ContractStatus;
  flag: string;
  formattedContractDate: string;
  initials: string;
}

export function useEnhancedProfile(profileId: string): EnhancedResourceProfile | null {
  const { getProfile } = useResourceProfiles();
  return getProfile(profileId);
}
