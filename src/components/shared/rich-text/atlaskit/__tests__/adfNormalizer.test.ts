import { describe, it, expect } from 'vitest';
import { normalizeAdfForAtlaskit, parseStoredDescriptionToAdf } from '../adfNormalizer';

describe('normalizeAdfForAtlaskit', () => {
  it('returns an empty doc for null/undefined', () => {
    expect(normalizeAdfForAtlaskit(null)).toEqual({
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    });
    expect(normalizeAdfForAtlaskit(undefined)).toEqual({
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    });
  });

  it('returns empty doc when input is not a doc', () => {
    expect(normalizeAdfForAtlaskit({ type: 'paragraph' } as any)).toEqual({
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    });
  });

  it('preserves a clean ADF doc unchanged in shape', () => {
    const input = {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'hello' }],
        },
      ],
    };
    const out = normalizeAdfForAtlaskit(input);
    expect(out.type).toBe('doc');
    expect(out.version).toBe(1);
    expect(out.content?.[0]?.type).toBe('paragraph');
    expect(out.content?.[0]?.content?.[0]).toEqual({ type: 'text', text: 'hello' });
  });

  it('coerces TipTap-style media (type=file with url) to external media', () => {
    const input = {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'mediaSingle',
          attrs: { layout: 'center' },
          content: [
            {
              type: 'media',
              attrs: { type: 'file', url: 'https://example.com/img.png', alt: 'pic' },
            },
          ],
        },
      ],
    };
    const out = normalizeAdfForAtlaskit(input);
    const media = out.content?.[0]?.content?.[0];
    expect(media?.type).toBe('media');
    expect(media?.attrs?.type).toBe('external');
    expect(media?.attrs?.url).toBe('https://example.com/img.png');
    expect(media?.attrs?.alt).toBe('pic');
  });

  it('drops mediaSingle nodes that have no usable url and no media id', () => {
    const input = {
      version: 1,
      type: 'doc',
      content: [
        { type: 'mediaSingle', content: [{ type: 'media', attrs: { type: 'file' } }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'after' }] },
      ],
    };
    const out = normalizeAdfForAtlaskit(input);
    expect(out.content).toHaveLength(1);
    expect(out.content?.[0]?.type).toBe('paragraph');
  });

  it('preserves canonical Atlassian Media file references with id', () => {
    const input = {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'mediaSingle',
          content: [{ type: 'media', attrs: { type: 'file', id: 'abc-123', collection: 'c1' } }],
        },
      ],
    };
    const out = normalizeAdfForAtlaskit(input);
    expect(out.content?.[0]?.content?.[0]?.attrs?.id).toBe('abc-123');
    expect(out.content?.[0]?.content?.[0]?.attrs?.type).toBe('file');
  });

  it('drops unknown top-level node types', () => {
    const input = {
      version: 1,
      type: 'doc',
      content: [
        { type: 'mysteryNode', attrs: { foo: 'bar' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'kept' }] },
      ],
    };
    const out = normalizeAdfForAtlaskit(input);
    expect(out.content).toHaveLength(1);
    expect(out.content?.[0]?.type).toBe('paragraph');
  });

  it('preserves marks on text nodes', () => {
    const input = {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'bold link',
              marks: [
                { type: 'strong' },
                { type: 'link', attrs: { href: 'https://x.test' } },
              ],
            },
          ],
        },
      ],
    };
    const out = normalizeAdfForAtlaskit(input);
    const text = out.content?.[0]?.content?.[0];
    expect(text?.marks).toHaveLength(2);
    expect(text?.marks?.[0]).toEqual({ type: 'strong' });
    expect(text?.marks?.[1]).toEqual({ type: 'link', attrs: { href: 'https://x.test' } });
  });

  it('always returns at least one paragraph in content', () => {
    const out = normalizeAdfForAtlaskit({ type: 'doc', content: [] });
    expect(out.content).toHaveLength(1);
    expect(out.content?.[0]?.type).toBe('paragraph');
  });
});

describe('parseStoredDescriptionToAdf', () => {
  it('parses a JSON string of ADF', () => {
    const adf = { version: 1, type: 'doc', content: [{ type: 'paragraph', content: [] }] };
    const out = parseStoredDescriptionToAdf(JSON.stringify(adf));
    expect(out.type).toBe('doc');
  });

  it('accepts an ADF object directly (jsonb column case)', () => {
    const adf = { version: 1, type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] };
    const out = parseStoredDescriptionToAdf(adf);
    expect(out.content?.[0]?.content?.[0]).toEqual({ type: 'text', text: 'x' });
  });

  it('wraps plain text into a single paragraph', () => {
    const out = parseStoredDescriptionToAdf('hello world');
    expect(out.content?.[0]?.type).toBe('paragraph');
    expect(out.content?.[0]?.content?.[0]).toEqual({ type: 'text', text: 'hello world' });
  });

  it('returns an empty doc for null/empty input', () => {
    expect(parseStoredDescriptionToAdf(null).content?.[0]?.type).toBe('paragraph');
    expect(parseStoredDescriptionToAdf('').content?.[0]?.type).toBe('paragraph');
    expect(parseStoredDescriptionToAdf('   ').content?.[0]?.type).toBe('paragraph');
  });

  it('falls back to plain-text wrap when JSON-looking string fails to parse', () => {
    const out = parseStoredDescriptionToAdf('{not really json');
    expect(out.content?.[0]?.content?.[0]).toEqual({ type: 'text', text: '{not really json' });
  });
});
