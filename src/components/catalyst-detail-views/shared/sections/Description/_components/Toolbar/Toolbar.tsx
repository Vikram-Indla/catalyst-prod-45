/**
 * Toolbar — static toolbar that lives INSIDE the editor shell.
 *
 * Order (mirrors Jira's description toolbar):
 *   Improve | TextStyles | Bold + InlineFmt chevron | BulletList + Lists chevron
 *   | TextColor | Image | CodeSnippet | Emoji | InsertElement | Link
 *   | Undo | Redo | History
 *
 * No visible dividers between groups — Jira's toolbar is flat.
 * Background is transparent so the shell border owns the visual frame.
 */
import type { Editor } from '@tiptap/react';
import { ImproveButton } from './buttons/ImproveButton';
import { TextStylesDropdown } from './buttons/TextStylesDropdown';
import { BoldButton } from './buttons/BoldButton';
import { InlineFormattingDropdown } from './buttons/InlineFormattingDropdown';
import { BulletListButton } from './buttons/BulletListButton';
import { ListsDropdown } from './buttons/ListsDropdown';
import { TextColorPicker } from './buttons/TextColorPicker';
import { ImageUploadButton } from './buttons/ImageUploadButton';
import { CodeSnippetButton } from './buttons/CodeSnippetButton';
import { EmojiButton } from './buttons/EmojiButton';
import { InsertElementButton } from './buttons/InsertElementButton';
import { LinkButton } from './buttons/LinkButton';
import { UndoButton } from './buttons/UndoButton';
import { RedoButton } from './buttons/RedoButton';
import { HistoryButton } from './buttons/HistoryButton';
import { MicButton } from './buttons/MicButton';

export interface ToolbarProps {
  editor: Editor | null;
  onImprove?: () => void;
  onStop?: () => void;
  /** Improve-button label. Defaults to "Improve description". */
  improveLabel?: string;
  isImproving?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
  historyAvailable?: boolean;
  onOpenSlashMenu?: (anchor: HTMLElement) => void;
  onOpenEmojiPanel?: (anchor: HTMLElement) => void;
  /** Toggle mic-driven voice recording. */
  onMicToggle?: () => void;
  micActive?: boolean;
  micSupported?: boolean;
  voiceMode?: 'auto' | 'en' | 'ar';
  onVoiceModeChange?: (mode: 'auto' | 'en' | 'ar') => void;
}

export function Toolbar({
  editor,
  onImprove,
  onStop,
  improveLabel,
  isImproving,
  onImageUpload,
  historyAvailable = false,
  onOpenSlashMenu,
  onOpenEmojiPanel,
  onMicToggle,
  micActive = false,
  micSupported = true,
  voiceMode = 'auto',
  onVoiceModeChange,
}: ToolbarProps) {
  if (!editor) return null;

  return (
    <div
      className="catalyst-description-toolbar"
      role="toolbar"
      aria-label="Description editor toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        padding: '6px 8px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface, #FFFFFF)',
        flexShrink: 0,
      }}
    >
      {micSupported && (
        <MicButton
          active={micActive}
          onClick={onMicToggle}
          voiceMode={voiceMode}
          onVoiceModeChange={onVoiceModeChange}
        />
      )}
      <ImproveButton
        editor={editor}
        onImprove={onImprove}
        onStop={onStop}
        label={improveLabel}
        isImproving={isImproving}
      />
      <TextStylesDropdown editor={editor} />
      <BoldButton editor={editor} />
      <InlineFormattingDropdown editor={editor} />
      <BulletListButton editor={editor} />
      <ListsDropdown editor={editor} />
      <TextColorPicker editor={editor} />
      <ImageUploadButton editor={editor} onUpload={onImageUpload} />
      <CodeSnippetButton editor={editor} />
      <EmojiButton onOpen={onOpenEmojiPanel} />
      <InsertElementButton onOpen={onOpenSlashMenu} />
      <LinkButton editor={editor} />
      <UndoButton editor={editor} />
      <RedoButton editor={editor} />
      <HistoryButton available={historyAvailable} />
    </div>
  );
}
