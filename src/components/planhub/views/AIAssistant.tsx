import React from 'react';
import { Bot } from 'lucide-react';

interface Props {
  planId?: string | null;
}

export default function AIAssistant({ planId }: Props) {
  return (
    <div className="ph-page-body">
      <div className="ph-empty">
        <Bot className="ph-empty-icon" />
        <h2 className="ph-empty-title">AI Assistant</h2>
        <p className="ph-empty-text">Coming in Prompt D.5</p>
      </div>
    </div>
  );
}
