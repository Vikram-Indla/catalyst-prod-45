// ============================================================
// USE ANALYSIS HOOK
// Debounced real-time analysis as user types
// ============================================================

import { useEffect, useRef } from 'react';
import { useRequirementAssistStore } from '@/stores/requirementAssistStore';

export function useAnalysis(inputText: string) {
  const { setAnalysis, setAnalyzing, updateAnalysis } = useRequirementAssistStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Don't analyze if too short
    const wordCount = inputText.trim().split(/\s+/).length;
    if (wordCount < 5) {
      setAnalysis({
        actors: [],
        functions: [],
        nfrs: [],
        integrations: [],
        complexity: 'low',
        warnings: [],
        suggestions: [],
      });
      return;
    }

    // Debounce analysis
    debounceRef.current = setTimeout(async () => {
      setAnalyzing(true);
      abortRef.current = new AbortController();

      try {
        // Local analysis (fast, no API call)
        const analysis = analyzeLocally(inputText);
        updateAnalysis(analysis);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Analysis error:', error);
        }
      } finally {
        setAnalyzing(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputText, setAnalysis, setAnalyzing, updateAnalysis]);
}

/**
 * Fast local analysis without API call
 */
function analyzeLocally(text: string) {
  const lowerText = text.toLowerCase();
  
  // Extract actors (common patterns)
  const actorPatterns = [
    /(?:as an?|the)\s+(\w+(?:\s+\w+)?)/gi,
    /(\w+)\s+(?:can|should|must|will|wants?)/gi,
    /(?:user|admin|administrator|manager|applicant|reviewer|system|customer|citizen)/gi,
  ];
  
  const actors = new Set<string>();
  actorPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const actor = (match[1] || match[0]).trim();
      if (actor.length > 2 && actor.length < 30) {
        actors.add(actor.charAt(0).toUpperCase() + actor.slice(1).toLowerCase());
      }
    }
  });

  // Extract functions (verbs)
  const functionPatterns = [
    /shall\s+(\w+(?:\s+\w+){0,4})/gi,
    /must\s+(\w+(?:\s+\w+){0,4})/gi,
    /should\s+(\w+(?:\s+\w+){0,4})/gi,
    /(?:able to|can)\s+(\w+(?:\s+\w+){0,4})/gi,
    /(?:submit|upload|download|view|edit|delete|create|update|search|filter|export|import|validate|verify|approve|reject)/gi,
  ];

  const functions = new Set<string>();
  functionPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const func = (match[1] || match[0]).trim();
      if (func.length > 3 && func.length < 50) {
        functions.add(func.charAt(0).toUpperCase() + func.slice(1).toLowerCase());
      }
    }
  });

  // Extract NFRs
  const nfrs: string[] = [];
  if (/performance|fast|quick|speed|response time|latency/i.test(text)) {
    nfrs.push('Performance');
  }
  if (/security|secure|authentication|authorization|encrypt|password/i.test(text)) {
    nfrs.push('Security');
  }
  if (/accessible|accessibility|wcag|screen reader/i.test(text)) {
    nfrs.push('Accessibility');
  }
  if (/arabic|rtl|bilingual|language/i.test(text)) {
    nfrs.push('Localization');
  }
  if (/available|uptime|reliable|reliability/i.test(text)) {
    nfrs.push('Reliability');
  }

  // Extract integrations
  const integrations = new Set<string>();
  const integrationPatterns = [
    /(?:integrate|integration|connect|api|interface)\s+(?:with\s+)?(\w+(?:\s+\w+)?)/gi,
    /(?:database|system|service|platform|portal)\s+(\w+)/gi,
    /(?:absher|nafath|sadad|yakeen|national id|ministry)/gi,
  ];

  integrationPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const integration = (match[1] || match[0]).trim();
      if (integration.length > 2) {
        integrations.add(integration);
      }
    }
  });

  // Determine complexity
  const wordCount = text.split(/\s+/).length;
  let complexity: 'low' | 'medium' | 'high' = 'low';
  
  if (wordCount > 200 || actors.size > 4 || functions.size > 8 || integrations.size > 3) {
    complexity = 'high';
  } else if (wordCount > 50 || actors.size > 2 || functions.size > 4) {
    complexity = 'medium';
  }

  return {
    actors: Array.from(actors).slice(0, 10),
    functions: Array.from(functions).slice(0, 15),
    nfrs: nfrs.slice(0, 8),
    integrations: Array.from(integrations).slice(0, 8),
    complexity,
    warnings: [] as string[],
    suggestions: [] as string[],
  };
}
