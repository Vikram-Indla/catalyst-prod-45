/**
 * Product Environment Guard
 *
 * Validates that APP_PRODUCT is set and routes the app to the correct product module.
 * Called at app startup to fail fast if environment is misconfigured.
 *
 * CAT-STRATA-ISOLATE-20260707-001
 */

export type Product = 'CATALYST' | 'STRATA';

interface ProductConfig {
  product: Product;
  name: string;
  description: string;
}

const PRODUCT_CONFIGS: Record<Product, ProductConfig> = {
  CATALYST: {
    product: 'CATALYST',
    name: 'Catalyst',
    description: 'Catalyst strategic planning and project management',
  },
  STRATA: {
    product: 'STRATA',
    name: 'STRATA',
    description: 'STRATA strategic execution platform',
  },
};

/**
 * Get the configured product from APP_PRODUCT environment variable.
 * Throws an error if APP_PRODUCT is missing or invalid.
 */
export function getConfiguredProduct(): Product {
  const appProduct = import.meta.env.VITE_APP_PRODUCT as string | undefined;

  if (!appProduct) {
    const error = new Error(
      `❌ APP_PRODUCT environment variable is not set.\n\n` +
      `Set APP_PRODUCT to one of: CATALYST, STRATA\n\n` +
      `Examples:\n` +
      `  APP_PRODUCT=CATALYST npm run dev:catalyst\n` +
      `  APP_PRODUCT=STRATA npm run dev:strata\n\n` +
      `Or copy one of the environment templates:\n` +
      `  cp .env.example.catalyst .env.local  (for Catalyst)\n` +
      `  cp .env.example.strata .env.local    (for STRATA)`
    );
    throw error;
  }

  const product = appProduct.toUpperCase() as Product;

  if (!PRODUCT_CONFIGS[product]) {
    const validProducts = Object.keys(PRODUCT_CONFIGS).join(', ');
    const error = new Error(
      `❌ Invalid APP_PRODUCT value: "${appProduct}"\n\n` +
      `Valid values: ${validProducts}\n\n` +
      `Current setting does not match any known product.`
    );
    throw error;
  }

  return product;
}

/**
 * Validate product environment at app startup.
 * Call this in src/main.tsx before mounting the app.
 *
 * Fails fast if:
 * - APP_PRODUCT is not set
 * - APP_PRODUCT is invalid
 * - Supabase configuration is missing
 */
export function validateProductEnvironment(): Product {
  // Get and validate product
  const product = getConfiguredProduct();
  const config = PRODUCT_CONFIGS[product];

  // Log product selection
  if (import.meta.env.DEV) {
    console.log(
      `✅ Product initialized: ${config.name}\n` +
      `   ${config.description}\n` +
      `   APP_PRODUCT=${product}`
    );
  }

  // Validate Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const error = new Error(
      `❌ Supabase configuration missing for product: ${product}\n\n` +
      `Required environment variables:\n` +
      `  - VITE_SUPABASE_URL\n` +
      `  - VITE_SUPABASE_PUBLISHABLE_KEY\n\n` +
      `Copy the appropriate environment template:\n` +
      `  cp .env.example.${product.toLowerCase()} .env.local`
    );
    throw error;
  }

  return product;
}

/**
 * Create a product-aware context/hook hook for the app.
 * Returns the current product so UI can route accordingly.
 */
export function useProductContext(): Product {
  return getConfiguredProduct();
}

/**
 * Check if running on a specific product.
 */
export function isProduct(p: Product): boolean {
  try {
    return getConfiguredProduct() === p;
  } catch {
    // If env var is invalid, return false
    return false;
  }
}
