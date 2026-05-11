// Thin re-export — delegates to the canonical AuthProvider context in src/lib/auth.tsx.
// All consumers get { user, session, signIn, signUp, signOut, loading, isAuthenticated }
// from a single shared subscription instead of 43 independent getSession() pollers.
export { useAuth } from '@/lib/auth';
export { useAuth as default } from '@/lib/auth';
