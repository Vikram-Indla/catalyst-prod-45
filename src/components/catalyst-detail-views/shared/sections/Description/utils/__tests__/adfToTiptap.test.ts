/**
 * ADF ↔ Tiptap adapter tests.
 *
 * Coverage targets:
 *   - Empty / null / undefined inputs normalize correctly
 *   - Doc structure passes through (version stripped on the way out,
 *     re-added on the way back in)
 *   - All supported marks round-trip without loss
 *   - All supported block nodes round-trip without loss
 *   - Images (ADF mediaSingle > media) ↔ (Tiptap image)
 *   - Mentions preserve id + label
 *   - Unknown nodes degrade gracefully without crashing
 */
import { describe, it, expect } from 'vitest';
import { adfToTiptap, EMPTY_TIPTAP_DOC, type AdfDoc } from '../adfToTiptap';
import { tiptapToAdf } from '../tiptapToAdf';

describe('adfToTiptap — empty inputs', () => {
  it('returns EMPTY_TIPTAP_DOC for null input', () => {
    expect(adfToTiptap(null)).toEqual(EMPTY_TIPTAP_DOC);
  });

  it('returns EMPTY_TIPTAP_DOC for undefined input', () => {
    expect(adfToTiptap(undefined)).toEqual(EMPTY_TIPTAP_DOC);
  });

  it('returns EMPTY_TIPTAP_DOC for an ADF doc with no content array', () => {
    expect(adfToTiptap({ type: 'doc', version: 1 })).toEqual(EMPTY_TIPTAP_DOC);
  });

  it('returns EMPTY_TIPTAP_DOC for an ADF doc with an empty content array', () => {
    expect(adfToTiptap({ type: 'doc', version: 1, content: [] })).toEqual(EMPTY_TIPTAP_DOC);
  });
});

describe('adfToTiptap — single paragraph', () => {
  it('passes a single empty paragraph through unchanged (minus version)', () => {
    const adf: AdfDoc = { type: 'doc', version: 1, content: [{ type: 'paragraph' }] };
    expect(adfToTiptap(adf)).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('passes a paragraph with plain text through unchanged', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
      ],
    };
    expect(adfToTiptap(adf)).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
      ],
    });
  });
});

describe('adfToTiptap — version stripping', () => {
  it('does not include `version` on the returned Tiptap doc', () => {
    const adf: AdfDoc = { type: 'doc', version: 1, content: [{ type: 'paragraph' }] };
    expect(adfToTiptap(adf)).not.toHaveProperty('version');
  });
});

describe('adfToTiptap — headings', () => {
  it('converts heading levels 1-6 preserving level attr', () => {
    for (let level = 1; level <= 6; level++) {
      const adf: AdfDoc = {
        type: 'doc',
        version: 1,
        content: [{ type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'H' }] }],
      };
      const result = adfToTiptap(adf);
      expect(result.content?.[0]).toEqual({
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: 'H' }],
      });
    }
  });
});

describe('adfToTiptap — marks', () => {
  it('maps ADF strong → Tiptap bold', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'B', marks: [{ type: 'strong' }] }],
      }],
    };
    const text = adfToTiptap(adf).content?.[0].content?.[0];
    expect(text?.marks).toEqual([{ type: 'bold' }]);
  });

  it('maps ADF em → Tiptap italic', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'I', marks: [{ type: 'em' }] }],
      }],
    };
    const text = adfToTiptap(adf).content?.[0].content?.[0];
    expect(text?.marks).toEqual([{ type: 'italic' }]);
  });

  it('maps ADF subsup {type:sub} → Tiptap subscript', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: '2', marks: [{ type: 'subsup', attrs: { type: 'sub' } }] }],
      }],
    };
    const text = adfToTiptap(adf).content?.[0].content?.[0];
    expect(text?.marks).toEqual([{ type: 'subscript' }]);
  });

  it('maps ADF subsup {type:sup} → Tiptap superscript', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: '2', marks: [{ type: 'subsup', attrs: { type: 'sup' } }] }],
      }],
    };
    const text = adfToTiptap(adf).content?.[0].content?.[0];
    expect(text?.marks).toEqual([{ type: 'superscript' }]);
  });

  it('maps ADF link with href → Tiptap link with href', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text', text: 'click',
          marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
        }],
      }],
    };
    const text = adfToTiptap(adf).content?.[0].content?.[0];
    expect(text?.marks).toEqual([{ type: 'link', attrs: { href: 'https://example.com' } }]);
  });

  it('maps ADF textColor → Tiptap textStyle with color attr', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text', text: 'red',
          marks: [{ type: 'textColor', attrs: { color: 'var(--ds-text-danger, #FF0000)' } }],
        }],
      }],
    };
    const text = adfToTiptap(adf).content?.[0].content?.[0];
    expect(text?.marks).toEqual([{ type: 'textStyle', attrs: { color: 'var(--ds-text-danger, var(--ds-text-danger, #AE2A19))' } }]);
  });
});

