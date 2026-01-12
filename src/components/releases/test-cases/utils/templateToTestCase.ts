/**
 * Convert template data to pre-filled test case form data
 */

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  stepCount: number;
  tags: string[];
  popular?: boolean;
}

export interface PrefilledTestCase {
  title: string;
  description: string;
  type: 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e' | 'performance' | 'security' | 'usability';
  priority: 'critical' | 'high' | 'medium' | 'low';
  folder: string;
  preconditions?: string;
  steps?: string[];
}

// Template pre-fill data with actual test case content
const templatePrefilledData: Record<string, Omit<PrefilledTestCase, 'title'>> = {
  'login-flow': {
    description: 'Verify that users can successfully log in with valid credentials and receive appropriate error messages for invalid attempts.',
    type: 'functional',
    priority: 'critical',
    folder: 'authentication',
    preconditions: 'User account must exist in the system. Test environment must be accessible.',
    steps: [
      'Navigate to the login page',
      'Verify login form is displayed with username and password fields',
      'Enter valid username in the username field',
      'Enter valid password in the password field',
      'Click the Login button',
      'Verify user is redirected to the dashboard',
      'Verify user session is created',
      'Verify logout functionality works correctly',
    ],
  },
  'registration': {
    description: 'Test the complete user registration flow including form validation, email verification, and account creation.',
    type: 'functional',
    priority: 'high',
    folder: 'authentication',
    preconditions: 'Registration feature must be enabled. Email service must be configured.',
    steps: [
      'Navigate to registration page',
      'Verify all required fields are present',
      'Enter valid first name and last name',
      'Enter valid email address',
      'Enter password meeting complexity requirements',
      'Confirm password matches',
      'Accept terms and conditions',
      'Click Register button',
      'Verify confirmation email is sent',
      'Click verification link in email',
      'Verify account is activated',
      'Verify user can log in with new credentials',
    ],
  },
  'payment-flow': {
    description: 'Validate the complete payment processing flow including card validation, transaction processing, and confirmation.',
    type: 'e2e',
    priority: 'critical',
    folder: 'payments',
    preconditions: 'Test payment gateway must be configured. Test card numbers must be available.',
    steps: [
      'Add items to shopping cart',
      'Proceed to checkout',
      'Enter shipping information',
      'Select payment method (Credit Card)',
      'Enter valid card number',
      'Enter expiration date',
      'Enter CVV code',
      'Verify card validation passes',
      'Click Pay Now button',
      'Wait for payment processing',
      'Verify transaction success message',
      'Verify order confirmation email received',
      'Verify order appears in order history',
      'Test payment failure scenario with invalid card',
      'Verify appropriate error message displayed',
    ],
  },
  'search-filter': {
    description: 'Test search functionality with various filters, sorting options, and pagination across different data sets.',
    type: 'functional',
    priority: 'medium',
    folder: 'core-features',
    preconditions: 'Test data must be populated in the database. Search index must be up to date.',
    steps: [
      'Navigate to search page',
      'Enter search keyword in search field',
      'Verify search results are displayed',
      'Apply category filter',
      'Verify results are filtered correctly',
      'Apply date range filter',
      'Apply sorting by relevance',
      'Apply sorting by date',
      'Navigate to page 2 of results',
      'Clear all filters and verify reset',
    ],
  },
  'shopping-cart': {
    description: 'Verify shopping cart functionality including add/remove items, quantity updates, and cart persistence.',
    type: 'functional',
    priority: 'high',
    folder: 'ecommerce',
    preconditions: 'Products must be available in catalog. User may or may not be logged in.',
    steps: [
      'Navigate to product catalog',
      'Click Add to Cart on a product',
      'Verify item appears in cart',
      'Increase quantity to 3',
      'Verify subtotal updates correctly',
      'Add another product to cart',
      'Verify cart count shows 2 items',
      'Remove first item from cart',
      'Verify cart updates correctly',
      'Log out and log back in',
      'Verify cart items persist',
      'Clear entire cart',
      'Verify cart is empty',
      'Test cart with out-of-stock item',
    ],
  },
  'file-upload': {
    description: 'Test file upload functionality with various file types, size limits, and progress tracking.',
    type: 'functional',
    priority: 'medium',
    folder: 'core-features',
    preconditions: 'Upload feature must be enabled. Storage must have sufficient space.',
    steps: [
      'Navigate to file upload section',
      'Click Upload button or drag file',
      'Select a valid file (under size limit)',
      'Verify upload progress is displayed',
      'Verify upload completes successfully',
      'Try uploading unsupported file type',
      'Verify appropriate error message',
      'Try uploading file exceeding size limit',
      'Verify file appears in file list',
    ],
  },
  'profile-settings': {
    description: 'Test user profile management including personal information updates, preferences, and account settings.',
    type: 'functional',
    priority: 'medium',
    folder: 'user-management',
    preconditions: 'User must be logged in. Profile page must be accessible.',
    steps: [
      'Navigate to profile settings',
      'Update display name',
      'Update email address',
      'Verify email change confirmation required',
      'Update phone number',
      'Change notification preferences',
      'Update language preference',
      'Update timezone',
      'Upload profile picture',
      'Save all changes and verify persistence',
    ],
  },
  'access-control': {
    description: 'Verify role-based access control for different user roles and permission levels.',
    type: 'security',
    priority: 'critical',
    folder: 'security',
    preconditions: 'Test users with different roles must exist. RBAC must be configured.',
    steps: [
      'Log in as admin user',
      'Verify access to admin panel',
      'Log out and log in as regular user',
      'Verify admin panel is not accessible',
      'Attempt to access restricted API endpoint',
      'Verify 403 Forbidden response',
      'Log in as manager role',
      'Verify access to management features',
      'Verify no access to admin-only features',
      'Test permission escalation prevention',
      'Verify audit log captures access attempts',
      'Test role modification restrictions',
    ],
  },
  'responsive-layout': {
    description: 'Verify UI responsiveness across desktop, tablet, and mobile viewports.',
    type: 'usability',
    priority: 'medium',
    folder: 'ui-ux',
    preconditions: 'Access to browser dev tools or multiple devices.',
    steps: [
      'Open application on desktop (1920x1080)',
      'Verify layout is correct',
      'Resize to tablet viewport (768x1024)',
      'Verify navigation adapts correctly',
      'Resize to mobile viewport (375x667)',
      'Verify mobile menu appears',
      'Test all interactive elements on mobile',
    ],
  },
  'api-integration': {
    description: 'Test API endpoint integration with request/response validation and error handling.',
    type: 'integration',
    priority: 'high',
    folder: 'api-tests',
    preconditions: 'API endpoints must be accessible. Authentication tokens must be available.',
    steps: [
      'Send GET request to list endpoint',
      'Verify 200 response with correct schema',
      'Send POST request to create resource',
      'Verify 201 response with created resource',
      'Send PUT request to update resource',
      'Verify 200 response with updated data',
      'Send DELETE request',
      'Verify 204 response',
      'Test with invalid authentication',
      'Verify 401 Unauthorized response',
    ],
  },
  'data-crud': {
    description: 'Comprehensive testing of Create, Read, Update, Delete operations with validation.',
    type: 'functional',
    priority: 'high',
    folder: 'core-features',
    preconditions: 'Database must be accessible. User must have CRUD permissions.',
    steps: [
      'Navigate to data management section',
      'Click Create New button',
      'Fill in all required fields',
      'Submit form and verify creation',
      'View created record details',
      'Click Edit button',
      'Modify multiple fields',
      'Save changes and verify update',
      'Search for the record',
      'Verify record appears in results',
      'Click Delete button',
      'Confirm deletion',
      'Verify record no longer exists',
      'Test validation errors on create',
      'Test concurrent update handling',
      'Verify audit trail is created',
    ],
  },
  'form-validation': {
    description: 'Test comprehensive form validation including required fields, format validation, and error messages.',
    type: 'functional',
    priority: 'medium',
    folder: 'core-features',
    preconditions: 'Form must be accessible. Validation rules must be configured.',
    steps: [
      'Navigate to form page',
      'Submit empty form',
      'Verify all required field errors shown',
      'Enter invalid email format',
      'Verify email format error',
      'Enter password below minimum length',
      'Verify password length error',
      'Enter mismatched password confirmation',
      'Enter special characters in name field',
      'Enter valid data in all fields',
      'Submit form and verify success',
      'Test max length validation',
    ],
  },
};

/**
 * Convert a template to pre-filled test case data
 */
export function templateToTestCase(template: Template): PrefilledTestCase {
  const prefilled = templatePrefilledData[template.id];
  
  if (!prefilled) {
    // Fallback for unknown templates
    return {
      title: template.name,
      description: template.description,
      type: 'functional',
      priority: 'medium',
      folder: template.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    };
  }

  return {
    title: template.name,
    ...prefilled,
  };
}
