import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/CustomAuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useHubContext } from '@/contexts/HubContext';
import { Spinner } from '@/components/ui/spinner';

interface HubRouteProps {
  children: ReactNode;
}

/**
 * Route wrapper that allows:
 * - Admin users (see all hubs)
 * - Hub users (see their assigned hubs)
 */
export const HubRoute = ({ children }: HubRouteProps) => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const { hubs, loading: hubsLoading } = useHubContext();

  if (adminLoading || hubsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Allow admins
  if (isAdmin) {
    return <>{children}</>;
  }

  // Allow hub users (check permissions directly for reliability)
  const hasHubAccess = user?.permissions?.assignedHubIds && user.permissions.assignedHubIds.length > 0;
  
  // Also check if they have any hubs after filtering
  const hasFilteredHubs = hubs && hubs.length > 0;
  
  if (hasHubAccess || hasFilteredHubs) {
    return <>{children}</>;
  }

  // If user is neither admin nor has hub access, redirect to dashboard
  console.warn('⚠️ HubRoute: Access denied - no hub permissions found');
  return <Navigate to="/dashboard" replace />;
};

