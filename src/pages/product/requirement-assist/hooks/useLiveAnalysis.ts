import { useMemo } from 'react';

interface AnalysisResult {
  wordCount: number;
  actorCount: number;
  funcCount: number;
  nfrCount: number;
  intCount: number;
  complexity: 'Low' | 'Medium' | 'High' | 'Complex' | '—';
  hasArabic: boolean;
  ambiguityCount: number;
  wordCountStatus: 'normal' | 'warning' | 'danger';
}

export function useLiveAnalysis(content: string): AnalysisResult {
  return useMemo(() => {
    const text = content.trim();
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    
    // Word count status
    let wordCountStatus: 'normal' | 'warning' | 'danger' = 'normal';
    if (words > 2900) wordCountStatus = 'danger';
    else if (words > 2500) wordCountStatus = 'warning';

    // Simulated analysis based on word count
    const actorCount = Math.min(Math.floor(words / 80), 6);
    const funcCount = Math.min(Math.floor(words / 40), 15);
    const nfrCount = Math.min(Math.floor(words / 150), 5);
    const intCount = Math.min(Math.floor(words / 250), 4);

    // Complexity
    let complexity: AnalysisResult['complexity'] = '—';
    if (words > 50) complexity = 'Low';
    if (words > 200) complexity = 'Medium';
    if (words > 500) complexity = 'High';
    if (words > 1000) complexity = 'Complex';

    // Arabic detection
    const hasArabic = /[\u0600-\u06FF]/.test(text);

    // Ambiguity detection
    const ambiguousWords = ['maybe', 'should', 'could', 'might', 'possibly'];
    let ambiguityCount = 0;
    ambiguousWords.forEach(w => {
      const matches = text.toLowerCase().match(new RegExp(`\\b${w}\\b`, 'g'));
      if (matches) ambiguityCount += matches.length;
    });

    return {
      wordCount: words,
      actorCount,
      funcCount,
      nfrCount,
      intCount,
      complexity,
      hasArabic,
      ambiguityCount,
      wordCountStatus,
    };
  }, [content]);
}