describe('adfToTiptap — block nodes', () => {
  it('converts bulletList with listItems', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
        }],
      }],
    };
    expect(adfToTiptap(adf).content?.[0]).toEqual({
      type: 'bulletList',
      content: [{
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
      }],
    });
  });

  it('converts orderedList with listItems', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'orderedList',
        content: [{
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
        }],
      }],
    };
    expect(adfToTiptap(adf).content?.[0].type).toBe('orderedList');
  });

  it('converts taskList with DONE state → checked', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { state: 'DONE' },
          content: [{ type: 'text', text: 'done' }],
        }],
      }],
    };
    const taskItem = adfToTiptap(adf).content?.[0].content?.[0];
    expect(taskItem?.attrs).toEqual({ checked: true });
  });

  it('converts codeBlock with language attr', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'codeBlock',
        attrs: { language: 'typescript' },
        content: [{ type: 'text', text: 'const x = 1;' }],
      }],
    };
    expect(adfToTiptap(adf).content?.[0]).toEqual({
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const x = 1;' }],
    });
  });

  it('converts hardBreak as-is', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'hardBreak' }] }],
    };
    expect(adfToTiptap(adf).content?.[0].content?.[0]).toEqual({ type: 'hardBreak' });
  });

  it('converts ADF rule → Tiptap horizontalRule', () => {
    const adf: AdfDoc = { type: 'doc', version: 1, content: [{ type: 'rule' }] };
    expect(adfToTiptap(adf).content?.[0]).toEqual({ type: 'horizontalRule' });
  });
});

describe('adfToTiptap — mediaSingle → image', () => {
  it('extracts media URL/alt into a flat image node', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'mediaSingle',
        attrs: { layout: 'center' },
        content: [{
          type: 'media',
          attrs: { type: 'external', url: 'https://x.com/i.png', alt: 'pic' },
        }],
      }],
    };
    expect(adfToTiptap(adf).content?.[0]).toEqual({
      type: 'image',
      attrs: { src: 'https://x.com/i.png', alt: 'pic' },
    });
  });
});

describe('adfToTiptap — mention', () => {
  it('maps ADF mention {id, text} → Tiptap mention {id, label}', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'paragraph',
        content: [{ type: 'mention', attrs: { id: 'user-1', text: '@Alice' } }],
      }],
    };
    expect(adfToTiptap(adf).content?.[0].content?.[0]).toEqual({
      type: 'mention',
      attrs: { id: 'user-1', label: '@Alice' },
    });
  });
});

describe('adfToTiptap — unknown nodes preserved', () => {
  it('wraps unknown block nodes in unsupportedBlock to preserve ADF', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{ type: 'someExoticBlock', attrs: { foo: 'bar' } }, { type: 'paragraph' }],
    };
    const result = adfToTiptap(adf);
    expect(result.content?.[0].type).toBe('unsupportedBlock');
    expect(JSON.parse((result.content?.[0].attrs as { adf: string }).adf)).toEqual({
      type: 'someExoticBlock', attrs: { foo: 'bar' },
    });
    expect(result.content?.[1]).toEqual({ type: 'paragraph' });
  });
});

describe('adfToTiptap — tables', () => {
  it('passes table > tableRow > tableHeader/tableCell through with attrs', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'table',
        attrs: { isNumberColumnEnabled: false, layout: 'default' },
        content: [{
          type: 'tableRow',
          content: [
            {
              type: 'tableHeader',
              attrs: { colspan: 1, rowspan: 1 },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'h' }] }],
            },
            {
              type: 'tableCell',
              attrs: { colspan: 1, rowspan: 1 },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'c' }] }],
            },
          ],
        }],
      }],
    };
    const result = adfToTiptap(adf);
    expect(result.content?.[0].type).toBe('table');
    expect(result.content?.[0].content?.[0].type).toBe('tableRow');
    expect(result.content?.[0].content?.[0].content?.[0].type).toBe('tableHeader');
    expect(result.content?.[0].content?.[0].content?.[1].type).toBe('tableCell');
  });
});

describe('adfToTiptap — panel', () => {
  it('maps panel with panelType through unchanged', () => {
    const adf: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [{
        type: 'panel',
        attrs: { panelType: 'warning' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'warn!' }] }],
      }],
    };
    const result = adfToTiptap(adf);
    expect(result.content?.[0]).toEqual({
      type: 'panel',
      attrs: { panelType: 'warning' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'warn!' }] }],
    });
  });
});

describe('adfToTiptap — status / date / inlineCard', () => {
  it('preserves status attrs', () => {
    const adf: AdfDoc = {
      type: 'doc', version: 1,
      content: [{ type: 'paragraph', content: [{
        type: 'status', attrs: { text: 'In Progress', color: 'blue', localId: 'abc' },
      }] }],
    };
    const status = adfToTiptap(adf).content?.[0].content?.[0];
    expect(status?.type).toBe('status');
    expect(status?.attrs).toMatchObject({ text: 'In Progress', color: 'blue', localId: 'abc' });
  });

  it('preserves date timestamp as string', () => {
    const adf: AdfDoc = {
      type: 'doc', version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'date', attrs: { timestamp: '1700000000000' } }] }],
    };
    const date = adfToTiptap(adf).content?.[0].content?.[0];
    expect(date).toEqual({ type: 'date', attrs: { timestamp: '1700000000000' } });
  });

  it('preserves inlineCard url', () => {
    const adf: AdfDoc = {
      type: 'doc', version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'inlineCard', attrs: { url: 'https://x.com' } }] }],
    };
    const card = adfToTiptap(adf).content?.[0].content?.[0];
    expect(card).toEqual({ type: 'inlineCard', attrs: { url: 'https://x.com', data: null } });
  });
});

