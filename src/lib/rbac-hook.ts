// src/lib/rbac-hook.ts - REVISED (Handle 403/404 specifically)
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import { RoleLevel, hasRequiredLevel } from './rbac';
import { logger } from './logger';
import { AxiosError } from 'axios'; // Import AxiosError
import { toast } from 'react-toastify';

interface UserProfileData {
  id: string;
  userId: string;
  name?: string;
  departmentId: number;
  roleId: number;
  approved: boolean;
  role: {
    id: number;
    name: string;
    level: number;
  };
  department: {
    id: number;
    name: string;
  };
}

export const useUserRole = () => {
  return useQuery<UserProfileData | null>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        const data = await apiClient.get('/profile');
        // The API /profile GET now returns 200 with null if no profile found.
        if (data === null) {
          logger.debug('useUserRole: API returned null profile (no profile found for user).');
          return null; // Explicitly return null if backend says no profile
        }
        return data as unknown as UserProfileData;
      } catch (error) {
        const axiosError = error as AxiosError;
        logger.error('Failed to fetch user profile in useUserRole:', axiosError);

        if (axiosError.response) {
          // The API route protector will return 403 with specific messages
          // based on incomplete/unapproved profile status.
          // We don't want to throw an error that makes useQuery fail if
          // the user is simply unapproved or incomplete but can still access /profile
          // For any other 4xx or 5xx, useQuery's error state is appropriate.
          if (axiosError.response.status === 403) {
            // This 403 means the route protector (correctly) denied access
            // because the user's profile is incomplete/unapproved and the *target route*
            // does NOT allow unapproved/incomplete.
            // Since we're trying to get the *profile itself* via /profile endpoint,
            // this particular 403 from /profile GET means something is still wrong with
            // the /api/profile/route.ts restrictTo options, or the profile truly doesn't exist.
            // With the new /api/profile GET returning 200 null, this 403 shouldn't happen here *for fetching own profile*.
            // If it still happens, it implies an RBAC issue on the /profile endpoint itself.
            logger.warn('useUserRole: Received 403, likely due to an unapproved/incomplete profile restriction on an API endpoint NOT /profile.');
            // We return null here, letting the dependent components handle the lack of profile data
            // (which will trigger the modal/redirect flow).
            return null;
          }
          if (axiosError.response.status === 401) {
            // This generally means the session expired or is invalid.
            // apiClient's interceptor should handle redirecting to login.
            return null;
          }
        }
        // For other errors, let react-query handle the error state.
        throw error;
      }
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // Add an onError callback for toast messages
    // onError: (error: AxiosError) => {
    //     if (error.response?.status === 403) {
    //         // This specifically targets the cases where an API *other than /profile* is hit
    //         // and the profile is incomplete/unapproved.
    //         const message = error.response.data?.message || 'Access denied due to incomplete or unapproved profile.';
    //         toast.warn(message);
    //     } else if (error.response?.status === 401) {
    //         toast.error('Session expired or invalid. Please log in again.');
    //     } else {
    //         toast.error('An error occurred while loading profile data.');
    //     }
    // }
  });
};

// ... useHasAccess and useUserDepartment remain unchanged from your provided code
export const useHasAccess = (requiredLevel: RoleLevel): boolean => {
  const { data: userProfile, isLoading, isError } = useUserRole();

  if (isLoading || isError || !userProfile) {
    return false;
  }

  return hasRequiredLevel(
    userProfile.role?.level || RoleLevel.OPEN,
    requiredLevel,
  );
};

export const useUserDepartment = (): string | undefined => {
  const { data: userProfile } = useUserRole();
  return userProfile?.department?.name;
};

// src/lib/rbac-hook.ts