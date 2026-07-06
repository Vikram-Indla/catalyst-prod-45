# Wiki editor pure-logic self-test

Vitest is broken on Node 20 in this repo (rolldown styleText), so the
highest-risk pure functions (GDocs/Word paste normalizer, mention/link
extraction, search-text extraction) are verified with a bundled node
harness instead.

Run:
    node_modules/.bin/esbuild src/components/wiki-hub/editor/__selftest__/pure-logic.selftest.mjs \
      --bundle --platform=node --format=esm --external:jsdom --outfile=./.selftest.mjs \
      && node ./.selftest.mjs; rm -f ./.selftest.mjs

Expect: "17 passed, 0 failed". Add cases here when touching
pasteNormalizer.ts / extractLinks.ts / blocksToText.ts.
