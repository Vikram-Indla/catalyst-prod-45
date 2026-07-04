import { describe, it, expect } from 'vitest';
import { renderMarkdownInline, htmlToMarkdown } from './markdown';

describe('renderMarkdownInline fenced code blocks', () => {
  it('renders a fenced block as <pre><code>', () => {
    const html = renderMarkdownInline('```\nconst a = 1;\nconst b = 2;\n```');
    expect(html).toContain('<pre');
    expect(html).toContain('<code>const a = 1;\nconst b = 2;</code>');
  });

  it('escapes HTML inside the fence', () => {
    const html = renderMarkdownInline('```\n<script>alert(1)</script>\n```');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('does not apply inline markdown inside the fence', () => {
    const html = renderMarkdownInline('```\n**not bold** @nobody\n```');
    expect(html).toContain('**not bold** @nobody');
    expect(html).not.toContain('<strong>');
    expect(html).not.toContain('cv2-mention');
  });

  it('tolerates a language tag on the opening fence', () => {
    const html = renderMarkdownInline('```ts\nlet x = 1;\n```');
    expect(html).toContain('<code>let x = 1;</code>');
    expect(html).not.toContain('```');
  });

  it('flushes an unterminated fence at EOF', () => {
    const html = renderMarkdownInline('```\ndangling');
    expect(html).toContain('<code>dangling</code>');
  });

  it('keeps surrounding prose rendering normally', () => {
    const html = renderMarkdownInline('before **b**\n```\ncode\n```\nafter');
    expect(html).toContain('<strong>b</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('after');
  });

  it('forces LTR on code blocks', () => {
    const html = renderMarkdownInline('```\nمرحبا = 1\n```');
    expect(html).toContain('dir="ltr"');
  });

  it('accepts content on the opening fence line (composer newline quirk)', () => {
    const html = renderMarkdownInline('```const x = 1;\nreturn x;\n```');
    expect(html).toContain('<code>const x = 1;\nreturn x;</code>');
  });

  it('renders a one-line fenced block', () => {
    const html = renderMarkdownInline('```npm ci```');
    expect(html).toContain('<code>npm ci</code>');
    expect(html).not.toContain('```');
  });

  it('accepts a trailing close on a content line', () => {
    const html = renderMarkdownInline('```\nlast line```');
    expect(html).toContain('<code>last line</code>');
  });
});

describe('htmlToMarkdown pre roundtrip', () => {
  it('serialises <pre><code> back to a fenced block', () => {
    const md = htmlToMarkdown('<pre><code>const a = 1;\nconst b = 2;</code></pre>');
    expect(md).toBe('```\nconst a = 1;\nconst b = 2;\n```');
  });

  it('keeps inline code as single backticks', () => {
    const md = htmlToMarkdown('<div>use <code>npm ci</code> here</div>');
    expect(md).toBe('use `npm ci` here');
  });
});
