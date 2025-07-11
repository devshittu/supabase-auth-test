// src/app/dashboard/page.tsx - REVISED (Integrate new profile status hook and banner)
'use client';

import { useHasAccess, useUserRole } from '@/lib/rbac-hook';
import { RoleLevel } from '@/lib/rbac';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import { useEffect } from 'react';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import { useProfileStatusCheck } from '@/lib/hooks/useProfileStatusCheck';
import { PROFILE_APPROVAL_STRICT_MODE } from '@/config/constants'; // Import for UI logic

export default function DashboardPage() {
  const { data: userProfile, isLoading, isError } = useUserRole();
  const hasAssistantAccess = useHasAccess(RoleLevel.ASSISTANT);
  const hasManagerAccess = useHasAccess(RoleLevel.MANAGER);
  const hasSuperAdminAccess = useHasAccess(RoleLevel.SUPER_ADMIN);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  // Use the new profile status check hook
  const {
    profileStatus, // Contains hasProfile, isComplete, isApproved
    showProfileCompletionModal,
    showApprovalPendingBanner,
    closeProfileCompletionModal,
    closeApprovalPendingBanner,
  } = useProfileStatusCheck(); // No options needed here anymore

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug(`Dashboard Auth State Change Event: ${event}`);
        if (event === 'SIGNED_OUT') {
          toast.info('Logged out successfully.');
          logger.debug('Auth Listener: Redirecting to login page after logout.');
          router.replace('/login');
        }
      },
    );

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [supabase, router]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Logout error:', error.message);
        toast.error(error.message);
      }
    } catch (err) {
      logger.error('Unexpected logout error:', err);
      toast.error('An unexpected error occurred during logout.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading dashboard...
      </div>
    );
  }

  // If there's an error and no profile, and we are not explicitly handling it with a modal/redirect,
  // show a generic error.
  if (isError || (!userProfile && !showProfileCompletionModal)) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        Error loading user data or profile information. Please try again.
      </div>
    );
  }

  // If profile is incomplete, the useProfileStatusCheck hook will set showProfileCompletionModal.
  // We want to render the modal first, potentially blocking content behind it.
  if (!profileStatus.isComplete && showProfileCompletionModal) {
    return (
      <>
        {/* Render a placeholder or nothing while modal is active */}
        <div className="min-h-screen bg-base-200 p-8 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="ml-2">Please complete your profile...</p>
        </div>
        <ProfileCompletionModal
          isOpen={showProfileCompletionModal}
          onClose={closeProfileCompletionModal}
          isProfileIncomplete={!profileStatus.isComplete}
          isProfilePendingApproval={false} // This modal is specifically for completion
        />
      </>
    );
  }

  // If in strict mode and not approved, useProfileStatusCheck redirects. So this code won't run.
  // If in default mode and unapproved, show the banner.
  const showPendingBanner = showApprovalPendingBanner && !PROFILE_APPROVAL_STRICT_MODE && profileStatus.hasProfile && profileStatus.isComplete && !profileStatus.isApproved;

  return (
    <div className="min-h-screen bg-base-200 p-8">
      {showPendingBanner && (
        <div role="alert" className="alert alert-warning mb-4 transition-all duration-300 ease-in-out">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span>Your profile is pending admin approval. Some features may be limited. <Link href="/profile" className="link link-primary">Review profile</Link></span>
          <button onClick={closeApprovalPendingBanner} className="btn btn-sm btn-ghost">Dismiss</button>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">
          Welcome, {userProfile?.name || 'User'}!
        </h1>
        <button onClick={handleLogout} className="btn btn-error">
          Logout
        </button>
      </div>

      <div className="card bg-base-100 shadow-xl p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Your Information</h2>
        <p>
          <strong>Email:</strong> {userProfile?.userId} (Supabase ID)
        </p>
        <p>
          <strong>Department:</strong> {userProfile?.department?.name || 'N/A'}
        </p>
        <p>
          <strong>Role:</strong> {userProfile?.role?.name || 'N/A'} (Level:{' '}
          {userProfile?.role?.level})
        </p>
        <p>
          <strong>Approved:</strong>{' '}
          {userProfile?.approved ? 'Yes' : 'No (Pending Admin Approval)'}
        </p>
        <Link href="/profile" className="btn btn-link mt-4">
          Edit Profile
        </Link>
      </div>

      {/* Conditional rendering based on approval status if in strict mode */}
      {(!PROFILE_APPROVAL_STRICT_MODE || (PROFILE_APPROVAL_STRICT_MODE && profileStatus.isApproved)) ? (
        <>
          <h2 className="text-2xl font-semibold mb-4">Access Based on Your Role</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasAssistantAccess && (
              <div className="card bg-base-100 shadow-xl p-6">
                <h3 className="text-xl font-bold mb-2">
                  Basic Data Access (Assistant Level)
                </h3>
                <p>You can view basic data within the system.</p>
                <button className="btn btn-info mt-4">View Basic Reports</button>
              </div>
            )}

            {hasManagerAccess && (
              <div className="card bg-base-100 shadow-xl p-6">
                <h3 className="text-xl font-bold mb-2">
                  Department Management (Manager Level)
                </h3>
                <p>You can manage users and resources within your department.</p>
                <button className="btn btn-warning mt-4">Manage Department</button>
              </div>
            )}

            {hasSuperAdminAccess && (
              <div className="card bg-base-100 shadow-xl p-6">
                <h3 className="text-xl font-bold mb-2">
                  Administrator Functions (Super Admin)
                </h3>
                <p>
                  You have full access to all resources and administrative
                  functions.
                </p>
                <Link href="/admin" className="btn btn-error mt-4">
                  Go to Admin Panel
                </Link>
              </div>
            )}
          </div>
        </>
      ) : (
        // Content for strict mode unapproved users (e.g., a message)
        <div role="alert" className="alert alert-info mt-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLineLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Your profile is pending admin approval. You cannot access main features until approved.</span>
            <Link href="/profile" className="btn btn-sm btn-primary">Go to Profile Page</Link>
        </div>
      )}

      {/* Profile Completion Modal (for incomplete/no profile) */}
      <ProfileCompletionModal
        isOpen={showProfileCompletionModal}
        onClose={closeProfileCompletionModal}
        isProfileIncomplete={!profileStatus.isComplete && profileStatus.hasProfile}
        isProfilePendingApproval={false} // This modal is for completion, not just approval
      />
    </div>
  );
}

// src/app/dashboard/page.tsx - REVISED (Fix variable names)
