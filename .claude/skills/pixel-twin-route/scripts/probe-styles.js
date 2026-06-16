/**
 * Browser-side style probe  (C5, part 1)
 *
 * NOT run by node. Paste/eval this in Chrome MCP `javascript_tool` ON EACH ROUTE
 * (source route, then target route). It returns a JSON measurement blob of
 * getComputedStyle for a list of selectors. Save each blob to a file, then diff
 * them offline with style-diff.mjs.
 *
 * Functional verification in Catalyst uses DOM/computed-style probes, NOT
 * screenshots (CLAUDE.md). This is the measurement half.
 *
 * Usage in Chrome MCP:
 *   __probeStyles(['[data-testid="catalyst-status-pill-trigger"]', '.cv-drawer-sidebar', 'table thead th'])
 *
 * Returns: { url, viewport, results: [ { selector, count, samples:[{styles, rect}] } ] }
 */
function __probeStyles(selectors, props) {
  var PROPS = props || [
    "fontSize", "fontWeight", "fontFamily", "lineHeight", "letterSpacing",
    "color", "backgroundColor", "textTransform",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "marginTop", "marginRight", "marginBottom", "marginLeft",
    "borderTopWidth", "borderColor", "borderRadius",
    "display", "width", "height", "gap",
  ];
  function measure(el) {
    var cs = getComputedStyle(el);
    var styles = {};
    PROPS.forEach(function (p) { styles[p] = cs[p]; });
    var r = el.getBoundingClientRect();
    return { styles: styles, rect: { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) } };
  }
  var results = selectors.map(function (sel) {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
    return {
      selector: sel,
      count: nodes.length,
      samples: nodes.slice(0, 3).map(measure), // up to 3 instances per selector
    };
  });
  return { url: location.href, viewport: { w: window.innerWidth, h: window.innerHeight }, results: results };
}
// auto-invoke with a default selector set if called bare; override by editing the arg
__probeStyles(window.__PTR_SELECTORS || ["body"]);
