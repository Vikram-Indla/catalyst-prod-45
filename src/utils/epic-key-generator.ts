/**
 * Epic Key Generator
 * Enforces strict 3-letter program key + sequence format: AAA-001
 * 
 * HARD CONSTRAINTS:
 * - Program keys MUST be exactly 3 uppercase letters (A-Z)
 * - Epic keys MUST be <PROGRAM_KEY>-<SEQUENCE> format
 * - Sequence is 3-digit zero-padded, scoped per program
 * - Keys longer than 7 characters are INVALID
 */

import { supabase } from '@/integrations/supabase/client';

// Regex patterns for validation
export const PROGRAM_KEY_REGEX = /^[A-Z]{3}$/;
export const EPIC_KEY_REGEX = /^[A-Z]{3}-\d{3}$/;

/**
 * Validates a program key (must be exactly 3 uppercase letters)
 */
export function isValidProgramKey(key: string): boolean {
  return PROGRAM_KEY_REGEX.test(key);
}

/**
 * Validates an epic key (must be AAA-### format)
 */
export function isValidEpicKey(key: string): boolean {
  return EPIC_KEY_REGEX.test(key);
}

/**
 * Extracts the program key prefix from an epic key
 */
export function extractProgramKeyFromEpicKey(epicKey: string): string | null {
  if (!isValidEpicKey(epicKey)) return null;
  return epicKey.substring(0, 3);
}

/**
 * Extracts the sequence number from an epic key
 */
export function extractSequenceFromEpicKey(epicKey: string): number | null {
  if (!isValidEpicKey(epicKey)) return null;
  const seqStr = epicKey.substring(4);
  return parseInt(seqStr, 10);
}

/**
 * Generates the next epic key for a given program
 * Format: AAA-001, AAA-002, etc.
 */
export async function generateNextEpicKey(programId: string): Promise<string> {
  // 1. Get the program's 3-letter key
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('key, name')
    .eq('id', programId)
    .single();

  if (programError || !program) {
    throw new Error(`Program not found: ${programId}`);
  }

  // 2. Validate/extract 3-letter key
  let programKey = program.key;
  
  // If current key is not 3 letters, derive one from name or throw
  if (!isValidProgramKey(programKey)) {
    // Try to extract first 3 letters from the key
    const upperKey = programKey.toUpperCase().replace(/[^A-Z]/g, '');
    if (upperKey.length >= 3) {
      programKey = upperKey.substring(0, 3);
    } else {
      // Derive from name
      const upperName = program.name.toUpperCase().replace(/[^A-Z]/g, '');
      if (upperName.length >= 3) {
        programKey = upperName.substring(0, 3);
      } else {
        programKey = 'PRG'; // Fallback
      }
    }
  }

  // 3. Find the highest existing sequence for this program
  const { data: existingEpics, error: epicsError } = await supabase
    .from('epics')
    .select('epic_key')
    .eq('primary_program_id', programId)
    .not('epic_key', 'is', null);

  if (epicsError) {
    throw new Error(`Failed to fetch existing epics: ${epicsError.message}`);
  }

  // 4. Calculate next sequence
  let maxSequence = 0;
  
  for (const epic of existingEpics || []) {
    if (!epic.epic_key) continue;
    
    // Check if it matches our expected format
    const match = epic.epic_key.match(/^[A-Z]{3}-(\d+)$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSequence) {
        maxSequence = seq;
      }
    }
    
    // Also check legacy formats like E-101, EPIC-001
    const legacyMatch = epic.epic_key.match(/-(\d+)$/);
    if (legacyMatch) {
      const seq = parseInt(legacyMatch[1], 10);
      if (seq > maxSequence) {
        maxSequence = seq;
      }
    }
  }

  const nextSequence = maxSequence + 1;
  
  // 5. Format as AAA-### (3-digit zero-padded)
  return `${programKey}-${String(nextSequence).padStart(3, '0')}`;
}

/**
 * Migrates an invalid epic key to valid AAA-### format
 */
export async function migrateEpicKey(
  epicId: string,
  programId: string
): Promise<string> {
  const newKey = await generateNextEpicKey(programId);
  
  const { error } = await supabase
    .from('epics')
    .update({ epic_key: newKey })
    .eq('id', epicId);

  if (error) {
    throw new Error(`Failed to migrate epic key: ${error.message}`);
  }

  return newKey;
}

