import { describe, it, expect } from 'vitest';
import { catyMarkdownToAdf } from '../catyMarkdownToAdf';

describe('catyMarkdownToAdf — GFM table parsing', () => {
  it('parses a simple 2x2 GFM table into an ADF table with header row', () => {
    const md = ['| h1 | h2 |', '| --- | --- |', '| a | b |'].join('\n');
    const adf = catyMarkdownToAdf(md);

    expect(adf.content).toHaveLength(1);
    const table = adf.content[0] as Record<string, unknown>;
    expect(table.type).toBe('table');

    const rows = table.content as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);

    // First row: headers
    const headerCells = rows[0].content as Array<Record<string, unknown>>;
    expect(headerCells).toHaveLength(2);
    expect(headerCells[0].type).toBe('tableHeader');
    expect(headerCells[1].type).toBe('tableHeader');

    const h1Para = (headerCells[0].content as Array<Record<string, unknown>>)[0];
    expect(h1Para.type).toBe('paragraph');
    const h1Text = (h1Para.content as Array<Record<string, unknown>>)[0];
    expect(h1Text.text).toBe('h1');

    // Second row: data cells
    const dataCells = rows[1].content as Array<Record<string, unknown>>;
    expect(dataCells).toHaveLength(2);
    expect(dataCells[0].type).toBe('tableCell');
    expect(dataCells[1].type).toBe('tableCell');
    const aPara = (dataCells[0].content as Array<Record<string, unknown>>)[0];
    const aText = (aPara.content as Array<Record<string, unknown>>)[0];
    expect(aText.text).toBe('a');
  });

  it('parses a table with multiple data rows', () => {
    const md = [
      '| name | qty |',
      '| --- | --- |',
      '| Apples | 3 |',
      '| Pears | 5 |',
    ].join('\n');
    const adf = catyMarkdownToAdf(md);
    const table = adf.content[0] as Record<string, unknown>;
    const rows = table.content as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(3); // 1 header + 2 data

    const r2 = (rows[2].content as Array<Record<string, unknown>>)[0];
    const r2Para = (r2.content as Array<Record<string, unknown>>)[0];
    const r2Text = (r2Para.content as Array<Record<string, unknown>>)[0];
    expect(r2Text.text).toBe('Pears');
  });

  it('parses a single-column table', () => {
    const md = ['| Field |', '| --- |', '| Quantity |'].join('\n');
    const adf = catyMarkdownToAdf(md);
    const table = adf.content[0] as Record<string, unknown>;
    const rows = table.content as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    const headerCells = rows[0].content as Array<Record<string, unknown>>;
    expect(headerCells).toHaveLength(1);
    expect(headerCells[0].type).toBe('tableHeader');
  });

  it('round-trips through adfToMarkdown → catyMarkdownToAdf without losing cells', () => {
    const md = ['| Field | Type |', '| --- | --- |', '| Quantity | number |'].join(
      '\n',
    );
    const adf = catyMarkdownToAdf(md);
    const table = adf.content[0] as Record<string, unknown>;
    const rows = table.content as Array<Record<string, unknown>>;
    // header: Field, Type
    const h = rows[0].content as Array<Record<string, unknown>>;
    expect(
      (
        (h[0].content as Array<Record<string, unknown>>)[0].content as Array<
          Record<string, unknown>
        >
      )[0].text,
    ).toBe('Field');
    expect(
      (
        (h[1].content as Array<Record<string, unknown>>)[0].content as Array<
          Record<string, unknown>
        >
      )[0].text,
    ).toBe('Type');
    // data: Quantity, number
    const d = rows[1].content as Array<Record<string, unknown>>;
    expect(
      (
        (d[0].content as Array<Record<string, unknown>>)[0].content as Array<
          Record<string, unknown>
        >
      )[0].text,
    ).toBe('Quantity');
  });

  it('lets non-table blocks coexist with a table in the same doc', () => {
    const md = [
      '# Title',
      '',
      '| h1 |',
      '| --- |',
      '| a |',
      '',
      'After table.',
    ].join('\n');
    const adf = catyMarkdownToAdf(md);
    expect(adf.content).toHaveLength(3);
    expect((adf.content[0] as Record<string, unknown>).type).toBe('heading');
    expect((adf.content[1] as Record<string, unknown>).type).toBe('table');
    expect((adf.content[2] as Record<string, unknown>).type).toBe('paragraph');
  });
});
