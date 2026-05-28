/**
 * Panel — info / warning / success / error / note block from Jira ADF.
 *
 * ADF shape:
 *   { type: 'panel', attrs: { panelType: 'info' }, content: [block+] }
 *
 * Rendered as a colored block with a left border + tinted background.
 * Five variants matching Jira's panel macro.
 */
import { Node, mergeAttributes } from '@tiptap/core';

export type PanelType = 'info' | 'warning' | 'success' | 'error' | 'note';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    panel: {
      setPanel: (panelType?: PanelType) => ReturnType;
      togglePanel: (panelType?: PanelType) => ReturnType;
      unsetPanel: () => ReturnType;
    };
  }
}

export const Panel = Node.create({
  name: 'panel',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      panelType: {
        default: 'info' as PanelType,
        parseHTML: (el) => el.getAttribute('data-panel-type') ?? 'info',
        renderHTML: (attrs) => ({ 'data-panel-type': attrs.panelType }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-panel-type]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const t = node.attrs.panelType as PanelType;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `catalyst-panel catalyst-panel-${t}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setPanel:
        (panelType = 'info') =>
        ({ commands }) =>
          commands.wrapIn(this.name, { panelType }),
      togglePanel:
        (panelType = 'info') =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { panelType }),
      unsetPanel:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
