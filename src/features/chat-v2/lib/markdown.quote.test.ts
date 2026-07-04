import { describe, it, expect } from 'vitest';
import { renderMarkdownInline, htmlToMarkdown } from './markdown';

describe('renderMarkdownInline blockquotes', () => {
  it('renders a single-line quote as <blockquote>', () => {
    const html = renderMarkdownInline('> hello');
    expect(html).toContain('<blockquote');
    expect(html).toContain('hello');
    expect(html).toContain('</blockquote>');
  });

  it('groups contiguous "> " lines into ONE blockquote joined with <br/>', () => {
    const html = renderMarkdownInline('> first\n> second\n> third');
    expect(html.match(/<blockquote/g)?.length).toBe(1);
    expect(html).toContain('first<br/>second<br/>third');
  });

  it('applies inline markdown (bold + mention) inside the quote', () => {
    const html = renderMarkdownInline('> **bold** @Vikram', 'vikram');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('cv2-mention');
  });

  it('closes the quote when a normal line follows', () => {
    const html = renderMarkdownInline('> quoted\nafter');
    expect(html).toMatch(/<\/blockquote>after/);
    expect(html.match(/<blockquote/g)?.length).toBe(1);
  });

  it('accepts a bare ">" as an empty quote line', () => {
    const html = renderMarkdownInline('> a\n>\n> b');
    expect(html.match(/<blockquote/g)?.length).toBe(1);
    expect(html).toContain('a<br/><br/>b');
  });

  it('separates two runs split by a normal line into two blockquotes', () => {
    const html = renderMarkdownInline('> a\nmiddle\n> b');
    expect(html.match(/<blockquote/g)?.length).toBe(2);
  });

  it('closes an open list when a quote line arrives', () => {
    const html = renderMarkdownInline('- item\n> quoted');
    expect(html).toMatch(/<\/ul><blockquote/);
  });

  it('does not treat a fence opener inside a quote as special', () => {
    const html = renderMarkdownInline('> ```\n> code');
    expect(html).not.toContain('<pre');
    expect(html.match(/<blockquote/g)?.length).toBe(1);
  });

  it('styles the quote with tokens only (no bare colors)', () => {
    const html = renderMarkdownInline('> hello');
    expect(html).toContain('var(--cv2-border-strong)');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
  });
});

describe('htmlToMarkdown blockquote roundtrip', () => {
  it('serialises <blockquote> lines back to "> " markdown', () => {
    const md = htmlToMarkdown('<blockquote>a<br>b</blockquote>');
    expect(md).toBe('> a\n> b');
  });

  it('serialises a single-line blockquote', () => {
    const md = htmlToMarkdown('<blockquote>only</blockquote>');
    expect(md).toBe('> only');
  });

  it('round-trips render → htmlToMarkdown', () => {
    const md = htmlToMarkdown(renderMarkdownInline('> a\n> b'));
    expect(md).toBe('> a\n> b');
  });
});