describe('round-trip — unsupported nodes preserved losslessly', () => {
  it('an unknown ADF node survives adfToTiptap → tiptapToAdf unchanged', async () => {
    const { tiptapToAdf } = await import('../tiptapToAdf');
    const original: AdfDoc = {
      type: 'doc', version: 1,
      content: [
        { type: 'expand', attrs: { title: 'Click to expand' }, content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'hidden' }] },
        ] },
        { type: 'paragraph' },
      ],
    };
    const tiptap = adfToTiptap(original);
    const back = tiptapToAdf(tiptap);
    expect(back).toEqual(original);
  });
});

describe('round-trip — tables preserve structure', () => {
  it('table → tiptap → adf yields the same structure', async () => {
    const { tiptapToAdf } = await import('../tiptapToAdf');
    const original: AdfDoc = {
      type: 'doc', version: 1,
      content: [{
        type: 'table',
        attrs: { isNumberColumnEnabled: false, layout: 'default' },
        content: [{
          type: 'tableRow',
          content: [
            { type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
            { type: 'tableCell', attrs: { colspan: 1, rowspan: 1 },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
          ],
        }],
      }],
    };
    const back = tiptapToAdf(adfToTiptap(original));
    expect(back).toEqual(original);
  });
});

describe('tiptapToAdf — empty inputs', () => {
  it('returns empty ADF doc for null', () => {
    expect(tiptapToAdf(null)).toEqual({
      type: 'doc', version: 1, content: [{ type: 'paragraph' }],
    });
  });

  it('always emits version: 1 at the doc root', () => {
    const result = tiptapToAdf({
      type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
    });
    expect(result.version).toBe(1);
  });
});

describe('tiptapToAdf — marks reverse', () => {
  it('maps Tiptap bold → ADF strong', () => {
    const result = tiptapToAdf({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'B', marks: [{ type: 'bold' }] }],
      }],
    });
    expect(result.content?.[0].content?.[0].marks).toEqual([{ type: 'strong' }]);
  });

  it('maps Tiptap subscript → ADF subsup {type:sub}', () => {
    const result = tiptapToAdf({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: '2', marks: [{ type: 'subscript' }] }],
      }],
    });
    expect(result.content?.[0].content?.[0].marks).toEqual([{ type: 'subsup', attrs: { type: 'sub' } }]);
  });

  it('maps Tiptap textStyle{color} → ADF textColor', () => {
    const result = tiptapToAdf({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text', text: 'r',
          marks: [{ type: 'textStyle', attrs: { color: 'var(--ds-text-danger, #FF0000)' } }],
        }],
      }],
    });
    expect(result.content?.[0].content?.[0].marks).toEqual([{ type: 'textColor', attrs: { color: 'var(--ds-text-danger, var(--ds-text-danger, #AE2A19))' } }]);
  });

  it('drops unsupported marks (e.g. smallText) but keeps the text', () => {
    const result = tiptapToAdf({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'tiny', marks: [{ type: 'smallText' }] }],
      }],
    });
    expect(result.content?.[0].content?.[0]).toEqual({ type: 'text', text: 'tiny' });
  });
});

describe('tiptapToAdf — image reverse', () => {
  it('wraps Tiptap image as ADF mediaSingle > media', () => {
    const result = tiptapToAdf({
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'https://x.com/i.png', alt: 'pic' } }],
    });
    expect(result.content?.[0]).toEqual({
      type: 'mediaSingle',
      attrs: { layout: 'center' },
      content: [{
        type: 'media',
        attrs: { type: 'external', url: 'https://x.com/i.png', alt: 'pic' },
      }],
    });
  });
});

describe('round-trip — ADF → Tiptap → ADF', () => {
  it('preserves a doc with headings, marks, lists, link, and image', () => {
    const original: AdfDoc = {
      type: 'doc',
      version: 1,
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'bold ', marks: [{ type: 'strong' }] },
            { type: 'text', text: 'italic ', marks: [{ type: 'em' }] },
            {
              type: 'text', text: 'link',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            },
          ],
        },
        {
          type: 'bulletList',
          content: [{
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }],
          }],
        },
        {
          type: 'mediaSingle',
          attrs: { layout: 'center' },
          content: [{ type: 'media', attrs: { type: 'external', url: 'https://x.com/i.png', alt: 'pic' } }],
        },
      ],
    };
    const tiptap = adfToTiptap(original);
    const back = tiptapToAdf(tiptap);
    expect(back).toEqual(original);
  });
});
