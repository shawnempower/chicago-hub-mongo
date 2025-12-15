import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/CustomAuthContext';

/**
 * Redirects users from the root path based on authentication status:
 * - Authenticated users -> /dashboard
 * - Unauthenticated users -> /auth
 */
export function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
}
