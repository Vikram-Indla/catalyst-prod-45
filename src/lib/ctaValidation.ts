/**
 * No Dead CTA Runtime Assertion
 * Development-only utility that scans visible CTAs and validates they are functional
 */

interface CTAValidationResult {
  element: HTMLElement;
  ctaId: string;
  isValid: boolean;
  issues: string[];
}

interface CTAReport {
  timestamp: Date;
  route: string;
  totalCTAs: number;
  validCTAs: number;
  invalidCTAs: CTAValidationResult[];
}

/**
 * Validates a single CTA element
 */
function validateCTA(element: HTMLElement): CTAValidationResult {
  const ctaId = element.getAttribute('data-cta') || 'unknown';
  const issues: string[] = [];

  // Check if element is visible
  const style = window.getComputedStyle(element);
  const isVisible = style.display !== 'none' && 
                    style.visibility !== 'hidden' && 
                    style.opacity !== '0';

  if (!isVisible) {
    // Skip hidden elements - they're not dead, just hidden
    return { element, ctaId, isValid: true, issues: [] };
  }

  // Check for onClick handler
  const hasOnClick = !!(element as any).onclick || 
                     element.hasAttribute('onclick') ||
                     element.getAttribute('role') === 'button' ||
                     element.closest('[role="button"]');

  // Check for href (for links)
  const hasHref = element.hasAttribute('href') && 
                  element.getAttribute('href') !== '#' &&
                  element.getAttribute('href') !== '';

  // Check if it's a form submit button
  const isSubmitButton = element.getAttribute('type') === 'submit' ||
                         (element.tagName === 'BUTTON' && element.closest('form'));

  // Check if disabled
  const isDisabled = element.hasAttribute('disabled') || 
                     element.getAttribute('aria-disabled') === 'true';

  // Check for disabled reason
  const hasDisabledReason = element.hasAttribute('data-disabled-reason') ||
                            element.hasAttribute('title') ||
                            element.hasAttribute('aria-label');

  // Validate
  if (isDisabled) {
    if (!hasDisabledReason) {
      issues.push('Disabled without accessible reason (add data-disabled-reason, title, or aria-label)');
    }
  } else {
    // Not disabled, must have an action
    const hasAction = hasOnClick || hasHref || isSubmitButton;
    
    // Check for React event listeners (they don't show up on the element directly)
    const reactProps = Object.keys(element).find(key => key.startsWith('__reactProps'));
    const hasReactHandler = reactProps && (element as any)[reactProps]?.onClick;
    
    if (!hasAction && !hasReactHandler) {
      issues.push('No onClick handler, href, or form submit found');
    }
  }

  return {
    element,
    ctaId,
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Scan all CTAs on the current page
 */
export function scanCTAs(): CTAReport {
  const ctaElements = document.querySelectorAll('[data-cta]');
  const results: CTAValidationResult[] = [];

  ctaElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      results.push(validateCTA(el));
    }
  });

  const invalidCTAs = results.filter(r => !r.isValid);

  return {
    timestamp: new Date(),
    route: window.location.pathname,
    totalCTAs: results.length,
    validCTAs: results.length - invalidCTAs.length,
    invalidCTAs,
  };
}

/**
 * Assert no dead CTAs exist on the page
 * Throws in development if dead CTAs are found
 */
export function assertNoDeadCTAs(): void {
  if (import.meta.env.PROD) return; // Only run in development

  const report = scanCTAs();

  if (report.invalidCTAs.length > 0) {
    console.group('🚨 Dead CTA Assertion Failed');
    console.error(`Found ${report.invalidCTAs.length} dead CTA(s) on ${report.route}`);
    
    report.invalidCTAs.forEach(({ ctaId, element, issues }) => {
      console.group(`❌ CTA: ${ctaId}`);
      console.log('Element:', element);
      console.log('Issues:', issues);
      console.groupEnd();
    });
    
    console.groupEnd();

    // In strict mode, throw an error
    if (import.meta.env.VITE_STRICT_CTA_VALIDATION === 'true') {
      throw new Error(`Dead CTA assertion failed: ${report.invalidCTAs.length} dead CTA(s) found`);
    }
  }
}

/**
 * Log CTA report to console (for debugging)
 */
export function logCTAReport(): void {
  const report = scanCTAs();
  
  console.group('📊 CTA Validation Report');
  console.log(`Route: ${report.route}`);
  console.log(`Total CTAs: ${report.totalCTAs}`);
  console.log(`Valid: ${report.validCTAs}`);
  console.log(`Invalid: ${report.invalidCTAs.length}`);
  
  if (report.invalidCTAs.length > 0) {
    console.group('Invalid CTAs:');
    report.invalidCTAs.forEach(({ ctaId, issues }) => {
      console.log(`- ${ctaId}: ${issues.join(', ')}`);
    });
    console.groupEnd();
  }
  
  console.groupEnd();
}

/**
 * React hook to run CTA validation after render
 */
export function useCTAValidation(enabled = true): void {
  if (typeof window === 'undefined') return;
  if (import.meta.env.PROD) return;
  if (!enabled) return;

  // Run after a short delay to let React finish rendering
  setTimeout(() => {
    assertNoDeadCTAs();
  }, 100);
}

/**
 * Get all CTAs for testing purposes
 */
export function getAllCTAs(): { id: string; element: HTMLElement; type: string }[] {
  const ctaElements = document.querySelectorAll('[data-cta]');
  const result: { id: string; element: HTMLElement; type: string }[] = [];

  ctaElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      result.push({
        id: el.getAttribute('data-cta') || 'unknown',
        element: el,
        type: el.tagName.toLowerCase(),
      });
    }
  });

  return result;
}
