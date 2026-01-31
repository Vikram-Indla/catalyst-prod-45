/**
 * Caty AI V7 — Suggestions Bar
 */

import React from 'react';

interface Suggestion {
  text: string;
  variant?: 'default' | 'alert' | 'escalate';
  onClick: () => void;
}

interface CatySuggestionsBarProps {
  suggestions: Suggestion[];
}

export const CatySuggestionsBar: React.FC<CatySuggestionsBarProps> = ({ suggestions }) => (
  <div className="caty-suggestions">
    {suggestions.map((s, i) => (
      <button key={i} className={`caty-suggestion ${s.variant || ''}`} onClick={s.onClick}>
        {s.text}
      </button>
    ))}
  </div>
);
