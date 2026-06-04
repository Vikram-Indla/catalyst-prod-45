import { describe, it, expect } from 'vitest';
import { catyMarkdownToAdf } from '../catyMarkdownToAdf';

type Block = Record<string, unknown> & { content?: Block[] };

function firstParagraphContent(md: string): Block[] {
  const doc = catyMarkdownToAdf(md);
  const para = doc.content[0] as Block;
  expect(para.type).toBe('paragraph');
  return (para.content ?? []) as Block[];
}

describe('catyMarkdownToAdf — inline marks', () => {
  it('wraps **bold** as a text node with strong mark', () => {
    const c = firstParagraphContent('Hello **world**');
    expect(c).toEqual([
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'world', marks: [{ type: 'strong' }] },
    ]);
  });

  it('wraps *italic* as a text node with em mark', () => {
    const c = firstParagraphContent('be *quick* now');
    expect(c).toEqual([
      { type: 'text', text: 'be ' },
      { type: 'text', text: 'quick', marks: [{ type: 'em' }] },
      { type: 'text', text: ' now' },
    ]);
  });

  it('wraps _italic_ as a text node with em mark', () => {
    const c = firstParagraphContent('go _fast_');
    expect(c).toEqual([
      { type: 'text', text: 'go ' },
      { type: 'text', text: 'fast', marks: [{ type: 'em' }] },
    ]);
  });

  it('wraps `code` as a text node with code mark', () => {
    const c = firstParagraphContent('run `npm test`');
    expect(c).toEqual([
      { type: 'text', text: 'run ' },
      { type: 'text', text: 'npm test', marks: [{ type: 'code' }] },
    ]);
  });

  it('parses [label](href) as a text node with link mark', () => {
    const c = firstParagraphContent('see [docs](https://x.com/d)');
    expect(c).toEqual([
      { type: 'text', text: 'see ' },
      {
        type: 'text',
        text: 'docs',
        marks: [{ type: 'link', attrs: { href: 'https://x.com/d' } }],
      },
    ]);
  });

  it('handles a line with ONLY a bold span (label pattern like **Examples:**)', () => {
    const c = firstParagraphContent('**Examples:**');
    expect(c).toEqual([
      { type: 'text', text: 'Examples:', marks: [{ type: 'strong' }] },
    ]);
  });

  it('mixes plain + bold + italic in one paragraph', () => {
    const c = firstParagraphContent('a **b** c *d*');
    expect(c).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'text', text: 'b', marks: [{ type: 'strong' }] },
      { type: 'text', text: ' c ' },
      { type: 'text', text: 'd', marks: [{ type: 'em' }] },
    ]);
  });

  it('falls back to plain text when no inline markers are present', () => {
    const c = firstParagraphContent('plain old text');
    expect(c).toEqual([{ type: 'text', text: 'plain old text' }]);
  });

  it('applies inline marks inside headings', () => {
    const doc = catyMarkdownToAdf('## Edit **Challenge**');
    const h = doc.content[0] as Block;
    expect(h.type).toBe('heading');
    expect(h.content).toEqual([
      { type: 'text', text: 'Edit ' },
      { type: 'text', text: 'Challenge', marks: [{ type: 'strong' }] },
    ]);
  });

  it('applies inline marks inside bullet items', () => {
    const doc = catyMarkdownToAdf('- buy **milk**');
    const list = doc.content[0] as Block;
    expect(list.type).toBe('bulletList');
    const items = list.content as Block[];
    const itemPara = (items[0].content as Block[])[0];
    expect(itemPara.type).toBe('paragraph');
    expect(itemPara.content).toEqual([
      { type: 'text', text: 'buy ' },
      { type: 'text', text: 'milk', marks: [{ type: 'strong' }] },
    ]);
  });

  it('applies inline marks inside ordered list items', () => {
    const doc = catyMarkdownToAdf('1. click **Save**');
    const list = doc.content[0] as Block;
    expect(list.type).toBe('orderedList');
    const items = list.content as Block[];
    const itemPara = (items[0].content as Block[])[0];
    expect(itemPara.content).toEqual([
      { type: 'text', text: 'click ' },
      { type: 'text', text: 'Save', marks: [{ type: 'strong' }] },
    ]);
  });
});
