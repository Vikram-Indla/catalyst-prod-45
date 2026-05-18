import { useState, useRef, useEffect } from 'react';
import TextField from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import { Box, Stack } from '@atlaskit/primitives';

/**
 * InlineCreateCard — Inline form to create a new issue in a Kanban column
 * Appears below existing cards in a column when "+ Create issue" is clicked
 */
interface InlineCreateCardProps {
  projectKey: string;
  columnId: string;
  onCreateCard: (issue: { issueId: string; summary: string; status: string }) => void;
  onCancel: () => void;
}

export function InlineCreateCard({ projectKey, columnId, onCreateCard, onCancel }: InlineCreateCardProps) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCreate = async () => {
    if (!summary.trim()) return;

    setIsLoading(true);
    try {
      // Generate a temporary issue ID — in production, this would come from the backend
      const issueId = `temp-${Date.now()}`;

      onCreateCard({
        issueId,
        summary: summary.trim(),
        status: columnId,
      });

      setSummary('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Box padding="space.100" borderRadius="border.radius.100" backgroundColor="N20">
      <Stack space="space.100">
        <TextField
          ref={inputRef}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
          isDisabled={isLoading}
          autoComplete="off"
          aria-label="Summary. Required field."
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            appearance="primary"
            onClick={handleCreate}
            isDisabled={!summary.trim() || isLoading}
            isLoading={isLoading}
          >
            Create
          </Button>
          <Button appearance="subtle" onClick={onCancel} isDisabled={isLoading}>
            Cancel
          </Button>
        </div>
      </Stack>
    </Box>
  );
}