/**
 * Finds all epics with invalid keys and returns migration plan
 */
export async function getEpicsNeedingMigration(): Promise<Array<{
  epicId: string;
  epicName: string;
  currentKey: string | null;
  programId: string | null;
  programKey: string | null;
  programName: string;
  proposedKey: string | null;
  isValid: boolean;
}>> {
  const { data: epics, error } = await supabase
    .from('epics')
    .select(`
      id,
      name,
      epic_key,
      primary_program_id,
      programs:primary_program_id(id, key, name)
    `)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to fetch epics: ${error.message}`);
  }

  const results: Array<{
    epicId: string;
    epicName: string;
    currentKey: string | null;
    programId: string | null;
    programKey: string | null;
    programName: string;
    proposedKey: string | null;
    isValid: boolean;
  }> = [];

  // Track next sequences per program
  const programSequences: Record<string, number> = {};

  for (const epic of epics || []) {
    const program = epic.programs as any;
    const currentKey = epic.epic_key;
    const isValid = currentKey ? isValidEpicKey(currentKey) : false;
    
    let proposedKey: string | null = null;
    
    if (!isValid && program?.id) {
      // Calculate proposed key
      let programKey = program.key;
      
      if (!isValidProgramKey(programKey)) {
        const upperKey = programKey.toUpperCase().replace(/[^A-Z]/g, '');
        if (upperKey.length >= 3) {
          programKey = upperKey.substring(0, 3);
        } else {
          const upperName = program.name.toUpperCase().replace(/[^A-Z]/g, '');
          programKey = upperName.length >= 3 ? upperName.substring(0, 3) : 'PRG';
        }
      }
      
      // Get or initialize sequence for this program
      if (!(program.id in programSequences)) {
        programSequences[program.id] = 0;
        
        // Find max existing sequence
        for (const e of epics || []) {
          if (e.primary_program_id === program.id && e.epic_key) {
            const match = e.epic_key.match(/-(\d+)$/);
            if (match) {
              const seq = parseInt(match[1], 10);
              if (seq > programSequences[program.id]) {
                programSequences[program.id] = seq;
              }
            }
          }
        }
      }
      
      programSequences[program.id]++;
      proposedKey = `${programKey}-${String(programSequences[program.id]).padStart(3, '0')}`;
    }

    results.push({
      epicId: epic.id,
      epicName: epic.name,
      currentKey,
      programId: program?.id || null,
      programKey: program?.key || null,
      programName: program?.name || 'No Program',
      proposedKey,
      isValid,
    });
  }

  return results;
}

/**
 * Runs full migration of all invalid epic keys
 * Returns count of migrated keys
 */
export async function runEpicKeyMigration(): Promise<{
  migrated: number;
  errors: string[];
}> {
  const epicsToMigrate = await getEpicsNeedingMigration();
  const invalidEpics = epicsToMigrate.filter(e => !e.isValid && e.programId);
  
  let migrated = 0;
  const errors: string[] = [];

  for (const epic of invalidEpics) {
    if (!epic.programId || !epic.proposedKey) continue;
    
    try {
      const { error } = await supabase
        .from('epics')
        .update({ epic_key: epic.proposedKey })
        .eq('id', epic.epicId);

      if (error) {
        errors.push(`Epic ${epic.epicName}: ${error.message}`);
      } else {
        migrated++;
        console.log(`[EpicKeyMigration] ${epic.currentKey || 'null'} → ${epic.proposedKey}`);
      }
    } catch (e) {
      errors.push(`Epic ${epic.epicName}: ${e}`);
    }
  }

  return { migrated, errors };
}

/**
 * Formats an epic key for display (ensures proper format)
 */
export function formatEpicKey(epicKey: string | null | undefined, fallbackId?: string): string {
  if (epicKey && isValidEpicKey(epicKey)) {
    return epicKey;
  }
  
  // If we have an epic key but it's invalid, show it with warning indicator
  if (epicKey) {
    return epicKey; // Return as-is, UI can show migration needed
  }
  
  // Fallback to ID prefix if no key
  if (fallbackId) {
    return fallbackId.substring(0, 8);
  }
  
  return '—';
}
