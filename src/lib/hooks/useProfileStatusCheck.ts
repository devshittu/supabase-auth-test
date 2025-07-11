// src/lib/hooks/useProfileStatusCheck.ts - REVISED (Adapt to Strict/Default Mode)
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole } from '@/lib/rbac-hook';
import { logger } from '@/lib/logger';
import { PROFILE_APPROVAL_STRICT_MODE } from '@/config/constants'; // Import the constant

interface ProfileStatus {
  hasProfile: boolean;
  isComplete: boolean;
  isApproved: boolean;
}

export const useProfileStatusCheck = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: userProfile, isLoading, isError } = useUserRole();

  const [profileStatus, setProfileStatus] = useState<ProfileStatus>({
    hasProfile: false,
    isComplete: false,
    isApproved: false,
  });

  const [showProfileCompletionModal, setShowProfileCompletionModal] = useState(false);
  const [showApprovalPendingBanner, setShowApprovalPendingBanner] = useState(false); // For default mode

  useEffect(() => {
    if (isLoading) {
      return; // Still loading, do nothing yet
    }

    if (isError) {
      // This means useUserRole encountered a deeper error than just missing profile.
      // The onError in useUserRole should already display a toast.
      // We might want to clear local state or redirect if it's a persistent error.
      logger.error('useProfileStatusCheck: Error fetching user profile, possibly unrecoverable without re-auth.', isError);
      setProfileStatus({ hasProfile: false, isComplete: false, isApproved: false });
      setShowProfileCompletionModal(false);
      setShowApprovalPendingBanner(false);
      return;
    }

    const currentProfileStatus: ProfileStatus = {
      hasProfile: userProfile !== null,
      isComplete: false,
      isApproved: false,
    };

    if (userProfile) {
      currentProfileStatus.isComplete = !!userProfile.name && !!userProfile.departmentId && !!userProfile.roleId;
      currentProfileStatus.isApproved = userProfile.approved;
    }

    setProfileStatus(currentProfileStatus);

    // --- Logic for Profile Completion (Modal for both modes) ---
    if (!currentProfileStatus.hasProfile || !currentProfileStatus.isComplete) {
      if (!pathname.startsWith('/profile')) {
        // Always show the modal for profile creation/completion
        setShowProfileCompletionModal(true);
        setShowApprovalPendingBanner(false); // Ensure banner is hidden if modal is up
      } else {
        setShowProfileCompletionModal(false); // If already on profile page, modal is not needed
        setShowApprovalPendingBanner(false);
      }
      return; // Stop here if profile is incomplete/not created
    } else {
      setShowProfileCompletionModal(false); // Hide completion modal if profile is complete
    }

    // --- Logic for Profile Approval (Strict vs. Default Mode) ---
    if (currentProfileStatus.hasProfile && currentProfileStatus.isComplete && !currentProfileStatus.isApproved) {
      if (PROFILE_APPROVAL_STRICT_MODE) {
        logger.warn('useProfileStatusCheck: Profile complete but unapproved (strict mode). Redirecting.');
        if (!pathname.startsWith('/profile')) {
          router.replace('/profile?pendingApproval=true');
        }
        setShowApprovalPendingBanner(false);
      } else {
        logger.debug('useProfileStatusCheck: Profile complete but unapproved (default mode). Showing banner.');
        // Allow user to proceed but show banner
        setShowApprovalPendingBanner(true);
      }
    } else {
      // Profile is complete AND approved OR not applicable (e.g. no profile exists yet)
      setShowApprovalPendingBanner(false);
    }

  }, [userProfile, isLoading, isError, router, pathname]);

  return {
    profileStatus,
    showProfileCompletionModal,
    showApprovalPendingBanner,
    closeProfileCompletionModal: () => setShowProfileCompletionModal(false),
    closeApprovalPendingBanner: () => setShowApprovalPendingBanner(false), // For banner dismissal
  };
};

// // src/lib/hooks/useProfileStatusCheck.ts - REVISED (Fix router.pathname)
// import { useEffect, useState } from 'react';
// import { useRouter, usePathname } from 'next/navigation'; // Import usePathname
// import { useUserRole } from '@/lib/rbac-hook';
// import { logger } from '@/lib/logger';

// interface UseProfileStatusCheckOptions {
//   redirectOnIncomplete?: boolean;
//   redirectOnPendingApproval?: boolean;
// }

// export const useProfileStatusCheck = (options?: UseProfileStatusCheckOptions) => {
//   const router = useRouter();
//   const pathname = usePathname(); // Get pathname using usePathname hook
//   const { data: userProfile, isLoading, isError } = useUserRole();
//   const [showProfileModal, setShowProfileModal] = useState(false);
//   const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
//   const [isProfilePendingApproval, setIsProfilePendingApproval] = useState(false);

//   useEffect(() => {
//     if (isLoading) {
//       // Still loading, do nothing yet
//       return;
//     }

//     if (isError) {
//       logger.error('useProfileStatusCheck: Error fetching user profile:', isError);
//       // If useUserRole errors out (e.g., 403), it means the profile might be inaccessible
//       // or not exist. We need to check the actual userProfile value.
//     }

//     if (userProfile === null) {
//         // This signifies no profile exists for the logged-in user.
//         // It could be due to a 404 from the API or genuinely no record.
//         logger.debug('useProfileStatusCheck: No userProfile found for the logged-in user.');
//         if (!pathname.startsWith('/profile')) {
//             router.replace('/profile?createProfile=true');
//         }
//         return; // Exit as action has been taken or it's being handled by profile page
//     }

//     // Now, userProfile is definitely an object (though possibly with null/undefined fields)
//     const incomplete = !userProfile?.name || !userProfile?.departmentId || !userProfile?.roleId;
//     const pendingApproval = !userProfile?.approved;

//     setIsProfileIncomplete(incomplete);
//     setIsProfilePendingApproval(pendingApproval);

//     if (incomplete) {
//       logger.debug('useProfileStatusCheck: Profile is incomplete.');
//       if (options?.redirectOnIncomplete) {
//         if (!pathname.startsWith('/profile')) { // Only redirect if not already on the profile page
//           router.replace('/profile?createProfile=true');
//         }
//       } else {
//         setShowProfileModal(true);
//       }
//     } else if (pendingApproval) {
//       logger.debug('useProfileStatusCheck: Profile is pending approval.');
//       if (options?.redirectOnPendingApproval) {
//         if (!pathname.startsWith('/profile')) { // Only redirect if not already on the profile page
//           router.replace('/profile?pendingApproval=true');
//         }
//       } else {
//         setShowProfileModal(true);
//       }
//     } else {
//       // Profile is complete and approved
//       setShowProfileModal(false);
//     }
//   }, [userProfile, isLoading, isError, router, pathname, options]); // Add pathname to dependency array

//   return {
//     showProfileModal,
//     isProfileIncomplete,
//     isProfilePendingApproval,
//     closeProfileModal: () => setShowProfileModal(false),
//   };
// };
