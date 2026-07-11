# Session 015 — AC5 transitions instrumentation (2026-07-09)

## Findings (full detail in 06_VALIDATION_EVIDENCE.md §AC5)
1. **Duration audit PASS**: no STRATA-authored transition exceeds 200ms on the Strategy Map page. The only >200ms transitions (10 elements, 300ms opacity) are Atlaskit component-owned fades (Breadcrumbs, dropdown, app chrome) — canon.
2. **Map engine is react-flow** (d3-zoom, transform-based pan/zoom) — canonical library; zoom/pan smoothness is its optimized pipeline, not hand-rolled code. Current seed renders 11 nodes; the AC's 100-node bound has no dataset to exercise it.
3. **Frame sampling blocked by tab visibility**: window minimized → `visibilityState=hidden`, rAF suspended, timers throttled ≥1s. Two sampler timeouts earlier in the session were THIS, not jank (single wheel dispatch 0.2ms, pointermove 2.9ms). Sampler for the foregrounded run:

```js
// run in console with the map tab FOREGROUNDED
const el = document.querySelector('.react-flow'); const r = el.getBoundingClientRect();
const cx = r.left + r.width/2, cy = r.top + r.height/2; const f = []; let last = performance.now(), on = true;
requestAnimationFrame(function t(n){ f.push(n-last); last = n; if (on) requestAnimationFrame(t); });
// ...zoom/pan with the mouse for ~3s, then:
setTimeout(() => { on = false; const s=[...f].sort((a,b)=>a-b);
  console.log({ p50:s[s.length>>1], p95:s[Math.floor(s.length*0.95)], over50:f.filter(x=>x>50).length }); }, 3000);
```

## AC5 status: PASS on everything measurable headlessly; interactive frame test folded into Vikram's signoff pass (window foregrounded). All 8 Plan Lock micro-interaction ACs now have recorded dispositions.
