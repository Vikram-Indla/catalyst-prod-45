import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserProfile } from '@/hooks/useUsers';
import { 
  getCountryInfo, 
  normalizeVendor, 
  parseContractEndDate 
} from '@/lib/countryLookup';
import Fuse from 'fuse.js';

export interface MappingRecord {
  name: string;
  role?: string;
  vendor?: string;
  end_date?: string;
  location?: string;
  country?: string;
  email?: string;
}

export interface MatchResult {
  mapping: MappingRecord;
  matchType: 'exact_email' | 'exact_name' | 'fuzzy' | 'not_found' | 'ambiguous' | 'skipped';
  matchedUser: UserProfile | null;
  candidates?: UserProfile[];
  reason?: string;
  changes?: Record<string, { old: string | null; new: string | null }>;
}

export interface DryRunResult {
  matched: MatchResult[];
  notFound: MatchResult[];
  ambiguous: MatchResult[];
  skipped: MatchResult[];
  summary: {
    total: number;
    toUpdate: number;
    unchanged: number;
    mismatched: number;
  };
}

// Match users from mapping to existing users
export function matchUsers(
  mappingData: MappingRecord[],
  existingUsers: UserProfile[]
): DryRunResult {
  const matched: MatchResult[] = [];
  const notFound: MatchResult[] = [];
  const ambiguous: MatchResult[] = [];
  const skipped: MatchResult[] = [];

  // Create Fuse instance for fuzzy matching
  const fuse = new Fuse(existingUsers, {
    keys: ['full_name'],
    threshold: 0.3, // Conservative threshold
    includeScore: true,
  });

  // Create email lookup map
  const emailMap = new Map<string, UserProfile>();
  existingUsers.forEach((user) => {
    if (user.email) {
      emailMap.set(user.email.toLowerCase().trim(), user);
    }
  });

  // Create exact name lookup map (case-insensitive)
  const nameMap = new Map<string, UserProfile[]>();
  existingUsers.forEach((user) => {
    if (user.full_name) {
      const key = user.full_name.toLowerCase().trim();
      if (!nameMap.has(key)) {
        nameMap.set(key, []);
      }
      nameMap.get(key)!.push(user);
    }
  });

  for (const mapping of mappingData) {
    // Skip records without name
    if (!mapping.name || mapping.name.trim() === '') {
      skipped.push({
        mapping,
        matchType: 'skipped',
        matchedUser: null,
        reason: 'Missing name field',
      });
      continue;
    }

    const normalizedName = mapping.name.toLowerCase().trim();
    let result: MatchResult | null = null;

    // 1. Try exact email match first (if email provided)
    if (mapping.email) {
      const userByEmail = emailMap.get(mapping.email.toLowerCase().trim());
      if (userByEmail) {
        result = {
          mapping,
          matchType: 'exact_email',
          matchedUser: userByEmail,
          changes: calculateChanges(userByEmail, mapping),
        };
      }
    }

    // 2. Try exact name match
    if (!result) {
      const exactMatches = nameMap.get(normalizedName);
      if (exactMatches) {
        if (exactMatches.length === 1) {
          result = {
            mapping,
            matchType: 'exact_name',
            matchedUser: exactMatches[0],
            changes: calculateChanges(exactMatches[0], mapping),
          };
        } else {
          // Multiple exact matches - ambiguous
          result = {
            mapping,
            matchType: 'ambiguous',
            matchedUser: null,
            candidates: exactMatches,
            reason: `Multiple users found with name "${mapping.name}"`,
          };
        }
      }
    }

    // 3. Try fuzzy match
    if (!result) {
      const fuzzyResults = fuse.search(mapping.name);
      if (fuzzyResults.length > 0) {
        const topMatch = fuzzyResults[0];
        const score = topMatch.score || 1;

        // Very strict threshold for auto-matching
        if (score < 0.15 && fuzzyResults.length === 1) {
          result = {
            mapping,
            matchType: 'fuzzy',
            matchedUser: topMatch.item,
            changes: calculateChanges(topMatch.item, mapping),
          };
        } else if (fuzzyResults.length > 0) {
          // Provide candidates but mark as ambiguous
          result = {
            mapping,
            matchType: 'ambiguous',
            matchedUser: null,
            candidates: fuzzyResults.slice(0, 3).map((r) => r.item),
            reason: `No exact match found. Similar names detected.`,
          };
        }
      }
    }

    // 4. Not found
    if (!result) {
      result = {
        mapping,
        matchType: 'not_found',
        matchedUser: null,
        reason: `No user found matching "${mapping.name}"`,
      };
    }

    // Categorize result
    if (result.matchType === 'not_found') {
      notFound.push(result);
    } else if (result.matchType === 'ambiguous') {
      ambiguous.push(result);
    } else if (result.matchType === 'skipped') {
      skipped.push(result);
    } else {
      matched.push(result);
    }
  }

  // Calculate summary
  const unchangedCount = matched.filter(
    (m) => !m.changes || Object.keys(m.changes).length === 0
  ).length;

  return {
    matched,
    notFound,
    ambiguous,
    skipped,
    summary: {
      total: mappingData.length,
      toUpdate: matched.length - unchangedCount,
      unchanged: unchangedCount,
      mismatched: notFound.length + ambiguous.length,
    },
  };
}

