import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.DOMParser = dom.window.DOMParser;
globalThis.window = dom.window;
import { normalizeVendorHtml, isVendorHtml } from '../pasteNormalizer.ts';
import { extractLinks } from '../extractLinks.ts';
import { blocksToText } from '../blocksToText.ts';

let pass=0, fail=0;
const ok=(n,c,e='')=>{ if(c){pass++;console.log('  ✓',n)}else{fail++;console.log('  ✗ FAIL',n,e)} };

console.log('\n[pasteNormalizer]');
ok('detects GDocs guid', isVendorHtml('<b id="docs-internal-guid-abc"><span>hi</span></b>'));
ok('detects Word mso', isVendorHtml('<p class="MsoListParagraph">x</p>'));
ok('ignores clean html', !isVendorHtml('<p>plain <strong>bold</strong></p>'));
const g=normalizeVendorHtml('<b id="docs-internal-guid-1"><span style="font-weight:700">Bold</span> and <span style="font-style:italic">italic</span></b>');
ok('GDocs bold→strong', /<strong>Bold<\/strong>/i.test(g), g);
ok('GDocs italic→em', /<em>italic<\/em>/i.test(g), g);
ok('guid unwrapped', !/docs-internal-guid/.test(g), g);
const w=normalizeVendorHtml('<p class="MsoListParagraph" style="mso-list:l0 level1"><span>First</span></p><p class="MsoListParagraph" style="mso-list:l0 level1"><span>Second</span></p>');
ok('Word list→<li>x2', (w.match(/<li>/g)||[]).length===2, w);
ok('Word list→<ul>', /<ul>/.test(w), w);
const u=normalizeVendorHtml('<b id="docs-internal-guid-2"><span style="text-decoration:underline">u</span></b>');
ok('GDocs underline→u', /<u>u<\/u>/i.test(u), u);

console.log('\n[extractLinks]');
const links=extractLinks([
 {type:'paragraph',content:[{type:'text',text:'hi '},{type:'workItemMention',props:{entityType:'story',entityId:'uuid-1'}}]},
 {type:'callout',content:[{type:'pageLink',props:{pageId:'p-9'}}],children:[{type:'paragraph',content:[{type:'workItemMention',props:{entityType:'epic',entityId:'uuid-2'}}]}]},
]);
ok('2 work items (nested)', links.workItems.length===2, JSON.stringify(links));
ok('epic in child', links.workItems.some(x=>x.entityType==='epic'&&x.entityId==='uuid-2'));
ok('page link', links.pageIds.includes('p-9'), JSON.stringify(links));
const d=extractLinks([{type:'paragraph',content:[{type:'workItemMention',props:{entityType:'story',entityId:'x'}},{type:'workItemMention',props:{entityType:'story',entityId:'x'}}]}]);
ok('dedupes', d.workItems.length===1, JSON.stringify(d));

console.log('\n[blocksToText]');
const bt=blocksToText([{type:'heading',content:'Title'},{type:'paragraph',content:[{type:'text',text:'body '},{type:'text',text:'text'}]},{type:'bulletListItem',content:'item',children:[{type:'paragraph',content:'nested'}]}]);
ok('heading', bt.includes('Title'), bt);
ok('joins runs', bt.includes('body text'), bt);
ok('walks children', bt.includes('nested'), bt);
ok('null safe', blocksToText(null)==='');

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail?1:0);
