/**
 * AI Governance Hook
 * Real-time subscribed governance data for Caty
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  AiContract,
  AiRouteScope,
  AiTableAllowlist,
  AiSemanticDictionary,
  AiPolicy,
  AiGovernanceAuditLog,
  SemanticResolution
} from '@/types/ai-governance';

const GOVERNANCE_QUERY_KEY = 'ai-governance';

export function useAiGovernance(domain: string = 'capacity') {
  const queryClient = useQueryClient();

  // Fetch active contract for domain
  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: [GOVERNANCE_QUERY_KEY, 'contract', domain],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ai_contracts')
        .select('*')
        .eq('domain', domain)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data as AiContract;
    },
  });

  // Fetch route scopes
  const { data: routeScopes = [], isLoading: routesLoading } = useQuery({
    queryKey: [GOVERNANCE_QUERY_KEY, 'routes', contract?.id],
    enabled: !!contract?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ai_route_scopes')
        .select('*')
        .eq('contract_id', contract!.id)
        .eq('is_active', true);
      if (error) throw error;
      return data as AiRouteScope[];
    },
  });

  // Fetch table allowlist
  const { data: tableAllowlist = [], isLoading: tablesLoading } = useQuery({
    queryKey: [GOVERNANCE_QUERY_KEY, 'tables', contract?.id],
    enabled: !!contract?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ai_table_allowlist')
        .select('*')
        .eq('contract_id', contract!.id)
        .eq('is_active', true);
      if (error) throw error;
      return data as AiTableAllowlist[];
    },
  });

  // Fetch semantic dictionary
  const { data: semanticDictionary = [], isLoading: semanticsLoading } = useQuery({
    queryKey: [GOVERNANCE_QUERY_KEY, 'semantics', contract?.id],
    enabled: !!contract?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ai_semantic_dictionary')
        .select('*')
        .eq('contract_id', contract!.id)
        .eq('is_active', true);
      if (error) throw error;
      return ((data || []) as any[]).map((d: any) => ({
        ...d,
        resolution: typeof d.resolution === 'string' ? JSON.parse(d.resolution) : d.resolution
      })) as AiSemanticDictionary[];
    },
  });

  // Fetch policies
  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: [GOVERNANCE_QUERY_KEY, 'policies', contract?.id],
    enabled: !!contract?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ai_policies')
        .select('*')
        .eq('contract_id', contract!.id)
        .eq('is_active', true);
      if (error) throw error;
      return data as AiPolicy[];
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] });
    };

    const channel = supabase
      .channel('ai-governance-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_contracts' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_route_scopes' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_table_allowlist' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_semantic_dictionary' }, invalidateAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_policies' }, invalidateAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Check if route is authorized
  const isRouteAuthorized = (currentRoute: string): boolean => {
    if (!contract?.is_active) return false;
    return routeScopes.some(rs => currentRoute.startsWith(rs.route) && rs.is_active);
  };

  // Get allowed intents for route
  const getAllowedIntents = (currentRoute: string): string[] => {
    const scope = routeScopes.find(rs => currentRoute.startsWith(rs.route) && rs.is_active);
    return scope?.allowed_intents || [];
  };

  // Check if table.column is allowed
  const isTableColumnAllowed = (table: string, column: string): boolean => {
    const tableEntry = tableAllowlist.find(t => t.table_name === table && t.is_active);
    if (!tableEntry) return false;
    return tableEntry.allowed_columns.includes(column);
  };

  // Semantic matching with fuzzy search
  const matchSemantic = (phrase: string): { match: AiSemanticDictionary | null; confidence: number } => {
    const phraseLower = phrase.toLowerCase().trim();
    let bestMatch: AiSemanticDictionary | null = null;
    let bestConfidence = 0;

    for (const entry of semanticDictionary) {
      // Exact canonical match
      if (phraseLower === entry.canonical_concept.toLowerCase()) {
        return { match: entry, confidence: 1.0 };
      }

      // Exact synonym match
      for (const syn of entry.synonyms) {
        if (phraseLower === syn.toLowerCase()) {
          return { match: entry, confidence: 0.95 };
        }
      }

      // Fuzzy match - check if phrase contains synonym or vice versa
      for (const syn of entry.synonyms) {
        const synLower = syn.toLowerCase();
        if (phraseLower.includes(synLower) || synLower.includes(phraseLower)) {
          const confidence = Math.min(synLower.length, phraseLower.length) / 
                           Math.max(synLower.length, phraseLower.length);
          if (confidence > bestConfidence && confidence >= entry.threshold) {
            bestMatch = entry;
            bestConfidence = confidence;
          }
        }
      }
    }

    return { match: bestMatch, confidence: bestConfidence };
  };

  // Get policy value
  const getPolicy = (key: string): Record<string, any> | null => {
    const policy = policies.find(p => p.policy_key === key && p.is_active);
    return policy?.policy_value || null;
  };

  return {
    contract,
    routeScopes,
    tableAllowlist,
    semanticDictionary,
    policies,
    isLoading: contractLoading || routesLoading || tablesLoading || semanticsLoading || policiesLoading,
    isRouteAuthorized,
    getAllowedIntents,
    isTableColumnAllowed,
    matchSemantic,
    getPolicy,
  };
}

// Admin hook for CRUD operations
export function useAiGovernanceAdmin() {
  const queryClient = useQueryClient();

  const logAudit = async (
    contractId: string,
    action: string,
    objectType: string,
    objectId: string,
    diff: Record<string, any>
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from('ai_governance_audit_log').insert({
      actor_id: user?.id,
      contract_id: contractId,
      action,
      object_type: objectType,
      object_id: objectId,
      diff,
    });
  };

  // Contracts CRUD
  const createContract = useMutation({
    mutationFn: async (contract: Partial<AiContract>) => {
      const insertData = {
        name: contract.name!,
        domain: contract.domain!,
        description: contract.description,
        is_active: contract.is_active ?? true,
        created_by: contract.created_by,
        updated_by: contract.updated_by,
      };
      const { data, error } = await (supabase as any)
        .from('ai_contracts')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      await logAudit(data.id, 'create', 'contract', data.id, { after: data });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AiContract> & { id: string }) => {
      const { data: before } = await (supabase as any).from('ai_contracts').select().eq('id', id).single();
      const { data, error } = await (supabase as any)
        .from('ai_contracts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit(id, 'update', 'contract', id, { before, after: data });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  // Route Scopes CRUD
  const createRouteScope = useMutation({
    mutationFn: async (scope: Partial<AiRouteScope>) => {
      const insertData = {
        contract_id: scope.contract_id!,
        route: scope.route!,
        allowed_intents: scope.allowed_intents ?? [],
        is_active: scope.is_active ?? true,
      };
      const { data, error } = await (supabase as any)
        .from('ai_route_scopes')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      await logAudit(scope.contract_id!, 'create', 'route_scope', (data as any).id, { after: data });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  const updateRouteScope = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AiRouteScope> & { id: string }) => {
      const { data: before } = await (supabase as any).from('ai_route_scopes').select().eq('id', id).single();
      const { data, error } = await (supabase as any)
        .from('ai_route_scopes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit(before?.contract_id, 'update', 'route_scope', id, { before, after: data });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  const deleteRouteScope = useMutation({
    mutationFn: async (id: string) => {
      const { data: before } = await (supabase as any).from('ai_route_scopes').select().eq('id', id).single();
      const { error } = await (supabase as any).from('ai_route_scopes').delete().eq('id', id);
      if (error) throw error;
      await logAudit(before?.contract_id, 'delete', 'route_scope', id, { before });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  // Table Allowlist CRUD
  const createTableEntry = useMutation({
    mutationFn: async (entry: Partial<AiTableAllowlist>) => {
      const insertData = {
        contract_id: entry.contract_id!,
        table_name: entry.table_name!,
        allowed_columns: entry.allowed_columns ?? [],
        join_keys: entry.join_keys ?? {},
        pii_level: entry.pii_level ?? 'none',
        is_active: entry.is_active ?? true,
      };
      const { data, error } = await (supabase as any)
        .from('ai_table_allowlist')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      await logAudit(entry.contract_id!, 'create', 'table_allowlist', (data as any).id, { after: data });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  const updateTableEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AiTableAllowlist> & { id: string }) => {
      const { data: before } = await (supabase as any).from('ai_table_allowlist').select().eq('id', id).single();
      const { data, error } = await (supabase as any)
        .from('ai_table_allowlist')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit(before?.contract_id, 'update', 'table_allowlist', id, { before, after: data });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  const deleteTableEntry = useMutation({
    mutationFn: async (id: string) => {
      const { data: before } = await (supabase as any).from('ai_table_allowlist').select().eq('id', id).single();
      const { error } = await (supabase as any).from('ai_table_allowlist').delete().eq('id', id);
      if (error) throw error;
      await logAudit(before?.contract_id, 'delete', 'table_allowlist', id, { before });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  // Semantic Dictionary CRUD
  const createSemanticEntry = useMutation({
    mutationFn: async (entry: Partial<AiSemanticDictionary>) => {
      const insertData: {
        contract_id: string;
        canonical_concept: string;
        ui_label: string;
        synonyms: string[];
        resolution: unknown;
        threshold: number;
        is_active: boolean;
      } = {
        contract_id: entry.contract_id!,
        canonical_concept: entry.canonical_concept!,
        ui_label: entry.ui_label!,
        synonyms: entry.synonyms ?? [],
        resolution: (entry.resolution ?? []) as unknown,
        threshold: entry.threshold ?? 0.78,
        is_active: entry.is_active ?? true,
      };
      const { data, error } = await (supabase as any)
        .from('ai_semantic_dictionary')
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      await logAudit(entry.contract_id!, 'create', 'semantic_dictionary', (data as any).id, { after: data });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  const updateSemanticEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AiSemanticDictionary> & { id: string }) => {
      const { data: before } = await (supabase as any).from('ai_semantic_dictionary').select().eq('id', id).single();
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        ...(updates.resolution && { resolution: JSON.stringify(updates.resolution) })
      };
      const { data, error } = await (supabase as any)
        .from('ai_semantic_dictionary')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit(before?.contract_id, 'update', 'semantic_dictionary', id, { before, after: data });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  const deleteSemanticEntry = useMutation({
    mutationFn: async (id: string) => {
      const { data: before } = await (supabase as any).from('ai_semantic_dictionary').select().eq('id', id).single();
      const { error } = await (supabase as any).from('ai_semantic_dictionary').delete().eq('id', id);
      if (error) throw error;
      await logAudit(before?.contract_id, 'delete', 'semantic_dictionary', id, { before });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  // Policies CRUD
  const updatePolicy = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AiPolicy> & { id: string }) => {
      const { data: before } = await supabase.from('ai_policies').select().eq('id', id).single();
      const { data, error } = await supabase
        .from('ai_policies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logAudit(before?.contract_id, 'update', 'policy', id, { before, after: data });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GOVERNANCE_QUERY_KEY] }),
  });

  // Audit log fetch
  const fetchAuditLog = async (contractId?: string): Promise<AiGovernanceAuditLog[]> => {
    let query = supabase
      .from('ai_governance_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (contractId) {
      query = query.eq('contract_id', contractId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as AiGovernanceAuditLog[];
  };

  return {
    createContract,
    updateContract,
    createRouteScope,
    updateRouteScope,
    deleteRouteScope,
    createTableEntry,
    updateTableEntry,
    deleteTableEntry,
    createSemanticEntry,
    updateSemanticEntry,
    deleteSemanticEntry,
    updatePolicy,
    fetchAuditLog,
  };
}
