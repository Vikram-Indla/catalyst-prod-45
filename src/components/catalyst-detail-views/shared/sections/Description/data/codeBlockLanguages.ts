/**
 * Code-block language picker list — 1:1 mirror of Jira's ADF codeBlock
 * "Select language" dropdown (probed 2026-05-31 across 9 screenshots).
 *
 * Storage parity with Jira:
 *   - The ADF codeBlock node carries a single `language` attribute.
 *   - "(None)" clears the attribute (stored as null / undefined).
 *   - Every other entry stores the EXACT label string Jira would store
 *     so docs round-trip lossless between Catalyst and Jira.
 *
 * Read-mode highlighting:
 *   - Jira pipes `language` into Prism.js to produce syntax-coloured HTML.
 *   - Catalyst's read view currently renders monospace plain text; the
 *     `prism` field below holds the Prism grammar ID we WOULD pass to a
 *     future Prism.highlight() call, kept here so the picker + highlighter
 *     don't drift apart.
 */
export interface CodeLanguage {
  /** Visible label in the picker AND the value stored in ADF. */
  label: string;
  /** Prism.js grammar ID for read-mode syntax highlighting. */
  prism: string | null;
}

export const CODE_LANGUAGE_NONE: CodeLanguage = {
  label: '(None)',
  prism: null,
};

export const CODE_LANGUAGES: CodeLanguage[] = [
  CODE_LANGUAGE_NONE,
  { label: 'ABAP', prism: 'abap' },
  { label: 'ActionScript', prism: 'actionscript' },
  { label: 'Ada', prism: 'ada' },
  { label: 'AppleScript', prism: 'applescript' },
  { label: 'Arduino', prism: 'arduino' },
  { label: 'Autoit', prism: 'autoit' },
  { label: 'C', prism: 'c' },
  { label: 'C++', prism: 'cpp' },
  { label: 'Clojure', prism: 'clojure' },
  { label: 'CoffeeScript', prism: 'coffeescript' },
  { label: 'ColdFusion', prism: 'cfscript' },
  { label: 'CSharp', prism: 'csharp' },
  { label: 'CSS', prism: 'css' },
  // CUDA: Prism ships no first-party CUDA grammar; falling back to
  // the C grammar gives sensible keyword + literal colouring without
  // adding a third-party community plugin.
  { label: 'CUDA', prism: 'c' },
  { label: 'D', prism: 'd' },
  { label: 'Dart', prism: 'dart' },
  { label: 'Diff', prism: 'diff' },
  { label: 'Dockerfile', prism: 'docker' },
  { label: 'Elixir', prism: 'elixir' },
  { label: 'Erlang', prism: 'erlang' },
  { label: 'Fortran', prism: 'fortran' },
  { label: 'FoxPro', prism: 'visual-basic' },
  { label: 'Gherkin', prism: 'gherkin' },
  { label: 'Go', prism: 'go' },
  { label: 'GraphQL', prism: 'graphql' },
  { label: 'Groovy', prism: 'groovy' },
  { label: 'Handlebars', prism: 'handlebars' },
  { label: 'Haskell', prism: 'haskell' },
  { label: 'Haxe', prism: 'haxe' },
  { label: 'HCL', prism: 'hcl' },
  { label: 'Html', prism: 'markup' },
  { label: 'Java', prism: 'java' },
  { label: 'JavaFX', prism: 'java' },
  { label: 'JavaScript', prism: 'javascript' },
  { label: 'JSON', prism: 'json' },
  { label: 'JSX', prism: 'jsx' },
  { label: 'Julia', prism: 'julia' },
  { label: 'Kotlin', prism: 'kotlin' },
  { label: 'LiveScript', prism: 'livescript' },
  { label: 'Lua', prism: 'lua' },
  { label: 'Markdown', prism: 'markdown' },
  // Mathematica is shipped by Prism under the "wolfram" grammar ID.
  { label: 'Mathematica', prism: 'wolfram' },
  { label: 'MATLAB', prism: 'matlab' },
  { label: 'NGINX', prism: 'nginx' },
  { label: 'Objective-C', prism: 'objectivec' },
  { label: 'Objective-J', prism: 'objectivec' },
  { label: 'OCaml', prism: 'ocaml' },
  { label: 'Octave', prism: 'matlab' },
  { label: 'Pascal', prism: 'pascal' },
  { label: 'Perl', prism: 'perl' },
  { label: 'PHP', prism: 'php' },
  { label: 'PlainText', prism: null },
  { label: 'PowerShell', prism: 'powershell' },
  { label: 'Prolog', prism: 'prolog' },
  { label: 'Protocol Buffers', prism: 'protobuf' },
  { label: 'Puppet', prism: 'puppet' },
  { label: 'Python', prism: 'python' },
  { label: 'QML', prism: 'qml' },
  { label: 'R', prism: 'r' },
  { label: 'Racket', prism: 'racket' },
  { label: 'reStructuredText', prism: 'rest' },
  { label: 'Ruby', prism: 'ruby' },
  { label: 'Rust', prism: 'rust' },
  { label: 'Sass', prism: 'sass' },
  { label: 'Scala', prism: 'scala' },
  { label: 'Scheme', prism: 'scheme' },
  { label: 'Shell', prism: 'bash' },
  { label: 'Smalltalk', prism: 'smalltalk' },
  { label: 'SplunkSPL', prism: 'splunk-spl' },
  { label: 'SQL', prism: 'sql' },
  { label: 'StandardML', prism: 'sml' },
  { label: 'Swift', prism: 'swift' },
  { label: 'Tcl', prism: 'tcl' },
  { label: 'TeX', prism: 'latex' },
  { label: 'TOML', prism: 'toml' },
  { label: 'TSX', prism: 'tsx' },
  { label: 'TypeScript', prism: 'typescript' },
  { label: 'Vala', prism: 'vala' },
  { label: 'VbNet', prism: 'visual-basic' },
  { label: 'Verilog', prism: 'verilog' },
  { label: 'VHDL', prism: 'vhdl' },
  { label: 'VisualBasic', prism: 'visual-basic' },
  { label: 'XML', prism: 'markup' },
  { label: 'XQuery', prism: 'xquery' },
  { label: 'Yaml', prism: 'yaml' },
];

/** Resolve a stored language string back to its picker entry. Case-
 *  insensitive so docs written by older Catalyst versions (which used
 *  lower-cased Prism IDs) still round-trip cleanly. */
export function findCodeLanguage(
  value: string | null | undefined,
): CodeLanguage {
  if (!value) return CODE_LANGUAGE_NONE;
  const lower = value.toLowerCase();
  return (
    CODE_LANGUAGES.find(
      (l) => l.label.toLowerCase() === lower || l.prism === lower,
    ) ?? CODE_LANGUAGE_NONE
  );
}
