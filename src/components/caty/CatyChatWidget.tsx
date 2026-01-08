import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCw, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatyOrb } from './CatyOrb';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface DepartmentStats {
  id: string;
  name: string;
  shortName: string;
  count: number;
  critical: number;
  warning: number;
  color: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CapacityStats {
  total: number;
  critical: number;
  warning: number;
  departments: DepartmentStats[];
}

// Department colors
const DEPT_COLORS: Record<string, string> = {
  'Delivery': '#2563eb',
  'Product': '#7c3aed',
  'Operations': '#ea580c',
  'Technical Support': '#0d9488',
};

// Helper to format date
const formatContractDate = (dateStr: string | null) => {
  if (!dateStr) return 'No date set';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function CatyChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [stats, setStats] = useState<CapacityStats>({ total: 0, critical: 0, warning: 0, departments: [] });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Fetch capacity stats from database - aligned with /admin/users data source
  // IMPORTANT: Use resource_inventory as the source of truth (72 resources), NOT profiles (37)
  const fetchCapacityStats = useCallback(async () => {
    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const ninetyDays = new Date(now);
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    // Fetch resource_inventory - this is the authoritative source for /admin/users
    const { data: resourceInventory } = await supabase
      .from('resource_inventory')
      .select('id, profile_id, department_id, contract_start_date, contract_end_date, vendor_id');

    // Fetch departments
    const { data: departments } = await supabase
      .from('capacity_departments')
      .select('id, name')
      .order('sort_order');

    if (!resourceInventory || !departments) return;

    // Calculate stats from resource_inventory (source of truth)
    let critical = 0;
    let warning = 0;
    const deptStats: Record<string, { count: number; critical: number; warning: number }> = {};

    // Initialize department stats
    departments.forEach(d => {
      deptStats[d.id] = { count: 0, critical: 0, warning: 0 };
    });

    resourceInventory.forEach(r => {
      // Count by department
      if (r.department_id && deptStats[r.department_id]) {
        deptStats[r.department_id].count++;
      }

      // Check contract end dates (future-looking windows)
      if (r.contract_end_date) {
        const endDate = new Date(r.contract_end_date);
        if (endDate >= now && endDate <= thirtyDays) {
          critical++;
          if (r.department_id && deptStats[r.department_id]) {
            deptStats[r.department_id].critical++;
          }
        } else if (endDate > thirtyDays && endDate <= ninetyDays) {
          warning++;
          if (r.department_id && deptStats[r.department_id]) {
            deptStats[r.department_id].warning++;
          }
        }
      }
    });

    const departmentList: DepartmentStats[] = departments.map(d => ({
      id: d.id,
      name: d.name,
      shortName: d.name.charAt(0),
      count: deptStats[d.id]?.count || 0,
      critical: deptStats[d.id]?.critical || 0,
      warning: deptStats[d.id]?.warning || 0,
      color: DEPT_COLORS[d.name] || '#6b7280',
    }));

    setStats({
      total: resourceInventory.length, // Use resource_inventory count (72), not profiles (37)
      critical,
      warning,
      departments: departmentList,
    });
  }, []);

  // Initial fetch and real-time subscription to both profiles AND resource_inventory
  useEffect(() => {
    fetchCapacityStats();

    // Subscribe to real-time changes on profiles AND resource_inventory tables
    const channel = supabase
      .channel('caty-capacity-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchCapacityStats();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resource_inventory' },
        () => {
          fetchCapacityStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCapacityStats]);

  // Fetch user profile for first name
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get user's first name
  const getUserFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'there';
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const suggestions = [
    "Whose contract is expiring this month?",
    "Show critical resources",
    "Contract renewals"
  ];

  // Query database for response - async
  const generateResponseAsync = async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase();
    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const ninetyDays = new Date(now);
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    // Helper: Fetch merged resource data (profiles + resource_inventory) - same logic as /admin/users
    const fetchMergedResources = async (filter?: { nameSearch?: string; limit?: number }) => {
      let profilesQuery = supabase
        .from('profiles')
        .select('id, full_name, vendor, contract_end_date, contract_start_date, department_id, country, location');

      if (filter?.nameSearch) {
        profilesQuery = profilesQuery.ilike('full_name', `%${filter.nameSearch}%`);
      }
      if (filter?.limit) {
        profilesQuery = profilesQuery.limit(filter.limit);
      }

      const [{ data: profiles }, { data: resourceInventory }, { data: resourceVendors }] = await Promise.all([
        profilesQuery,
        supabase
          .from('resource_inventory')
          .select('profile_id, contract_start_date, contract_end_date, vendor_id, vendor_name, role_name'),
        supabase.from('resource_vendors').select('id, name').eq('is_active', true),
      ]);

      const vendorMap = new Map((resourceVendors || []).map((v) => [v.id, v.name]));

      const inventoryByProfileId = new Map(
        (resourceInventory || [])
          .filter(
            (r): r is typeof r & { profile_id: string } =>
              typeof r.profile_id === 'string' && r.profile_id.length > 0
          )
          .map((r) => {
            const resolvedVendorName = r.vendor_id ? vendorMap.get(r.vendor_id) || r.vendor_name : r.vendor_name;
            return [r.profile_id, { ...r, resolvedVendorName }];
          })
      );

      return (profiles || []).map((p) => {
        const inventory = inventoryByProfileId.get(p.id);
        return {
          ...p,
          // resource_inventory takes precedence (authoritative source)
          contract_start_date: inventory?.contract_start_date || p.contract_start_date,
          contract_end_date: inventory?.contract_end_date || p.contract_end_date,
          vendor: inventory?.resolvedVendorName || p.vendor,
          role_name: inventory?.role_name || null,
        };
      });
    };

    // Extract person name from various query patterns
    const extractName = (q: string): string | null => {
      // Pattern: "Which country [Name] is from?" or "Where is [Name] from?"
      const countryPattern = q.match(/(?:which country|where)\s+(?:is\s+)?(.+?)\s+(?:is\s+)?from/i);
      if (countryPattern) return countryPattern[1].trim();
      
      // Pattern: "When is [Name]'s contract expiring?"
      const contractPattern = q.match(/(?:when is|what about|show me|find|search|tell me about)\s+(.+?)(?:'s)?\s*(?:contract|expir|ending|status)?/i);
      if (contractPattern) return contractPattern[1].trim();
      
      // Pattern: "[Name]'s contract" or just "[Name]"
      const possessivePattern = q.match(/^(.+?)'s\s+/i);
      if (possessivePattern) return possessivePattern[1].trim();
      
      return null;
    };

    // Check if query is about country/location
    const isCountryQuery = lowerQuery.includes('country') || lowerQuery.includes('where') && lowerQuery.includes('from');
    
    // Check if query is about contract
    const isContractQuery = lowerQuery.includes('contract') || lowerQuery.includes('expir') || lowerQuery.includes('ending');
    
    // Check if query is about role
    const isRoleQuery = lowerQuery.includes('role') || lowerQuery.includes('position') || lowerQuery.includes('job');

    const searchName = extractName(query);
    
    if (searchName && searchName.length >= 2) {
      const personResults = await fetchMergedResources({ nameSearch: searchName, limit: 5 });
      
      if (personResults.length > 0) {
        // If asking about country specifically
        if (isCountryQuery) {
          if (personResults.length === 1) {
            const p = personResults[0];
            return `**${p.full_name}** is from **${p.country || 'Unknown country'}**${p.location ? ` (${p.location})` : ''}.`;
          } else {
            return `**Found ${personResults.length} people matching "${searchName}":**\n\n${personResults.map(p => 
              `• **${p.full_name}** — ${p.country || 'Unknown country'}${p.location ? ` (${p.location})` : ''}`
            ).join('\n')}`;
          }
        }
        
        // If asking about role specifically
        if (isRoleQuery) {
          if (personResults.length === 1) {
            const p = personResults[0];
            return `**${p.full_name}**'s role is **${p.role_name || 'Not assigned'}**.`;
          } else {
            return `**Found ${personResults.length} people matching "${searchName}":**\n\n${personResults.map(p => 
              `• **${p.full_name}** — ${p.role_name || 'No role'}`
            ).join('\n')}`;
          }
        }
        
        // If asking about contract specifically
        if (isContractQuery || personResults.length === 1) {
          if (personResults.length === 1) {
            const p = personResults[0];
            const endDate = p.contract_end_date ? formatContractDate(p.contract_end_date) : 'Not set';
            return `**${p.full_name}**\n\n• **Vendor:** ${p.vendor || 'N/A'}\n• **Role:** ${p.role_name || 'N/A'}\n• **Contract End Date:** ${endDate}\n• **Contract Start Date:** ${p.contract_start_date ? formatContractDate(p.contract_start_date) : 'N/A'}`;
          } else {
            return `**Found ${personResults.length} people matching "${searchName}":**\n\n${personResults.map(p => 
              `• **${p.full_name}** (${p.vendor || 'N/A'}) — Contract ends ${p.contract_end_date ? formatContractDate(p.contract_end_date) : 'Not set'}`
            ).join('\n')}`;
          }
        }
        
        // General person info
        if (personResults.length === 1) {
          const p = personResults[0];
          return `**${p.full_name}**\n\n• **Vendor:** ${p.vendor || 'N/A'}\n• **Role:** ${p.role_name || 'N/A'}\n• **Country:** ${p.country || 'N/A'}\n• **Contract End:** ${p.contract_end_date ? formatContractDate(p.contract_end_date) : 'Not set'}`;
        } else {
          return `**Found ${personResults.length} people matching "${searchName}":**\n\n${personResults.map(p => 
            `• **${p.full_name}** (${p.vendor || 'N/A'}) — ${p.role_name || 'N/A'}`
          ).join('\n')}`;
        }
      }
    }
    
    // Critical resources query - use resource_inventory as source of truth
    if (lowerQuery.includes('critical')) {
      const { data: criticalResources } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, contract_end_date, vendor_id, vendor_name, role_name, department_id, capacity_departments(name)')
        .lte('contract_end_date', thirtyDays.toISOString())
        .gte('contract_end_date', now.toISOString())
        .not('contract_end_date', 'is', null)
        .order('contract_end_date', { ascending: true })
        .limit(15);
      
      if (criticalResources && criticalResources.length > 0) {
        const profileIds = criticalResources
          .map(r => r.profile_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);

        const profiles = profileIds.length
          ? (
              await supabase
                .from('profiles')
                .select('id, full_name, vendor')
                .in('id', profileIds)
            ).data
          : [];

        const { data: resourceVendors } = await supabase
          .from('resource_vendors')
          .select('id, name');

        const profileMap = new Map((profiles || []).map(p => [p.id, { name: p.full_name, vendor: p.vendor }]));
        const vendorMap = new Map((resourceVendors || []).map(v => [v.id, v.name]));

        const getDisplayName = (r: any) => {
          if (r.profile_id && profileMap.get(r.profile_id)?.name) {
            return profileMap.get(r.profile_id)!.name as string;
          }
          if (r.name && r.name.trim() !== '') {
            return r.name;
          }
          if (r.role_name && r.role_name.trim() !== '') {
            return r.role_name;
          }
          return `Resource ${String(r.id).slice(0, 8)}`;
        };

        const getVendorLabel = (r: any) => {
          const byId = r.vendor_id ? vendorMap.get(r.vendor_id) : null;
          if (byId) return byId;
          if (r.vendor_name) return r.vendor_name;
          const profileVendor = r.profile_id ? profileMap.get(r.profile_id)?.vendor : null;
          if (profileVendor) return profileVendor;
          return 'N/A';
        };
        
        return `**${criticalResources.length} Critical Resources (ending within 30 days):**\n\n${criticalResources.map(r => 
          `• **${getDisplayName(r)}** (${getVendorLabel(r)}) — ${formatContractDate(r.contract_end_date)}`
        ).join('\n')}`;
      }
      return `**No critical resources found** (contracts ending within 30 days)`;
    }
    
    // Warning resources query - use resource_inventory as source of truth
    if (lowerQuery.includes('warning')) {
      const { data: warningResources } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, contract_end_date, vendor_id, vendor_name, role_name, department_id, capacity_departments(name)')
        .gt('contract_end_date', thirtyDays.toISOString())
        .lte('contract_end_date', ninetyDays.toISOString())
        .order('contract_end_date', { ascending: true })
        .limit(15);
      
      if (warningResources && warningResources.length > 0) {
        const profileIds = warningResources
          .map(r => r.profile_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);

        const profiles = profileIds.length
          ? (
              await supabase
                .from('profiles')
                .select('id, full_name, vendor')
                .in('id', profileIds)
            ).data
          : [];

        const { data: resourceVendors } = await supabase
          .from('resource_vendors')
          .select('id, name');

        const profileMap = new Map((profiles || []).map(p => [p.id, { name: p.full_name, vendor: p.vendor }]));
        const vendorMap = new Map((resourceVendors || []).map(v => [v.id, v.name]));

        const getDisplayName = (r: any) => {
          if (r.profile_id && profileMap.get(r.profile_id)?.name) {
            return profileMap.get(r.profile_id)!.name as string;
          }
          if (r.name && r.name.trim() !== '') {
            return r.name;
          }
          if (r.role_name && r.role_name.trim() !== '') {
            return r.role_name;
          }
          return `Resource ${String(r.id).slice(0, 8)}`;
        };

        const getVendorLabel = (r: any) => {
          const byId = r.vendor_id ? vendorMap.get(r.vendor_id) : null;
          if (byId) return byId;
          if (r.vendor_name) return r.vendor_name;
          const profileVendor = r.profile_id ? profileMap.get(r.profile_id)?.vendor : null;
          if (profileVendor) return profileVendor;
          return 'N/A';
        };
        
        return `**${warningResources.length} Warning Resources (ending in 30-90 days):**\n\n${warningResources.map(r => 
          `• **${getDisplayName(r)}** (${getVendorLabel(r)}) — ${formatContractDate(r.contract_end_date)}`
        ).join('\n')}`;
      }
      return `**No warning resources found** (contracts ending in 30-90 days)`;
    }
    
    // This month query - use resource_inventory as source of truth
    if (lowerQuery.includes('expiring this month') || lowerQuery.includes('this month')) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const { data: monthResources } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name, contract_end_date, vendor_id, vendor_name, role_name, department_id, capacity_departments(name)')
        .gte('contract_end_date', startOfMonth.toISOString())
        .lte('contract_end_date', endOfMonth.toISOString())
        .order('contract_end_date', { ascending: true });
      
      const monthName = now.toLocaleDateString('en-US', { month: 'long' });
      if (monthResources && monthResources.length > 0) {
        const profileIds = monthResources
          .map(r => r.profile_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);

        const profiles = profileIds.length
          ? (
              await supabase
                .from('profiles')
                .select('id, full_name, vendor')
                .in('id', profileIds)
            ).data
          : [];

        const { data: resourceVendors } = await supabase
          .from('resource_vendors')
          .select('id, name');

        const profileMap = new Map((profiles || []).map(p => [p.id, { name: p.full_name, vendor: p.vendor }]));
        const vendorMap = new Map((resourceVendors || []).map(v => [v.id, v.name]));

        const getDisplayName = (r: any) => {
          if (r.profile_id && profileMap.get(r.profile_id)?.name) {
            return profileMap.get(r.profile_id)!.name as string;
          }
          if (r.name && r.name.trim() !== '') {
            return r.name;
          }
          if (r.role_name && r.role_name.trim() !== '') {
            return r.role_name;
          }
          return `Resource ${String(r.id).slice(0, 8)}`;
        };

        const getVendorLabel = (r: any) => {
          const byId = r.vendor_id ? vendorMap.get(r.vendor_id) : null;
          if (byId) return byId;
          if (r.vendor_name) return r.vendor_name;
          const profileVendor = r.profile_id ? profileMap.get(r.profile_id)?.vendor : null;
          if (profileVendor) return profileVendor;
          return 'N/A';
        };
        
        return `**Contracts expiring this month (${monthName}):**\n\n${monthResources.map(r => 
          `• **${getDisplayName(r)}** (${getVendorLabel(r)}) — ${formatContractDate(r.contract_end_date)}`
        ).join('\n')}`;
      }
      return `**No contracts expiring this month (${monthName})**`;
    }
    
    // Total/all resources
    if (lowerQuery.includes('total') || lowerQuery.includes('all resources') || lowerQuery.includes('breakdown')) {
      return `**Total Resources: ${stats.total}**\n\n**By Department:**\n${stats.departments.map(d => `• **${d.name}**: ${d.count} resources (${d.critical} critical, ${d.warning} warning)`).join('\n')}`;
    }
    
    // Available/healthy resources
    if (lowerQuery.includes('available') || lowerQuery.includes('healthy')) {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('contract_end_date', ninetyDays.toISOString());
      
      return `**Available Resources:**\n\nCurrently, there are **${count || 0} healthy** resources with contracts extending beyond 90 days.\n\n**By Department:**\n${stats.departments.map(d => `• **${d.name}**: ${d.count - d.critical - d.warning} available`).join('\n')}`;
    }
    
    // Renewals
    if (lowerQuery.includes('renewal')) {
      const merged = await fetchMergedResources();

      const renewalResults = (merged || [])
        .filter((r) => {
          if (!r.contract_end_date) return false;
          const end = new Date(r.contract_end_date);
          return end >= now && end <= ninetyDays;
        })
        .sort((a, b) => {
          const aEnd = a.contract_end_date ? new Date(a.contract_end_date).getTime() : 0;
          const bEnd = b.contract_end_date ? new Date(b.contract_end_date).getTime() : 0;
          return aEnd - bEnd;
        })
        .slice(0, 10);

      if (renewalResults.length > 0) {
        return `**Priority Contract Renewals (next 90 days):**\n\n${renewalResults.map(r => 
          `• **${r.full_name}** (${r.vendor || 'N/A'}) — ends ${formatContractDate(r.contract_end_date)}`
        ).join('\n')}`;
      }
      return `**No urgent renewals needed**`;
    }

    // Department specific query - use resource_inventory as source of truth
    for (const dept of stats.departments) {
      if (lowerQuery.includes(dept.name.toLowerCase())) {
        // Query resource_inventory (source of truth) and join with profiles for names
        const { data: deptResources } = await supabase
          .from('resource_inventory')
          .select('id, profile_id, name, contract_end_date, vendor_id, vendor_name, role_name, department_id, capacity_departments(name)')
          .eq('department_id', dept.id)
          .order('contract_end_date', { ascending: true })
          .limit(15);

        if (deptResources && deptResources.length > 0) {
          // Get profile names + vendor for these resources (only when we actually have profile_ids)
          const profileIds = deptResources
            .map(r => r.profile_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);

          const profiles = profileIds.length
            ? (
                await supabase
                  .from('profiles')
                  .select('id, full_name, vendor')
                  .in('id', profileIds)
              ).data
            : [];

          const { data: resourceVendors } = await supabase
            .from('resource_vendors')
            .select('id, name');

          const profileMap = new Map((profiles || []).map(p => [p.id, { name: p.full_name, vendor: p.vendor }]));
          const vendorMap = new Map((resourceVendors || []).map(v => [v.id, v.name]));

          const results = deptResources.map(r => {
            // Priority: profile full_name > resource_inventory.name > role_name > fallback
            let displayName = 'Unnamed Resource';
            if (r.profile_id && profileMap.get(r.profile_id)?.name) {
              displayName = profileMap.get(r.profile_id)!.name as string;
            } else if (r.name && r.name.trim() !== '') {
              displayName = r.name;
            } else if (r.role_name && r.role_name.trim() !== '') {
              displayName = r.role_name;
            } else {
              displayName = `Resource ${String(r.id).slice(0, 8)}`;
            }

            const vendorFromId = r.vendor_id ? vendorMap.get(r.vendor_id) : null;
            const profileVendor = r.profile_id ? profileMap.get(r.profile_id)?.vendor : null;
            const vendor = vendorFromId || r.vendor_name || profileVendor || 'N/A';

            return {
              name: displayName,
              vendor,
              contractEnd: r.contract_end_date,
            };
          });

          return `**${dept.name} Department (${dept.count} resources):**\n\n${results.map(r => 
            `• **${r.name}** (${r.vendor}) — ${r.contractEnd ? formatContractDate(r.contractEnd) : 'No contract date'}`
          ).join('\n')}`;
        }
        return `**No resources found in ${dept.name} department**`;
      }
    }
    
    // Try to search by name as fallback
    const words = query
      .split(' ')
      .filter(
        (w) =>
          w.length > 2 && !['show', 'find', 'what', 'when', 'about', 'the', 'resources'].includes(w.toLowerCase())
      );

    for (const word of words) {
      const searchResults = await fetchMergedResources({ nameSearch: word, limit: 5 });

      if (searchResults && searchResults.length > 0) {
        return `**Found resources matching "${word}":**\n\n${searchResults.map(r => 
          `• **${r.full_name}** (${r.vendor || 'N/A'}) — Contract ends ${r.contract_end_date ? formatContractDate(r.contract_end_date) : 'Not set'}`
        ).join('\n')}`;
      }
    }
    
    return `I can help you with capacity insights. Try asking about:\n• A specific person (e.g., "When is Nada's contract expiring?")\n• Critical resources (contracts ending in 30 days)\n• Warning resources (contracts ending in 30-90 days)\n• Contract renewals\n• Department breakdown`;
  };

  const handleSubmit = async (query: string) => {
    if (!query.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      const response = await generateResponseAsync(query);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Caty error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error fetching the data. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(suggestion);
  };

  const handleKpiClick = (type: 'critical' | 'warning' | 'total') => {
    const queries = {
      critical: 'Show critical resources',
      warning: 'Show warning resources',
      total: 'Show all resources breakdown'
    };
    handleSubmit(queries[type]);
  };

  const handleDeptClick = (deptName: string) => {
    handleSubmit(`Show ${deptName} department resources`);
  };

  const handleSend = () => {
    handleSubmit(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRefresh = () => {
    setMessages([]);
    fetchCapacityStats();
  };

  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const formattedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return (
        <span 
          key={i} 
          className="block"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-[60px] h-[60px] rounded-full z-[1000]",
          "flex items-center justify-center cursor-pointer",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:scale-110",
          isOpen && "opacity-0 pointer-events-none"
        )}
        style={{
          background: 'linear-gradient(135deg, #5eaaa8 0%, #3d9a98 50%, #2d8a88 100%)',
          boxShadow: '0 4px 20px rgba(20, 184, 166, 0.4), 0 0 60px rgba(20, 184, 166, 0.3)',
          animation: 'fab-breathe 4s ease-in-out infinite'
        }}
        aria-label="Open Caty AI Assistant"
      >
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-2">
            <div className="w-[5px] h-[7px] bg-white rounded-[2px]" style={{ boxShadow: '0 0 6px rgba(255,255,255,0.8)' }} />
            <div className="w-[5px] h-[7px] bg-white rounded-[2px]" style={{ boxShadow: '0 0 6px rgba(255,255,255,0.8)' }} />
          </div>
          <div className="w-3 h-1.5 border-b-2 border-white rounded-b-full" />
        </div>

        {stats.critical > 0 && (
          <div 
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
            style={{ boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)' }}
          >
            {stats.critical}
          </div>
        )}
      </button>

      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[1000] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ 
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setIsOpen(false)}
      />

      {/* Chat Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[1001] w-full sm:w-[380px] md:w-[420px]",
          "flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "bg-background border-l border-border shadow-2xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="relative px-4 py-3 overflow-hidden shrink-0"
          style={{
            background: 'linear-gradient(135deg, #3d9a98 0%, #4dada8 50%, #5eaaa8 100%)'
          }}
        >
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.15), transparent 50%),
                radial-gradient(ellipse at 70% 100%, rgba(0,0,0,0.1), transparent 50%)
              `
            }}
          />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CatyOrb size="sm" showStatusDot showParticles={false} />
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Caty</h2>
                <div className="flex items-center gap-1.5 text-[12px] text-white/80">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <span>Online · Capacity AI</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleRefresh}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
                style={{ 
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
                style={{ 
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
                aria-label="Close chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
          {/* Greeting Message */}
          <div className="animate-[message-in_0.5s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
              <h3 className="text-lg font-bold text-foreground tracking-tight mb-0.5">
                {getGreeting()}, {getUserFirstName()}! 👋
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Here&apos;s your capacity snapshot
              </p>

              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button 
                  onClick={() => handleKpiClick('critical')}
                  className="relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border border-border text-left"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-red-500 to-red-400" />
                  <span className="text-base block mb-1">⚠️</span>
                  <div className="text-2xl font-extrabold text-red-500 tracking-tight leading-none mb-0.5">{stats.critical}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Critical</div>
                </button>

                <button 
                  onClick={() => handleKpiClick('warning')}
                  className="relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border border-border text-left"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-amber-600 to-amber-500" />
                  <span className="text-base block mb-1">⏰</span>
                  <div className="text-2xl font-extrabold text-amber-600 tracking-tight leading-none mb-0.5">{stats.warning}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Warning</div>
                </button>

                <button 
                  onClick={() => handleKpiClick('total')}
                  className="relative rounded-xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden bg-card border border-border text-left"
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-teal-500 to-teal-400" />
                  <span className="text-base block mb-1">👥</span>
                  <div className="text-2xl font-extrabold text-teal-600 tracking-tight leading-none mb-0.5">{stats.total}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</div>
                </button>
              </div>

              {/* Department Breakdown */}
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  By Department
                </div>
                
                <div className="space-y-2">
                  {stats.departments.map((dept) => (
                    <button 
                      key={dept.id}
                      onClick={() => handleDeptClick(dept.name)}
                      className="w-full rounded-lg p-2.5 cursor-pointer transition-all duration-250 hover:translate-x-0.5 hover:shadow-sm bg-card border border-border text-left"
                      style={{ borderLeft: `3px solid ${dept.color}` }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: dept.color }}
                        >
                          {dept.shortName}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground">{dept.name}</div>
                          <div className="text-[11px] text-muted-foreground">{dept.count} resources</div>
                        </div>
                        {dept.critical > 0 ? (
                          <div className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 shrink-0">
                            {dept.critical} critical
                          </div>
                        ) : dept.warning > 0 ? (
                          <div className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 shrink-0">
                            {dept.warning} warning
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 shrink-0">
                            All safe
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={cn(
                "mt-3 animate-[message-in_0.3s_cubic-bezier(0.16,1,0.3,1)]",
                message.type === 'user' && "flex justify-end"
              )}
            >
              <div 
                className={cn(
                  "p-3 shadow-sm",
                  message.type === 'user' 
                    ? "rounded-xl bg-teal-600 text-white max-w-[85%]" 
                    : "rounded-xl bg-card border border-border"
                )}
              >
                <div className={cn(
                  "text-sm leading-relaxed",
                  message.type === 'user' ? "text-white" : "text-foreground"
                )}>
                  {renderMessageContent(message.content)}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="mt-3 animate-[message-in_0.3s_cubic-bezier(0.16,1,0.3,1)]">
              <div className="p-3 rounded-xl bg-card border border-border inline-block">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 pb-4 bg-background border-t border-border shrink-0">
          <div className="mb-2">
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground rounded-full transition-all duration-200 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-500/10 bg-muted/50 border border-border"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 rounded-xl bg-card border-2 border-border p-1.5 pl-4 focus-within:border-teal-500 transition-colors">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Caty about capacity..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white transition-all duration-250 hover:scale-105 shrink-0 disabled:opacity-50 disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes fab-breathe {
          0%, 100% { box-shadow: 0 4px 20px rgba(20, 184, 166, 0.4), 0 0 60px rgba(20, 184, 166, 0.3); }
          50% { box-shadow: 0 4px 30px rgba(20, 184, 166, 0.5), 0 0 80px rgba(20, 184, 166, 0.4); }
        }
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes look-around {
          0%, 40%, 100% { transform: translateX(-50%); }
          45%, 55% { transform: translateX(-100%); }
          60%, 70% { transform: translateX(0%); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(30px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
        }
        @keyframes status-pulse {
          0%, 100% { box-shadow: 0 0 8px #22c55e; }
          50% { box-shadow: 0 0 15px #22c55e; }
        }
        @keyframes message-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
