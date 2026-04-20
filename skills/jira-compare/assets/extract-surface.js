// Jira Compare — surface extractor
// Run via mcp__Claude_in_Chrome__javascript_tool on both the Jira tab and the Catalyst tab.
//
// HOW TO USE
//   Pass `rootSelector` as the CSS selector for the container that matches the user's
//   screenshot (e.g. `[role="dialog"]` for a modal, `[data-testid="issue.views.issue-base"]`
//   for the Jira issue view, or a Catalyst-specific id). Everything outside that root is
//   ignored — this is how the skill enforces "scope = screenshot".
//
// OUTPUT
//   JSON { root, elements: [...], portalOverlays: [...], typography: {...} }
//   Pipe both sides' outputs to the diff step in SKILL.md §5.

(function extractSurface(rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) {
    return { error: `root not found: ${rootSelector}` };
  }

  const CS = (el) => window.getComputedStyle(el);
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };

  // --- component fingerprint -------------------------------------------------
  function fingerprintComponent(el) {
    const attrs = el.attributes;
    const testid = el.getAttribute('data-testid') || '';
    const cls = el.className && typeof el.className === 'string' ? el.className : '';
    const hasDataRadix = Array.from(attrs).some((a) => a.name.startsWith('data-radix'));
    const hasDataState = el.hasAttribute('data-state');
    const inPortal = !!el.closest('[data-atlaskit-portal-container], #atlaskit-portal-container');

    // Atlaskit testid conventions
    const akMap = [
      [/^form-field/, '@atlaskit/form'],
      [/^textfield/, '@atlaskit/textfield'],
      [/^textarea/, '@atlaskit/textarea'],
      [/^select--|^react-select/, '@atlaskit/select'],
      [/^user-picker/, '@atlaskit/user-picker'],
      [/^modal-dialog/, '@atlaskit/modal-dialog'],
      [/^dropdown-menu/, '@atlaskit/dropdown-menu'],
      [/^tabs/, '@atlaskit/tabs'],
      [/^breadcrumbs/, '@atlaskit/breadcrumbs'],
      [/^lozenge/, '@atlaskit/lozenge'],
      [/^badge/, '@atlaskit/badge'],
      [/^avatar/, '@atlaskit/avatar'],
      [/^tooltip/, '@atlaskit/tooltip'],
      [/^flag/, '@atlaskit/flag'],
      [/^section-message/, '@atlaskit/section-message'],
      [/^empty-state/, '@atlaskit/empty-state'],
      [/^spinner/, '@atlaskit/spinner'],
      [/^button/, '@atlaskit/button/new'],
      [/^popup/, '@atlaskit/popup'],
      [/^drawer/, '@atlaskit/drawer'],
      [/^page-header/, '@atlaskit/page-header'],
      [/^dynamic-table/, '@atlaskit/dynamic-table'],
      [/^editor/, '@atlaskit/editor-core'],
    ];
    for (const [re, pkg] of akMap) if (re.test(testid)) return { kind: 'atlaskit', pkg, evidence: `data-testid=${testid}` };

    if (inPortal) return { kind: 'atlaskit', pkg: '@atlaskit/* (portal)', evidence: 'portal container' };
    if (hasDataRadix || (hasDataState && !/^css-/.test(cls))) {
      return { kind: 'radix-shadcn', pkg: 'shadcn/Radix', evidence: 'data-radix/data-state' };
    }
    if (/^css-[a-z0-9]+$/i.test((cls || '').split(' ')[0] || '')) {
      return { kind: 'atlaskit', pkg: '@atlaskit/* (emotion)', evidence: 'emotion class' };
    }
    if (
      cls &&
      /(^|\s)(flex|grid|block|inline|items-|gap-|p[xytrblm]?-\d|m[xytrblm]?-\d|text-|font-|rounded|border|bg-)/.test(cls)
    ) {
      return { kind: 'tailwind', pkg: 'bespoke Tailwind', evidence: 'tailwind utility chain' };
    }
    return { kind: 'unknown', pkg: 'raw HTML / global CSS', evidence: '' };
  }

  // --- role inference --------------------------------------------------------
  function inferRole(el) {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || '';
    const type = el.getAttribute('type') || '';
    if (tag === 'input' && ['text', 'email', 'tel', 'url', 'search', 'password', ''].includes(type)) return 'text-input';
    if (tag === 'input' && type === 'checkbox') return 'checkbox';
    if (tag === 'input' && type === 'radio') return 'radio';
    if (tag === 'input' && ['number'].includes(type)) return 'number-input';
    if (tag === 'input' && ['date', 'datetime-local', 'time'].includes(type)) return 'date-input';
    if (tag === 'textarea') return 'textarea';
    if (tag === 'select') return 'select';
    if (tag === 'button' || role === 'button') return 'button';
    if (role === 'tab') return 'tab';
    if (role === 'dialog') return 'dialog';
    if (role === 'menu' || role === 'menuitem') return 'menu';
    if (role === 'combobox') return 'combobox';
    if (tag === 'a') return 'link';
    if (/^h[1-6]$/.test(tag)) return 'heading';
    return tag;
  }

  // --- label resolution ------------------------------------------------------
  function findLabel(el) {
    const id = el.id;
    if (id) {
      const l = document.querySelector(`label[for="${id}"]`);
      if (l) return { text: l.innerText.trim(), position: labelPosition(l, el) };
    }
    const aria = el.getAttribute('aria-label');
    if (aria) return { text: aria.trim(), position: 'aria' };
    const ariaBy = el.getAttribute('aria-labelledby');
    if (ariaBy) {
      const l = document.getElementById(ariaBy);
      if (l) return { text: l.innerText.trim(), position: labelPosition(l, el) };
    }
    const wrap = el.closest('label');
    if (wrap) return { text: wrap.innerText.trim(), position: 'wrap' };
    return { text: null, position: 'none' };
  }
  function labelPosition(labelEl, inputEl) {
    const lr = labelEl.getBoundingClientRect();
    const ir = inputEl.getBoundingClientRect();
    if (lr.bottom <= ir.top + 2) return 'top';
    if (lr.top >= ir.bottom - 2) return 'bottom';
    if (lr.right <= ir.left + 2) return 'left';
    if (lr.left >= ir.right - 2) return 'right';
    return 'inside';
  }

  // --- typography snapshot ---------------------------------------------------
  function typography(el) {
    const s = CS(el);
    return {
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      color: s.color,
    };
  }
  function box(el) {
    const s = CS(el);
    return {
      width: s.width,
      height: s.height,
      paddingTop: s.paddingTop,
      paddingRight: s.paddingRight,
      paddingBottom: s.paddingBottom,
      paddingLeft: s.paddingLeft,
      marginTop: s.marginTop,
      marginRight: s.marginRight,
      marginBottom: s.marginBottom,
      marginLeft: s.marginLeft,
      borderRadius: s.borderRadius,
      borderTopWidth: s.borderTopWidth,
      borderColor: s.borderColor,
      backgroundColor: s.backgroundColor,
    };
  }

  // --- scrollability ---------------------------------------------------------
  function isScrollable(el) {
    const s = CS(el);
    const oy = s.overflowY;
    return (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1;
  }

  // --- tab order -------------------------------------------------------------
  function computeTabOrder(rootEl) {
    const focusables = Array.from(
      rootEl.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      )
    ).filter((el) => {
      const s = CS(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null;
    });
    // Sort by explicit tabindex > 0 first, then DOM order
    const positive = focusables.filter((el) => Number(el.getAttribute('tabindex') || 0) > 0)
      .sort((a, b) => Number(a.getAttribute('tabindex')) - Number(b.getAttribute('tabindex')));
    const natural = focusables.filter((el) => Number(el.getAttribute('tabindex') || 0) <= 0);
    return [...positive, ...natural];
  }

  // --- main walk -------------------------------------------------------------
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
  const elements = [];
  const INTERESTING_TAGS = new Set([
    'input', 'textarea', 'select', 'button', 'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'label',
  ]);
  const INTERESTING_ROLES = new Set([
    'button', 'dialog', 'tab', 'tablist', 'tabpanel',
    'combobox', 'listbox', 'option', 'menu', 'menuitem', 'menubar',
    'radio', 'radiogroup', 'checkbox', 'switch',
    'alert', 'status', 'heading', 'link',
  ]);

  let node = walker.currentNode;
  while (node) {
    const el = node;
    const tag = el.tagName && el.tagName.toLowerCase();
    const role = el.getAttribute && el.getAttribute('role');
    const testid = el.getAttribute && el.getAttribute('data-testid');
    const isInteresting =
      INTERESTING_TAGS.has(tag) ||
      (role && INTERESTING_ROLES.has(role)) ||
      (testid && /^(form-field|textfield|textarea|select|modal-dialog|lozenge|dropdown-menu|tabs|breadcrumbs|user-picker|button|tooltip|flag|section-message|empty-state|avatar|badge|popup|drawer)/.test(testid));

    if (isInteresting) {
      const { text: labelText, position: labelPos } = findLabel(el);
      const fp = fingerprintComponent(el);
      elements.push({
        role: inferRole(el),
        tag,
        testid: testid || null,
        label: labelText,
        labelPosition: labelPos,
        placeholder: el.getAttribute && el.getAttribute('placeholder'),
        required: (el.getAttribute && (el.getAttribute('aria-required') === 'true' || el.hasAttribute('required'))) || false,
        fieldType: el.getAttribute && el.getAttribute('type'),
        tabIndex: el.tabIndex,
        component: fp,
        typography: typography(el),
        box: box(el),
        scrollable: isScrollable(el),
        rect: rect(el),
      });
    }
    node = walker.nextNode();
  }

  // --- portal overlays (modal/popup outside root) ---------------------------
  const portalOverlays = Array.from(
    document.querySelectorAll('[data-atlaskit-portal-container], #atlaskit-portal-container, [data-radix-portal], [data-sonner-toaster]')
  ).map((el) => ({
    selector: el.getAttribute('data-atlaskit-portal-container') ? '[data-atlaskit-portal-container]' : el.id ? `#${el.id}` : el.tagName,
    childCount: el.childElementCount,
    visibleText: (el.innerText || '').slice(0, 200),
  }));

  // --- page-level typography sweep ------------------------------------------
  const textNodes = [];
  const walker2 = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(el) {
      if (!el.innerText || !el.innerText.trim()) return NodeFilter.FILTER_SKIP;
      if (el.children.length > 0 && el.innerText.trim().length > 60) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let tn = walker2.nextNode();
  while (tn) {
    textNodes.push({ role: inferRole(tn), text: tn.innerText.trim().slice(0, 80), typography: typography(tn) });
    tn = walker2.nextNode();
  }

  // --- tab order -------------------------------------------------------------
  const ordered = computeTabOrder(root).map((el, i) => ({
    index: i + 1,
    role: inferRole(el),
    label: findLabel(el).text,
    testid: el.getAttribute('data-testid') || null,
  }));

  return {
    url: location.href,
    root: rootSelector,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    elements,
    portalOverlays,
    typographyNodes: textNodes,
    tabOrder: ordered,
    tokens: {
      dsBackground: getComputedStyle(document.documentElement).getPropertyValue('--ds-background-neutral').trim(),
      dsText: getComputedStyle(document.documentElement).getPropertyValue('--ds-text').trim(),
      dsSurface: getComputedStyle(document.documentElement).getPropertyValue('--ds-surface').trim(),
      cpBgPage: getComputedStyle(document.documentElement).getPropertyValue('--cp-bg-page').trim(),
      cpTextPrimary: getComputedStyle(document.documentElement).getPropertyValue('--cp-text-primary').trim(),
    },
  };
})(/* ROOT_SELECTOR */);
