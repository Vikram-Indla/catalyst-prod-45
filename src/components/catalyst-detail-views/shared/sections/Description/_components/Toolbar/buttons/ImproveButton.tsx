import React from 'react';
import type { Editor } from '@tiptap/react';
import { CatyIconCTA } from '@/components/ui/CatyIconCTA';

interface Props {
  editor: Editor | null;
  onImprove?: () => void;
  onStop?: () => void;
  label?: string;
  isImproving?: boolean;
}

export function ImproveButton({
  editor,
  onImprove,
  onStop,
  label = 'Improve description',
  isImproving = false,
}: Props) {
  const isEmpty = editor?.isEmpty ?? true;
  const disabled = isEmpty && !isImproving;

  const handleClick = () => {
    if (isImproving) {
      onStop?.();
    } else if (!disabled) {
      onImprove?.();
    }
  };

  const tooltip = disabled ? `${label} — add content first` : isImproving ? 'Click to stop Caty' : label;

  return (
    <CatyIconCTA
      tooltip={tooltip}
      onClick={handleClick}
      isLoading={isImproving}
      disabled={disabled && !isImproving}
      size={20}
      data-testid="catalyst-desc-toolbar-improve"
    />
  );
}
