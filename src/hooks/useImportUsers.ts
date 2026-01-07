import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ApprovalStatus } from './useUsers';

export interface UserImportRow {
  full_name: string;
  email: string;
  vendor?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  location?: string;
  country?: string;
  country_code?: string;
  approval_status?: ApprovalStatus;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ row: number; name: string; error: string }>;
}

// Map CSV approval status values to our enum
function parseApprovalStatus(value: string | undefined): ApprovalStatus {
  if (!value) return 'PENDING_APPROVAL';
  const normalized = value.toUpperCase().replace(/[^A-Z_]/g, '_');
  if (normalized === 'APPROVED' || normalized === 'ACTIVE') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  if (normalized === 'DISABLED' || normalized === 'INACTIVE') return 'DISABLED';
  return 'PENDING_APPROVAL';
}

// Parse date from various formats
function parseDate(value: string | undefined): string | null {
  if (!value || !value.trim()) return null;
  
  // Try parsing common formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // DD-MMM-YY (e.g., 31-Mar-26)
    /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ];

  // Check if already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // DD-MMM-YY format
  const monthMap: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };

  const dmmyyMatch = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (dmmyyMatch) {
    const [, day, month, year] = dmmyyMatch;
    const monthNum = monthMap[month.toLowerCase()];
    if (monthNum) {
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      return `${fullYear}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }

  // Try native parsing
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

export function useImportUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: UserImportRow[]): Promise<ImportResult> => {
      const result: ImportResult = { created: 0, updated: 0, errors: [] };
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 for 1-indexed and header row
        
        try {
          if (!row.email?.trim()) {
            result.errors.push({ row: rowNum, name: row.full_name || 'Unknown', error: 'Email is required' });
            continue;
          }

          const email = row.email.toLowerCase().trim();
          
          // Check if user exists by email
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          const profileData = {
            full_name: row.full_name?.trim() || null,
            email,
            vendor: row.vendor?.trim() || null,
            contract_start_date: parseDate(row.contract_start_date),
            contract_end_date: parseDate(row.contract_end_date),
            location: row.location?.trim() || null,
            country: row.country?.trim() || null,
            country_code: row.country_code?.toUpperCase().trim() || null,
            approval_status: parseApprovalStatus(row.approval_status),
            updated_at: new Date().toISOString(),
          };

          if (existingUser) {
            // Update existing user
            const { error } = await supabase
              .from('profiles')
              .update(profileData)
              .eq('id', existingUser.id);

            if (error) throw error;
            result.updated++;
          } else {
            // Create new profile (without auth user - admin import)
            const { error } = await supabase
              .from('profiles')
              .insert({
                ...profileData,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
              });

            if (error) throw error;
            result.created++;
          }
        } catch (error) {
          result.errors.push({
            row: rowNum,
            name: row.full_name || row.email || 'Unknown',
            error: (error as Error).message,
          });
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      queryClient.invalidateQueries({ queryKey: ['active-users'] });
      
      if (result.errors.length === 0) {
        toast.success(`Import complete: ${result.created} created, ${result.updated} updated`);
      } else {
        toast.warning(
          `Import complete with errors: ${result.created} created, ${result.updated} updated, ${result.errors.length} failed`
        );
      }
    },
    onError: (error) => {
      toast.error(`Import failed: ${(error as Error).message}`);
    },
  });
}
