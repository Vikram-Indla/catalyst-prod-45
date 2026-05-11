import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { primitives, semantic } from "../src/definitions";
import { TOKEN_PREFIX, flattenLeaves } from "../src/_buildVars";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "../dist");

function declarations(entries: Array<[string, string | number]>): string {
  return entries.map(([k, v]) => `  ${TOKEN_PREFIX}-${k}: ${v};`).join("\n");
}

const rootDecls = declarations(flattenLeaves(primitives));
const lightDecls = declarations(flattenLeaves(semantic.light));
const darkDecls = declarations(flattenLeaves(semantic.dark));

const css = `/* @catylast/tokens — generated. do not edit by hand. */

:root {
${rootDecls}
}

[data-theme="light"] {
${lightDecls}
}

[data-theme="dark"] {
${darkDecls}
}
`;

mkdirSync(distDir, { recursive: true });
const outPath = resolve(distDir, "tokens.css");
writeFileSync(outPath, css, "utf-8");
console.log(`wrote ${outPath} (${css.length} bytes)`);
