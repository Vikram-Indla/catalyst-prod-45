/**
 * BRLinkedIssuesSection — Linked work items for Business Requests
 * Reuses existing LinksViewTab wrapped in an accordion
 */
import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { LinksViewTab } from '../drawer-tabs/LinksViewTab';

interface BRLinkedIssuesSectionProps {
  requestId: string;
  onNavigateToEpic?: (epicId: string) => void;
  onNavigateToFeature?: (featureId: string) => void;
  onNavigateToStory?: (storyId: string) => void;
}

export function BRLinkedIssuesSection({ requestId, onNavigateToEpic, onNavigateToFeature, onNavigateToStory }: BRLinkedIssuesSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <div data-section="linked-issues" style={{ borderTop: '1px solid #EBECF0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 600, color: '#172B4D', userSelect: 'none',
        }}
      >
        {open ? <ChevronDown size={16} color="#42526E" /> : <ChevronRight size={16} color="#42526E" />}
        Linked Issues
      </button>
      {open && (
        <div style={{ paddingBottom: 16 }}>
          <LinksViewTab
            requestId={requestId}
            onNavigateToEpic={onNavigateToEpic}
            onNavigateToFeature={onNavigateToFeature}
            onNavigateToStory={onNavigateToStory}
          />
        </div>
      )}
    </div>
  );
}
