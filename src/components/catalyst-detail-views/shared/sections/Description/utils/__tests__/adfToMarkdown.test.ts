import { describe, it, expect } from 'vitest';
import { adfToMarkdown } from '../adfToMarkdown';
import type { AdfDoc } from '../adfToTiptap';

const doc = (content: unknown[]): AdfDoc => ({
  type: 'doc',
  version: 1,
  content: content as AdfDoc['content'],
});

describe('adfToMarkdown — empty / trivial', () => {
  it('returns empty string for null', () => {
    expect(adfToMarkdown(null)).toBe('');
  });

  it('returns empty string for a doc with no content', () => {
    expect(adfToMarkdown(doc([]))).toBe('');
  });

  it('returns empty string for a doc with one empty paragraph', () => {
    expect(adfToMarkdown(doc([{ type: 'paragraph' }]))).toBe('');
  });
});

describe('adfToMarkdown — prose blocks', () => {
  it('serializes a single paragraph as plain text', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'hello world' }],
        },
      ]),
    );
    expect(out).toBe('hello world');
  });

  it('separates multiple paragraphs with a blank line', () => {
    const out = adfToMarkdown(
      doc([
        { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
      ]),
    );
    expect(out).toBe('one\n\ntwo');
  });

  it('serializes headings h1..h3 with correct # prefix', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'H1' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'H2' }],
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'H3' }],
        },
      ]),
    );
    expect(out).toBe('# H1\n\n## H2\n\n### H3');
  });

  it('serializes a blockquote with a > prefix on each line', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'blockquote',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'quoted' }] },
          ],
        },
      ]),
    );
    expect(out).toBe('> quoted');
  });

  it('serializes a fenced code block with language', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'codeBlock',
          attrs: { language: 'ts' },
          content: [{ type: 'text', text: 'const x = 1;' }],
        },
      ]),
    );
    expect(out).toBe('```ts\nconst x = 1;\n```');
  });

  it('serializes a horizontal rule as ---', () => {
    const out = adfToMarkdown(doc([{ type: 'rule' }]));
    expect(out).toBe('---');
  });
});

describe('adfToMarkdown — lists', () => {
  it('serializes a bullet list with - prefix', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'first' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'second' }],
                },
              ],
            },
          ],
        },
      ]),
    );
    expect(out).toBe('- first\n- second');
  });

  it('serializes an ordered list with 1. 2. ... numbering', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'one' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'two' }],
                },
              ],
            },
          ],
        },
      ]),
    );
    expect(out).toBe('1. one\n2. two');
  });
});

describe('adfToMarkdown — inline marks', () => {
  it('wraps strong text in **...**', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'hello ' },
            { type: 'text', text: 'bold', marks: [{ type: 'strong' }] },
          ],
        },
      ]),
    );
    expect(out).toBe('hello **bold**');
  });

  it('wraps em text in *...*', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'em ', marks: [{ type: 'em' }] },
          ],
        },
      ]),
    );
    expect(out).toBe('*em *');
  });

  it('wraps inline code in `...`', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'foo()', marks: [{ type: 'code' }] },
          ],
        },
      ]),
    );
    expect(out).toBe('`foo()`');
  });

  it('serializes a link as [text](href)', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Catalyst',
              marks: [
                { type: 'link', attrs: { href: 'https://example.com' } },
              ],
            },
          ],
        },
      ]),
    );
    expect(out).toBe('[Catalyst](https://example.com)');
  });
});

describe('adfToMarkdown — tables', () => {
  const simpleTable = doc([
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableHeader',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Field' }],
                },
              ],
            },
            {
              type: 'tableHeader',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Type' }],
                },
              ],
            },
          ],
        },
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Quantity' }],
                },
              ],
            },
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'number' }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  it('emits a GFM table with header row + separator row', () => {
    const out = adfToMarkdown(simpleTable);
    expect(out).toBe(
      '| Field | Type |\n| --- | --- |\n| Quantity | number |',
    );
  });

  it('treats first row as header even when cells are tableCell (not tableHeader)', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'a' }],
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'b' }],
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: '1' }],
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: '2' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    );
    expect(out).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |');
  });
});

describe('adfToMarkdown — multi-block mixed document', () => {
  it('preserves structure across heading, paragraph, list, table', () => {
    const out = adfToMarkdown(
      doc([
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Intro paragraph.' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'one' }],
                },
              ],
            },
          ],
        },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'k' }],
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'v' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    );
    expect(out).toBe(
      '# Title\n\nIntro paragraph.\n\n- one\n\n| k |\n| --- |\n| v |',
    );
  });
});
