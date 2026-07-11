# Validation evidence — slice 3 (premiumness)

## Root cause found for the popup ring (worth remembering)
The blue ring around the HubSwitcher dropdown was NOT the universal light-mode focus rule and NOT
beatable by inline `outline:none`: it was `index.css:4778`'s dark-sweep
`.dark *:focus-visible { box-shadow: 0 0 0 2px …information-bold !important; outline …!important }`
— an !important hijack painting a 2px ring on ANY focused element in dark, including Radix menu
containers (Radix focuses the container on open). Matches the known index-css-dark-sweep-hijack
landmine pattern. Fixed at source: menu/popover/select containers + [role=menu] excluded from the
sweep. Controls inside keep their focus rings.

## Static checks
- tsc --noEmit → 0 errors.
- lint:colors:gate → 0 = baseline 0.
- audit:ads:gate → all categories at baseline (one new 20px padding flagged mid-work; replaced
  with var(--ds-space-100/250) tokens before commit).

## Regression check
`vitest run src/components/layout src/components/for-you`: 62 passed / 55 failed identical WITH and
WITHOUT slice-3 diffs (stash isolation). All 55 failures pre-exist on main (documented slice 1+2).

## Live verification — localhost:8080
Dark, popup open (screenshot ss_70333oyhp): NO container ring (computed outline:none, boxShadow =
standard overlay shadow chain — probed); Ideation grayed glyph + disabled label + "Soon" hint,
cursor not-allowed (DOM-probed); tiles muted (computed `filter: saturate(0.7) brightness(0.92)` on
all 8 img tiles); Folio = purple mask span (computed bg rgb(201,124,244) = discovery-bold resolved).
Dark, sidebar: 240px rail, "Sign-off queue" full text (was "Sign-off qu..."), Incident/Tasks/Release
group tiles monochrome outline glyphs, INV/MWR avatars keep color, footer clocks only.
Light, sidebar (screenshot ss_8546vltk1): same 240/mono/full-label results; light popup ring never
had the !important hijack (light rule index.css:3590 has no !important → inline outline:none wins).
