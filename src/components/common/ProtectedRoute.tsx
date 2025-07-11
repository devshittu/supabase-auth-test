// src/components/common/ProtectedRoute.tsx
'use client';

import { ReactNode } from 'react';
import { useHasAccess } from '@/lib/rbac-hook';
import { RoleLevel } from '@/lib/rbac';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: RoleLevel;
  fallback?: ReactNode;
}

export const ProtectedRoute = ({
  children,
  requiredRole,
  fallback,
}: ProtectedRouteProps) => {
  const hasAccess = useHasAccess(requiredRole);
  const router = useRouter();

  useEffect(() => {
    if (!hasAccess && !fallback) {
      logger.warn(
        `ProtectedRoute: Access denied for required role ${requiredRole}. Redirecting to /forbidden.`,
      );
      router.push('/forbidden');
    }
  }, [hasAccess, requiredRole, router, fallback]);

  if (hasAccess) {
    return <>{children}</>;
  } else {
    return fallback || null; // Render fallback or nothing if no access
  }
};
