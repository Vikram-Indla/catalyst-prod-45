/**
 * Design Audit Runtime Scanner
 * Captures real computed styles from DOM elements
 */

import { auditSelectors, cssPropertiesToAudit, auditTargets } from './auditConfig';
import type { AuditFinding, AccessibilityInfo } from './auditTypes';

export interface ElementSample {
  selector: string;
  tagName: string;
  className: string;
  computedStyles: Record<string, string>;
  boundingRect: DOMRect | null;
  attributes: Record<string, string>;
}

export interface DOMScanResult {
  route: string;
  timestamp: string;
  viewport: { width: number; height: number };
  elements: Record<string, ElementSample[]>;
  accessibility: AccessibilityInfo;
}

// Get computed styles for an element
export function getComputedStylesForElement(
  element: Element,
  properties: string[]
): Record<string, string> {
  const computed = window.getComputedStyle(element);
  const result: Record<string, string> = {};
  
  properties.forEach(prop => {
    result[prop] = computed.getPropertyValue(prop);
  });
  
  return result;
}

// Get all CSS properties we care about
function getAllAuditProperties(): string[] {
  return [
    ...cssPropertiesToAudit.typography,
    ...cssPropertiesToAudit.spacing,
    ...cssPropertiesToAudit.colors,
    ...cssPropertiesToAudit.borders,
    ...cssPropertiesToAudit.elevation,
    ...cssPropertiesToAudit.layout,
  ];
}

// Sample elements matching a selector
export function sampleElements(selector: string, maxCount = 5): ElementSample[] {
  const elements = document.querySelectorAll(selector);
  const samples: ElementSample[] = [];
  const properties = getAllAuditProperties();
  
  const count = Math.min(elements.length, maxCount);
  for (let i = 0; i < count; i++) {
    const el = elements[i];
    samples.push({
      selector,
      tagName: el.tagName.toLowerCase(),
      className: el.className?.toString() || '',
      computedStyles: getComputedStylesForElement(el, properties),
      boundingRect: el.getBoundingClientRect(),
      attributes: getElementAttributes(el),
    });
  }
  
  return samples;
}

// Get relevant attributes from element
function getElementAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  const relevantAttrs = ['role', 'aria-label', 'aria-selected', 'aria-expanded', 'data-ui', 'data-state'];
  
  relevantAttrs.forEach(attr => {
    const value = element.getAttribute(attr);
    if (value !== null) {
      attrs[attr] = value;
    }
  });
  
  return attrs;
}

// Get accessibility info for the page
export function getAccessibilityInfo(): AccessibilityInfo {
  // Count focusable elements
  const focusableSelectors = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
  const focusableCount = document.querySelectorAll(focusableSelectors).length;
  
  // Get heading structure
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingStructure: string[] = [];
  headings.forEach(h => {
    headingStructure.push(`${h.tagName}: ${h.textContent?.slice(0, 50) || ''}`);
  });
  
  // Check for focus-visible styles
  const styleSheets = document.styleSheets;
  let focusVisiblePresent = false;
  try {
    for (let i = 0; i < styleSheets.length; i++) {
      const sheet = styleSheets[i];
      try {
        const rules = sheet.cssRules;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j] as CSSStyleRule;
          if (rule.selectorText?.includes(':focus-visible')) {
            focusVisiblePresent = true;
            break;
          }
        }
      } catch {
        // Cross-origin stylesheets throw errors
      }
      if (focusVisiblePresent) break;
    }
  } catch {
    // Ignore errors
  }
  
  // Get landmark regions
  const landmarks = document.querySelectorAll('header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');
  const landmarkRegions: string[] = [];
  landmarks.forEach(l => {
    landmarkRegions.push(l.tagName.toLowerCase() + (l.getAttribute('role') ? `[${l.getAttribute('role')}]` : ''));
  });
  
  // Count aria-labels
  const ariaLabels = document.querySelectorAll('[aria-label]').length;
  
  return {
    focusableCount,
    headingStructure: headingStructure.slice(0, 10),
    focusVisiblePresent,
    landmarkRegions: [...new Set(landmarkRegions)],
    ariaLabels,
  };
}

// Perform full DOM scan
export function performDOMScan(route: string): DOMScanResult {
  const elements: Record<string, ElementSample[]> = {};
  
  // Scan each selector category
  Object.entries(auditSelectors).forEach(([category, selector]) => {
    elements[category] = sampleElements(selector);
  });
  
  return {
    route,
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    elements,
    accessibility: getAccessibilityInfo(),
  };
}

