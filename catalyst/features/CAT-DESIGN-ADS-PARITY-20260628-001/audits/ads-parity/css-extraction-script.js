/**
 * CSS Extraction Script for Baseline Evidence Capture
 *
 * Usage (in browser console or Playwright):
 * 1. Run this script after page loads
 * 2. Copy the console output
 * 3. Save to baseline-css-extraction.json
 *
 * Playwright usage:
 * const extraction = await page.evaluate(() => {
 *   // paste the content of getComputedStyles() function here
 * });
 */

// Main extraction function
window.captureComputedStyles = function() {
  const selectors = [
    // Page/Body
    { selector: 'body', displayName: 'Page Background' },
    { selector: 'html', displayName: 'HTML Root' },

    // Navigation
    { selector: 'nav[aria-label*="Primary"], nav[aria-label*="main"], [data-test-id*="navigation"]', displayName: 'Top Navigation' },
    { selector: 'nav button, [data-test-id*="nav-button"]', displayName: 'Nav Button (hover state)' },

    // Sidebar / Left Rail
    { selector: 'nav[aria-label*="left"], nav[aria-label*="sidebar"], [data-test-id*="sidebar"]', displayName: 'Left Sidebar' },
    { selector: '[data-test-id*="sidebar"] a, [data-test-id*="sidebar"] button', displayName: 'Sidebar Link/Button' },
    { selector: '[data-test-id*="sidebar"] a:hover, [data-test-id*="sidebar"] button:hover', displayName: 'Sidebar Hover State' },

    // Main Content Area
    { selector: 'main, [role="main"], .main-content, [data-test-id*="main-content"]', displayName: 'Main Content Area' },

    // List/Row Items
    { selector: '[data-test-id*="issue-row"], .issue-row, [role="row"]', displayName: 'Issue Row' },
    { selector: '[data-test-id*="issue-row"]:hover, .issue-row:hover', displayName: 'Issue Row Hover' },
    { selector: '[data-test-id*="issue-row"].selected, .issue-row.active', displayName: 'Issue Row Selected' },

    // Typography Elements
    { selector: 'h1', displayName: 'Heading 1' },
    { selector: 'h2', displayName: 'Heading 2' },
    { selector: 'h3', displayName: 'Heading 3' },
    { selector: 'p, span.text-body, [data-test-id*="body-text"]', displayName: 'Body Text' },
    { selector: 'span.text-secondary, span.text-subtle, .secondary-text', displayName: 'Secondary Text' },
    { selector: '.text-subtle, .text-muted, [data-test-id*="hint-text"]', displayName: 'Subtle/Hint Text' },

    // Status / Badge / Lozenge
    { selector: '[data-test-id*="status"], .status-pill, span[class*="status"]', displayName: 'Status Pill' },
    { selector: 'span[class*="badge"], [data-test-id*="badge"]', displayName: 'Badge' },
    { selector: 'span[class*="lozenge"], [data-test-id*="lozenge"]', displayName: 'Lozenge' },

    // Interactive Elements
    { selector: 'button, [role="button"]', displayName: 'Button (primary)' },
    { selector: 'button:hover, [role="button"]:hover', displayName: 'Button Hover' },
    { selector: 'button:focus, [role="button"]:focus', displayName: 'Button Focus' },
    { selector: 'a, [role="link"]', displayName: 'Link' },
    { selector: 'a:hover, [role="link"]:hover', displayName: 'Link Hover' },
    { selector: 'input[type="text"], input[type="search"], textarea', displayName: 'Input Field' },
    { selector: 'input[type="text"]:focus, input[type="search"]:focus', displayName: 'Input Focus' },

    // Icons
    { selector: '[data-test-id*="icon"], svg.icon, i[class*="icon"]', displayName: 'Icon Element' },

    // Borders
    { selector: 'hr, [data-test-id*="divider"]', displayName: 'Divider/Border' },

    // Shadows
    { selector: '[class*="shadow"], [data-test-id*="card"], .card, [role="dialog"]', displayName: 'Elevated Element (shadow)' },

    // Theme-specific
    { selector: '[data-theme*="dark"], [class*="dark-mode"], html[data-mode="dark"]', displayName: 'Dark Mode Root' },
    { selector: '[data-theme*="light"], [class*="light-mode"], html[data-mode="light"]', displayName: 'Light Mode Root' },
  ];

  const extraction = {
    metadata: {
      captureTime: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      computedTheme: getComputedTheme(),
    },
    captures: [],
  };

  selectors.forEach(({ selector, displayName }) => {
    try {
      const element = document.querySelector(selector);
      if (!element) {
        extraction.captures.push({
          selector,
          displayName,
          status: 'NOT_FOUND',
        });
        return;
      }

      const style = window.getComputedStyle(element);
      extraction.captures.push({
        selector,
        displayName,
        status: 'FOUND',
        computed: extractRelevantStyles(style),
        dimensions: {
          width: element.offsetWidth,
          height: element.offsetHeight,
        },
        position: {
          top: element.offsetTop,
          left: element.offsetLeft,
        },
      });
    } catch (e) {
      extraction.captures.push({
        selector,
        displayName,
        status: 'ERROR',
        error: e.message,
      });
    }
  });

  return extraction;
};

