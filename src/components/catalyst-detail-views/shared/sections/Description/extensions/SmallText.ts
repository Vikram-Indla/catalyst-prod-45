/**
 * SmallText — custom Tiptap mark that renders text at 12px / 400 / muted.
 *
 * No ADF equivalent. When the doc is serialized back for Jira sync, the
 * mark is stripped by tiptapToAdf and the text appears at the default
 * paragraph size on Jira's side. Acknowledged tradeoff for v1.
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface SmallTextOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smallText: {
      setSmallText: () => ReturnType;
      toggleSmallText: () => ReturnType;
      unsetSmallText: () => ReturnType;
    };
  }
}

export const SmallText = Mark.create<SmallTextOptions>({
  name: 'smallText',

  addOptions() {
    return {
      HTMLAttributes: {
        style:
          'font-size:12px;line-height:16px;color:var(--ds-text-subtle);',
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'small' },
      { style: 'font-size:12px' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['small', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSmallText:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleSmallText:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetSmallText:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