// Calculate what fields will change
function calculateChanges(
  user: UserProfile,
  mapping: MappingRecord
): Record<string, { old: string | null; new: string | null }> {
  const changes: Record<string, { old: string | null; new: string | null }> = {};

  // Vendor
  const normalizedVendor = mapping.vendor ? normalizeVendor(mapping.vendor) : null;
  if (normalizedVendor && (user as any).vendor !== normalizedVendor) {
    changes.vendor = { old: (user as any).vendor || null, new: normalizedVendor };
  }

  // Country
  const countryInfo = mapping.country ? getCountryInfo(mapping.country) : null;
  if (countryInfo && (user as any).country !== countryInfo.name) {
    changes.country = { old: (user as any).country || null, new: countryInfo.name };
    changes.country_code = { old: (user as any).country_code || null, new: countryInfo.code };
    changes.country_flag_svg_url = { old: (user as any).country_flag_svg_url || null, new: countryInfo.svg };
  }

  // Location
  if (mapping.location && (user as any).location !== mapping.location) {
    changes.location = { old: (user as any).location || null, new: mapping.location };
  }

  // Contract end date
  const parsedDate = parseContractEndDate(mapping.end_date);
  if (parsedDate) {
    const dateStr = parsedDate.toISOString().split('T')[0];
    if ((user as any).contract_end_date !== dateStr) {
      changes.contract_end_date = { 
        old: (user as any).contract_end_date || null, 
        new: dateStr 
      };
    }
  }

  return changes;
}

export interface ApplyUpdatesInput {
  matchResults: MatchResult[];
  mappingInput: MappingRecord[];
}

export function useBulkUpdateUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchResults, mappingInput }: ApplyUpdatesInput) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Create bulk update audit record
      const { data: auditRecord, error: auditError } = await supabase
        .from('user_bulk_update_audit')
        .insert({
          triggered_by: currentUser.id,
          mapping_input: mappingInput as any,
          total_updated: 0,
          total_skipped: 0,
          total_mismatched: 0,
        })
        .select()
        .single();

      if (auditError) throw auditError;

      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Process each matched result
      for (const result of matchResults) {
        if (!result.matchedUser || !result.changes || Object.keys(result.changes).length === 0) {
          skippedCount++;
          continue;
        }

        const userId = result.matchedUser.id;
        const updates: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        // Build update object
        for (const [field, change] of Object.entries(result.changes)) {
          updates[field] = change.new;

          // Log each field change
          await supabase.from('user_field_change_log').insert({
            user_id: userId,
            changed_by: currentUser.id,
            field_name: field,
            old_value: change.old,
            new_value: change.new,
            bulk_update_id: auditRecord.id,
          });
        }

        // Apply update
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) {
          errors.push(`Failed to update ${result.matchedUser.full_name}: ${updateError.message}`);
          skippedCount++;
        } else {
          updatedCount++;
        }
      }

      // Update audit record with final counts
      await supabase
        .from('user_bulk_update_audit')
        .update({
          total_updated: updatedCount,
          total_skipped: skippedCount,
          total_mismatched: matchResults.filter((m) => m.matchType === 'not_found' || m.matchType === 'ambiguous').length,
          results_summary: { errors } as any,
        })
        .eq('id', auditRecord.id);

      return { updatedCount, skippedCount, errors };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success(`Bulk update complete: ${data.updatedCount} users updated`);
    },
    onError: (error) => {
      console.error('Bulk update failed:', error);
      toast.error('Bulk update failed: ' + (error as Error).message);
    },
  });
}
