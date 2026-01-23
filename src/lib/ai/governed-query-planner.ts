/**
 * Governed AI Query Planner
 * Hard-wired query execution for Caty (Capacity AI)
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  AiSemanticDictionary,
  AiTableAllowlist,
  GovernedAiResponse,
  SemanticResolution
} from '@/types/ai-governance';

interface QueryContext {
  prompt: string;
  personName?: string;
  currentRoute: string;
  semanticDictionary: AiSemanticDictionary[];
  tableAllowlist: AiTableAllowlist[];
  policies: Record<string, any>;
}

interface ResolvedPerson {
  id: string;
  resourceInventoryId: string;
  name: string;
}

// Step 1: Extract person name from prompt
function extractPersonName(prompt: string): string | null {
  // Common patterns: "When is X's contract", "What is X's role", "X contract end date"
  const patterns = [
    /(?:when is|what is|show|get|find)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:'s|'s)?\s/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:'s|'s)\s+(?:contract|role|department|allocation)/i,
    /(?:for|about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fallback: Find capitalized words that look like names
  const words = prompt.split(/\s+/);
  const nameWords: string[] = [];
  for (const word of words) {
    if (/^[A-Z][a-z]+$/.test(word) && !['When', 'What', 'Where', 'How', 'Who', 'Is', 'Are', 'The', 'Contract', 'End', 'Date'].includes(word)) {
      nameWords.push(word);
    } else if (nameWords.length > 0) {
      break;
    }
  }

  return nameWords.length >= 2 ? nameWords.join(' ') : null;
}

// Step 2: Semantic matching
function matchSemanticConcept(
  prompt: string,
  dictionary: AiSemanticDictionary[]
): { entry: AiSemanticDictionary | null; confidence: number } {
  const promptLower = prompt.toLowerCase();
  let bestMatch: AiSemanticDictionary | null = null;
  let bestConfidence = 0;

  for (const entry of dictionary) {
    // Check canonical concept
    if (promptLower.includes(entry.canonical_concept.toLowerCase())) {
      return { entry, confidence: 1.0 };
    }

    // Check synonyms
    for (const syn of entry.synonyms) {
      const synLower = syn.toLowerCase();
      if (promptLower.includes(synLower)) {
        const confidence = synLower.length / promptLower.length;
        if (confidence > bestConfidence) {
          bestMatch = entry;
          bestConfidence = Math.min(0.95, confidence + 0.5); // Boost for exact match
        }
      }
    }
  }

  return { entry: bestMatch, confidence: bestConfidence };
}

// Step 3: Resolve person to resource_inventory
async function resolvePerson(name: string): Promise<ResolvedPerson | null> {
  // Try exact match first
  const { data: exactMatch } = await supabase
    .from('resource_inventory')
    .select('id, name, profile_id')
    .ilike('name', name)
    .limit(1);

  if (exactMatch && exactMatch.length > 0) {
    return {
      id: exactMatch[0].profile_id || exactMatch[0].id,
      resourceInventoryId: exactMatch[0].id,
      name: exactMatch[0].name,
    };
  }

  // Try fuzzy match
  const { data: fuzzyMatch } = await supabase
    .from('resource_inventory')
    .select('id, name, profile_id')
    .ilike('name', `%${name}%`)
    .limit(1);

  if (fuzzyMatch && fuzzyMatch.length > 0) {
    return {
      id: fuzzyMatch[0].profile_id || fuzzyMatch[0].id,
      resourceInventoryId: fuzzyMatch[0].id,
      name: fuzzyMatch[0].name,
    };
  }

  // Try profiles table
  const { data: profileMatch } = await supabase
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', `%${name}%`)
    .limit(1);

  if (profileMatch && profileMatch.length > 0) {
    // Find corresponding resource_inventory
    const { data: riMatch } = await supabase
      .from('resource_inventory')
      .select('id, name, profile_id')
      .eq('profile_id', profileMatch[0].id)
      .limit(1);

    if (riMatch && riMatch.length > 0) {
      return {
        id: profileMatch[0].id,
        resourceInventoryId: riMatch[0].id,
        name: profileMatch[0].full_name,
      };
    }
  }

  return null;
}

// Step 4: Execute governed query
async function executeGovernedQuery(
  resolution: SemanticResolution[],
  person: ResolvedPerson,
  tableAllowlist: AiTableAllowlist[]
): Promise<{ value: any; source: string } | null> {
  // Sort by priority
  const sortedResolution = [...resolution].sort((a, b) => a.priority - b.priority);

  for (const res of sortedResolution) {
    // Check if table is allowed
    const tableEntry = tableAllowlist.find(t => t.table_name === res.table && t.is_active);
    if (!tableEntry) continue;

    // Check if column is allowed
    if (!tableEntry.allowed_columns.includes(res.column)) continue;

    try {
      let value: any = null;
      let source = `${res.table}.${res.column}`;

      switch (res.table) {
        case 'resource_inventory': {
          const { data } = await supabase
            .from('resource_inventory')
            .select(res.column)
            .eq('id', person.resourceInventoryId)
            .single();
          value = data?.[res.column as keyof typeof data];
          break;
        }
        case 'profiles': {
          const { data } = await supabase
            .from('profiles')
            .select(res.column)
            .eq('id', person.id)
            .single();
          value = data?.[res.column as keyof typeof data];
          break;
        }
        case 'capacity_departments': {
          const { data: ri } = await supabase
            .from('resource_inventory')
            .select('department_id')
            .eq('id', person.resourceInventoryId)
            .single();
          if (ri?.department_id) {
          const { data } = await (supabase as any).from('capacity_departments')
            .select(res.column)
            .eq('id', ri.department_id)
            .single();
            value = data?.[res.column as keyof typeof data];
          }
          break;
        }
        case 'resource_vendors': {
          const { data: ri } = await supabase
            .from('resource_inventory')
            .select('vendor_id')
            .eq('id', person.resourceInventoryId)
            .single();
          if (ri?.vendor_id) {
            const { data } = await supabase
              .from('resource_vendors')
              .select(res.column)
              .eq('id', ri.vendor_id)
              .single();
            value = data?.[res.column as keyof typeof data];
          }
          break;
        }
        case 'resource_locations': {
          const { data: ri } = await supabase
            .from('resource_inventory')
            .select('location_id')
            .eq('id', person.resourceInventoryId)
            .single();
          if (ri?.location_id) {
            const { data } = await supabase
              .from('resource_locations')
              .select(res.column)
              .eq('id', ri.location_id)
              .single();
            value = data?.[res.column as keyof typeof data];
          }
          break;
        }
        case 'resource_countries': {
          const { data: ri } = await supabase
            .from('resource_inventory')
            .select('country_id')
            .eq('id', person.resourceInventoryId)
            .single();
          if (ri?.country_id) {
            const { data } = await supabase
              .from('resource_countries')
              .select(res.column)
              .eq('id', ri.country_id)
              .single();
            value = data?.[res.column as keyof typeof data];
          }
          break;
        }
        case 'product_roles': {
          const { data: upr } = await supabase
            .from('user_product_roles')
            .select('role_id')
            .eq('user_id', person.id)
            .limit(1)
            .single();
          if (upr?.role_id) {
            const { data } = await supabase
              .from('product_roles')
              .select(res.column)
              .eq('id', upr.role_id)
              .single();
            value = data?.[res.column as keyof typeof data];
          }
          // Fallback to resource_inventory.role_name
          if (!value) {
            const { data: ri } = await supabase
              .from('resource_inventory')
              .select('role_name')
              .eq('id', person.resourceInventoryId)
              .single();
            value = ri?.role_name;
            source = 'resource_inventory.role_name';
          }
          break;
        }
        case 'resource_allocations': {
          const today = new Date().toISOString().split('T')[0];
          const { data } = await (supabase as any).from('resource_allocations')
            .select(res.column)
            .eq('resource_id', person.resourceInventoryId)
            .lte('start_date', today)
            .gte('end_date', today);
          if (data && data.length > 0) {
            value = data.reduce((sum, a) => sum + (a[res.column as keyof typeof a] as number || 0), 0);
          } else {
            value = 0;
          }
          break;
        }
      }

      if (value !== null && value !== undefined) {
        return { value, source };
      }
    } catch (error) {
      console.error(`Error querying ${res.table}.${res.column}:`, error);
    }
  }

  return null;
}

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not specified';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Main query planner
export async function executeGovernedAiQuery(
  context: QueryContext
): Promise<GovernedAiResponse> {
  const { prompt, currentRoute, semanticDictionary, tableAllowlist, policies } = context;

  // Step 1: Extract person name
  const personName = context.personName || extractPersonName(prompt);
  if (!personName) {
    return {
      directAnswer: 'Please specify a person name in your question.',
      source: 'N/A',
      notes: ['Example: "When is Hassan Raza Hasrat\'s contract end date?"'],
      error: true,
    };
  }

  // Step 2: Resolve person
  const person = await resolvePerson(personName);
  if (!person) {
    return {
      directAnswer: `Could not find resource: "${personName}"`,
      source: 'resource_inventory',
      notes: [
        'Check spelling of the name',
        'Verify the person exists in Admin → Users',
      ],
      error: true,
    };
  }

  // Step 3: Semantic matching
  const { entry: semanticEntry, confidence } = matchSemanticConcept(prompt, semanticDictionary);
  if (!semanticEntry || confidence < (semanticEntry?.threshold || 0.78)) {
    // Return top 3 suggestions
    const suggestions = semanticDictionary
      .slice(0, 3)
      .map(e => e.ui_label);
    return {
      directAnswer: 'Could not understand the question.',
      source: 'N/A',
      notes: [
        'Did you mean one of these?',
        ...suggestions.map(s => `• ${s}`),
      ],
      error: true,
    };
  }

  // Step 4: Execute query
  const result = await executeGovernedQuery(
    semanticEntry.resolution,
    person,
    tableAllowlist
  );

  // Step 5: Missing data check
  if (!result || result.value === null || result.value === undefined) {
    const missingDataPolicy = policies['missing_data_claim_check'];
    const redirectPath = missingDataPolicy?.redirect_path || '/admin/users';
    
    return {
      didYouMean: semanticEntry.ui_label,
      directAnswer: 'Not available',
      source: `${semanticEntry.resolution[0]?.table}.${semanticEntry.resolution[0]?.column}`,
      notes: [
        `Data not specified for ${person.name}`,
        `Populate at: Admin → Users → ${semanticEntry.ui_label}`,
      ],
      confidence,
    };
  }

  // Step 6: Format response
  let formattedValue = result.value;
  if (semanticEntry.canonical_concept.includes('date') && typeof result.value === 'string') {
    formattedValue = formatDate(result.value);
  } else if (semanticEntry.canonical_concept === 'current_allocation') {
    formattedValue = `${result.value}%`;
  }

  const response: GovernedAiResponse = {
    directAnswer: `${person.name}: ${formattedValue}`,
    source: result.source,
    notes: [],
    confidence,
  };

  // Add did-you-mean if phrase differs from canonical
  const promptLower = prompt.toLowerCase();
  if (!promptLower.includes(semanticEntry.canonical_concept.toLowerCase())) {
    response.didYouMean = semanticEntry.ui_label;
  }

  // Add notes based on context
  if (semanticEntry.canonical_concept === 'contract_end_date' && result.value) {
    const endDate = new Date(result.value);
    const now = new Date();
    const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) {
      response.notes.push('⚠️ Contract has expired');
    } else if (daysUntil <= 30) {
      response.notes.push(`⚠️ Contract expires in ${daysUntil} days`);
    } else if (daysUntil <= 90) {
      response.notes.push(`Contract expires in ${daysUntil} days`);
    }
  }

  return response;
}

// Test phrase matching (for admin UI)
export function testPhraseMatcher(
  phrase: string,
  dictionary: AiSemanticDictionary[]
): { matches: Array<{ concept: string; label: string; confidence: number }>; chosen?: { table: string; column: string } } {
  const matches: Array<{ concept: string; label: string; confidence: number }> = [];
  
  const phraseLower = phrase.toLowerCase().trim();
  
  for (const entry of dictionary) {
    let confidence = 0;
    
    if (phraseLower === entry.canonical_concept.toLowerCase()) {
      confidence = 1.0;
    } else {
      for (const syn of entry.synonyms) {
        const synLower = syn.toLowerCase();
        if (phraseLower === synLower) {
          confidence = 0.95;
          break;
        } else if (phraseLower.includes(synLower) || synLower.includes(phraseLower)) {
          const c = Math.min(synLower.length, phraseLower.length) / 
                    Math.max(synLower.length, phraseLower.length);
          confidence = Math.max(confidence, c);
        }
      }
    }
    
    if (confidence >= entry.threshold) {
      matches.push({
        concept: entry.canonical_concept,
        label: entry.ui_label,
        confidence,
      });
    }
  }
  
  matches.sort((a, b) => b.confidence - a.confidence);
  
  const topMatch = matches[0];
  let chosen: { table: string; column: string } | undefined;
  
  if (topMatch) {
    const entry = dictionary.find(e => e.canonical_concept === topMatch.concept);
    if (entry && entry.resolution.length > 0) {
      const topRes = entry.resolution.sort((a, b) => a.priority - b.priority)[0];
      chosen = { table: topRes.table, column: topRes.column };
    }
  }
  
  return { matches, chosen };
}
