/**
 * prismHighlight — thin wrapper around Prism.js used by BOTH the read
 * mode renderer (`adfLightRenderer.tsx`) and the edit-mode decoration
 * plugin (`CodeBlockHighlight.ts`) so highlighting is byte-identical
 * across the two surfaces.
 *
 * Loading strategy:
 *   - A curated set of common languages is bundled EAGERLY at module
 *     load (see EAGER_LANGS). These cover ~80 % of code-block usage.
 *   - Anything else is lazy-loaded via dynamic import on first use
 *     (`ensureGrammar`). The first highlight call for that language
 *     returns un-tokenised text; the next one (after the dynamic
 *     import resolves and the caller re-runs the highlight via the
 *     returned promise) returns coloured tokens.
 *
 * Storage parity with Jira: the picker stores Jira's display label
 * ("CSharp", "Shell", "Html", …) but Prism's grammar IDs are different
 * ("csharp", "bash", "markup", …). The mapping lives in
 * `codeBlockLanguages.ts` via the `prism` field — we resolve label →
 * prism ID through `findCodeLanguage()`.
 */
import Prism from 'prismjs';
import { findCodeLanguage } from '../data/codeBlockLanguages';

// ── Eager grammars ─────────────────────────────────────────────────
// Importing the grammar file registers it on the global Prism object.
// Order matters where one grammar extends another (e.g. typescript
// extends javascript) — list the base first.
/* eslint-disable @typescript-eslint/no-require-imports */
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-scala';

// Dynamic-import lookup for the long tail. Keys are Prism grammar IDs.
// Vite needs the explicit string so each chunk is statically analysable.
const LAZY_IMPORTS: Record<string, () => Promise<unknown>> = {
  abap: () => import('prismjs/components/prism-abap'),
  actionscript: () => import('prismjs/components/prism-actionscript'),
  ada: () => import('prismjs/components/prism-ada'),
  applescript: () => import('prismjs/components/prism-applescript'),
  arduino: () => import('prismjs/components/prism-arduino'),
  autoit: () => import('prismjs/components/prism-autoit'),
  clojure: () => import('prismjs/components/prism-clojure'),
  coffeescript: () => import('prismjs/components/prism-coffeescript'),
  cfscript: () => import('prismjs/components/prism-cfscript'),
  // CUDA has no first-party Prism grammar; we map Jira's "CUDA" to
  // the C grammar in codeBlockLanguages.ts so this entry is unused
  // but kept as a placeholder for future Prism community grammars.
  d: () => import('prismjs/components/prism-d'),
  dart: () => import('prismjs/components/prism-dart'),
  elixir: () => import('prismjs/components/prism-elixir'),
  erlang: () => import('prismjs/components/prism-erlang'),
  fortran: () => import('prismjs/components/prism-fortran'),
  gherkin: () => import('prismjs/components/prism-gherkin'),
  graphql: () => import('prismjs/components/prism-graphql'),
  groovy: () => import('prismjs/components/prism-groovy'),
  handlebars: () => import('prismjs/components/prism-handlebars'),
  haskell: () => import('prismjs/components/prism-haskell'),
  haxe: () => import('prismjs/components/prism-haxe'),
  hcl: () => import('prismjs/components/prism-hcl'),
  julia: () => import('prismjs/components/prism-julia'),
  livescript: () => import('prismjs/components/prism-livescript'),
  lua: () => import('prismjs/components/prism-lua'),
  // Prism ships Mathematica under the "wolfram" grammar ID (same
   // language, official spelling). codeBlockLanguages.ts maps
   // Jira's "Mathematica" → 'wolfram' so this is the loader.
  wolfram: () => import('prismjs/components/prism-wolfram'),
  matlab: () => import('prismjs/components/prism-matlab'),
  nginx: () => import('prismjs/components/prism-nginx'),
  objectivec: () => import('prismjs/components/prism-objectivec'),
  ocaml: () => import('prismjs/components/prism-ocaml'),
  pascal: () => import('prismjs/components/prism-pascal'),
  perl: () => import('prismjs/components/prism-perl'),
  powershell: () => import('prismjs/components/prism-powershell'),
  prolog: () => import('prismjs/components/prism-prolog'),
  protobuf: () => import('prismjs/components/prism-protobuf'),
  puppet: () => import('prismjs/components/prism-puppet'),
  qml: () => import('prismjs/components/prism-qml'),
  r: () => import('prismjs/components/prism-r'),
  racket: () => import('prismjs/components/prism-racket'),
  rest: () => import('prismjs/components/prism-rest'),
  sass: () => import('prismjs/components/prism-sass'),
  scheme: () => import('prismjs/components/prism-scheme'),
  smalltalk: () => import('prismjs/components/prism-smalltalk'),
  'splunk-spl': () => import('prismjs/components/prism-splunk-spl'),
  sml: () => import('prismjs/components/prism-sml'),
  tcl: () => import('prismjs/components/prism-tcl'),
  latex: () => import('prismjs/components/prism-latex'),
  toml: () => import('prismjs/components/prism-toml'),
  vala: () => import('prismjs/components/prism-vala'),
  'visual-basic': () => import('prismjs/components/prism-visual-basic'),
  verilog: () => import('prismjs/components/prism-verilog'),
  vhdl: () => import('prismjs/components/prism-vhdl'),
  xquery: () => import('prismjs/components/prism-xquery'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

const pendingLoads = new Map<string, Promise<unknown>>();

/**
 * Make sure Prism has the grammar for `prismId`. Returns a promise that
 * resolves when the grammar is registered (or immediately if already
 * registered / un-loadable). Safe to call repeatedly — concurrent calls
 * for the same grammar share the same in-flight import.
 */
export function ensureGrammar(prismId: string): Promise<void> {
  if (Prism.languages[prismId]) return Promise.resolve();
  const importer = LAZY_IMPORTS[prismId];
  if (!importer) return Promise.resolve();
  if (pendingLoads.has(prismId)) {
    return pendingLoads.get(prismId)!.then(() => undefined);
  }
  const p = importer().catch(() => undefined);
  pendingLoads.set(prismId, p);
  return p.then(() => undefined);
}

/**
 * Resolve a Jira-style language label (e.g. "CSharp", "Shell", "Html")
 * down to Prism's grammar ID. Returns null when there's no mapping
 * (e.g. "(None)" / "PlainText") so the caller can render plain text.
 */
export function resolvePrismId(label: string | null | undefined): string | null {
  return findCodeLanguage(label ?? null).prism;
}

/**
 * Tokenise + serialise `text` through Prism. Returns an HTML string with
 * Prism's token classes (.token.keyword, .token.string, …). When the
 * grammar isn't registered yet, escapes the text and triggers an async
 * `ensureGrammar` load so the next call returns coloured output. The
 * caller can subscribe via the returned `pendingLoad` promise to know
 * when to re-render.
 */
export function highlightToHtml(
  text: string,
  prismId: string | null,
): { html: string; pendingLoad: Promise<void> | null } {
  if (!prismId || !text) {
    return { html: escapeHtml(text), pendingLoad: null };
  }
  if (!Prism.languages[prismId]) {
    return { html: escapeHtml(text), pendingLoad: ensureGrammar(prismId) };
  }
  try {
    return {
      html: Prism.highlight(text, Prism.languages[prismId], prismId),
      pendingLoad: null,
    };
  } catch {
    return { html: escapeHtml(text), pendingLoad: null };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