// Extract only relevant CSS properties
function extractRelevantStyles(style) {
  return {
    backgroundColor: style.backgroundColor,
    color: style.color,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    borderStyle: style.borderStyle,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontFamily: style.fontFamily,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    padding: style.padding,
    margin: style.margin,
    gap: style.gap,
    opacity: style.opacity,
    boxShadow: style.boxShadow,
    textDecoration: style.textDecoration,
    textTransform: style.textTransform,
    textAlign: style.textAlign,
    display: style.display,
    position: style.position,
    zIndex: style.zIndex,
    overflow: style.overflow,
    visibility: style.visibility,
  };
}

// Detect theme
function getComputedTheme() {
  const root = document.documentElement;

  // Check data attributes
  if (root.getAttribute('data-theme')) return root.getAttribute('data-theme');
  if (root.getAttribute('data-mode')) return root.getAttribute('data-mode');
  if (root.getAttribute('data-color-mode')) return root.getAttribute('data-color-mode');

  // Check class
  if (root.classList.contains('dark-mode')) return 'dark';
  if (root.classList.contains('light-mode')) return 'light';
  if (root.classList.contains('dark')) return 'dark';

  // Check media query
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';

  // Default
  return 'light';
}

// Export function (for console use)
window.exportExtraction = function() {
  const data = window.captureComputedStyles();
  console.log(JSON.stringify(data, null, 2));
  console.log('Copy the above JSON and save to file');
  return data;
};

// Color contrast checker (WCAG AA compliance)
window.checkContrast = function(bgColor, fgColor) {
  const getLuminance = (color) => {
    const rgb = color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return 0.5;

    const [r, g, b] = rgb.map(x => {
      x = parseInt(x) / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(bgColor);
  const l2 = getLuminance(fgColor);
  const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    contrast: contrast.toFixed(2),
    wcagAA: contrast >= 4.5,
    wcagAALarge: contrast >= 3,
    wcagAAA: contrast >= 7,
    wcagAAALarge: contrast >= 4.5,
  };
};

// Quick viewport test
window.testViewport = function(width, height) {
  console.log(`Current viewport: ${window.innerWidth}x${window.innerHeight}`);
  console.log(`Target viewport: ${width}x${height}`);
  if (window.innerWidth !== width || window.innerHeight !== height) {
    console.warn('Viewport mismatch. Use DevTools → Device toolbar to set exact size.');
  }
};

// Quick color extractor (all unique colors on page)
window.getAllColors = function() {
  const colors = new Set();
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    const style = window.getComputedStyle(node);
    if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      colors.add(`bg: ${style.backgroundColor}`);
    }
    if (style.color !== 'rgb(0, 0, 0)') {
      colors.add(`fg: ${style.color}`);
    }
    if (style.borderColor !== 'rgb(0, 0, 0)') {
      colors.add(`border: ${style.borderColor}`);
    }
  }

  console.log('Unique colors found:');
  Array.from(colors).sort().forEach(color => console.log(color));
  return Array.from(colors);
};

// Export all utilities
window.BaselineCapture = {
  capture: window.captureComputedStyles,
  export: window.exportExtraction,
  checkContrast: window.checkContrast,
  testViewport: window.testViewport,
  getAllColors: window.getAllColors,
};

console.log('Baseline capture utilities loaded. Available as window.BaselineCapture or window.captureComputedStyles()');
console.log('Usage: window.captureComputedStyles() to capture, window.exportExtraction() to export');