// Compare observed value to target
export function compareToTarget(
  observed: string,
  targetKey: keyof typeof auditTargets
): { delta: string; passes: boolean } {
  const target = auditTargets[targetKey];
  
  // Parse numeric values
  const observedNum = parseFloat(observed);
  const targetNum = parseFloat(target as string);
  
  if (!isNaN(observedNum) && !isNaN(targetNum)) {
    const diff = observedNum - targetNum;
    return {
      delta: diff > 0 ? `+${diff}px` : diff < 0 ? `${diff}px` : '0',
      passes: Math.abs(diff) <= 2, // 2px tolerance
    };
  }
  
  // String comparison
  return {
    delta: observed === target ? 'Match' : 'Mismatch',
    passes: observed === target,
  };
}

// Generate findings from scan results
export function generateFindings(scan: DOMScanResult): AuditFinding[] {
  const findings: AuditFinding[] = [];
  
  // Check header height
  if (scan.elements.header?.length > 0) {
    const header = scan.elements.header[0];
    const height = header.computedStyles['height'];
    const comparison = compareToTarget(height, 'headerHeight');
    
    findings.push({
      id: `header-height-${scan.route}`,
      route: scan.route,
      area: 'Header',
      element: 'Header Height',
      selector: 'header',
      current: height,
      target: auditTargets.headerHeight,
      delta: comparison.delta,
      severity: comparison.passes ? 'P3' : 'P1',
      status: comparison.passes ? 'pass' : 'warn',
      recommendation: comparison.passes 
        ? 'Header height matches target' 
        : 'Reduce header height to 56px for Atlassian density',
      computed: height,
    });
  }
  
  // Check nav item height
  if (scan.elements.navItem?.length > 0) {
    const navItem = scan.elements.navItem[0];
    const height = navItem.computedStyles['height'];
    const comparison = compareToTarget(height, 'navItemHeight');
    
    findings.push({
      id: `nav-item-height-${scan.route}`,
      route: scan.route,
      area: 'SideNav',
      element: 'Nav Item Height',
      selector: navItem.selector,
      current: height,
      target: auditTargets.navItemHeight,
      delta: comparison.delta,
      severity: comparison.passes ? 'P3' : 'P1',
      status: comparison.passes ? 'pass' : 'warn',
      recommendation: comparison.passes 
        ? 'Nav item height matches target' 
        : 'Use compact 32px nav items',
      computed: height,
    });
  }
  
  // Check button sizes
  if (scan.elements.button?.length > 0) {
    const button = scan.elements.button[0];
    const height = button.computedStyles['height'];
    const comparison = compareToTarget(height, 'buttonHeightDefault');
    
    findings.push({
      id: `button-height-${scan.route}`,
      route: scan.route,
      area: 'Button',
      element: 'Button Height',
      selector: 'button',
      current: height,
      target: auditTargets.buttonHeightDefault,
      delta: comparison.delta,
      severity: comparison.passes ? 'P3' : 'P2',
      status: comparison.passes ? 'pass' : 'warn',
      recommendation: comparison.passes 
        ? 'Button height matches target' 
        : 'Reduce button height to 36px',
      computed: height,
    });
  }
  
  // Check typography
  if (scan.elements.pageTitle?.length > 0) {
    const title = scan.elements.pageTitle[0];
    const fontSize = title.computedStyles['font-size'];
    
    findings.push({
      id: `page-title-size-${scan.route}`,
      route: scan.route,
      area: 'Typography',
      element: 'Page Title Size',
      selector: 'h1',
      current: fontSize,
      target: '20px',
      delta: parseFloat(fontSize) === 20 ? '0' : `${parseFloat(fontSize) - 20}px`,
      severity: 'P3',
      status: parseFloat(fontSize) >= 18 && parseFloat(fontSize) <= 24 ? 'pass' : 'warn',
      recommendation: 'Page titles should be 18-24px',
      computed: fontSize,
    });
  }
  
  // Check modal/dialog
  if (scan.elements.modal?.length > 0) {
    const modal = scan.elements.modal[0];
    const padding = modal.computedStyles['padding'];
    const radius = modal.computedStyles['border-radius'];
    
    findings.push({
      id: `modal-padding-${scan.route}`,
      route: scan.route,
      area: 'Modal',
      element: 'Modal Padding',
      selector: '[role="dialog"]',
      current: padding,
      target: '20px',
      delta: 'Varies',
      severity: 'P2',
      status: 'warn',
      recommendation: 'Use consistent 20px modal padding',
      computed: padding,
    });
    
    findings.push({
      id: `modal-radius-${scan.route}`,
      route: scan.route,
      area: 'Modal',
      element: 'Modal Border Radius',
      selector: '[role="dialog"]',
      current: radius,
      target: '12px',
      delta: 'Varies',
      severity: 'P3',
      status: parseFloat(radius) >= 8 ? 'pass' : 'warn',
      recommendation: 'Use 12px border radius for modals',
      computed: radius,
    });
  }
  
  return findings;
}

// Export scan results as JSON
export function exportScanResults(scan: DOMScanResult): string {
  return JSON.stringify(scan, null, 2);
}
