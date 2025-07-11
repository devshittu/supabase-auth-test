// src/app/profile/page.tsx - MODIFIED (Minor adjustment for isEditing)
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useUserRole } from '@/lib/rbac-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';
import { useRouter, useSearchParams } from 'next/navigation';
import { Department, Role, Profile } from '@prisma/client';
import Link from 'next/link';

interface ProfileWithDetails extends Profile {
  department?: Department;
  role?: Role;
}

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const { data: currentUserProfile, isLoading, isError } = useUserRole(); // Use isLoading, isError directly

  const [name, setName] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [isEditing, setIsEditing] = useState(false);

  const isCreatingProfileFlow = searchParams.get('createProfile') === 'true';
  const isPendingApprovalFlow = searchParams.get('pendingApproval') === 'true';

  // Fetch departments and roles for dropdowns
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        // Use the correct API path for departments (assuming it's /api/departments, not /departments)
        // Also ensure your backend /api/departments allows unapproved/incomplete users
        return await apiClient.get('/departments');
      } catch (error) {
        logger.error('Error fetching departments:', error);
        return [];
      }
    },
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        // Use the correct API path for roles (assuming it's /api/roles, not /roles)
        // Also ensure your backend /api/roles allows unapproved/incomplete users
        return await apiClient.get('/roles');
      } catch (error) {
        logger.error('Error fetching roles:', error);
        return [];
      }
    },
  });

  useEffect(() => {
    if (currentUserProfile) {
      setName(currentUserProfile.name || '');
      setSelectedDepartmentId(currentUserProfile.departmentId || '');
      setSelectedRoleId(currentUserProfile.roleId || '');
      // If profile is incomplete, or if explicitly in creation/pending approval flow, enable editing
      if (isCreatingProfileFlow || isPendingApprovalFlow || !currentUserProfile.name || !currentUserProfile.departmentId || !currentUserProfile.roleId) {
        setIsEditing(true);
      } else {
        // Default to view mode if profile is complete and approved
        setIsEditing(false);
      }
    } else if (isCreatingProfileFlow) {
      // If no profile and createProfile flag is true, go straight to edit for creation
      setIsEditing(true);
    }
  }, [currentUserProfile, isCreatingProfileFlow, isPendingApprovalFlow]);


  const filteredRoles = roles.filter(role =>
    selectedDepartmentId ? role.departmentId === selectedDepartmentId : true
  ) || [];


  const createProfileMutation = useMutation({
    mutationFn: async (newProfileData: { name: string; departmentId: number; roleId: number }) => {
      return apiClient.post('/profile', newProfileData);
    },
    onSuccess: () => {
      toast.success('Profile created successfully! It is now pending admin approval.');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      // After creation, redirect to dashboard. The dashboard hook will manage the modal/banner.
      router.replace('/dashboard');
    },
    onError: (error: any) => {
      logger.error('Error creating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to create profile. Please contact support.');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedProfileData: { name?: string; departmentId?: number; roleId?: number }) => {
      return apiClient.patch('/profile', updatedProfileData);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setIsEditing(false);
      // After update, if it's still pending approval, stay on profile. Otherwise, go to dashboard.
      if (currentUserProfile && !currentUserProfile.approved) {
          router.replace('/profile?pendingApproval=true'); // Stay on profile if still pending approval
      } else {
          router.replace('/dashboard'); // Go to dashboard if now approved or just general update
      }
    },
    onError: (error: any) => {
      logger.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile.');
    },
  });


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!name || !selectedDepartmentId || !selectedRoleId) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const data = {
      name,
      departmentId: Number(selectedDepartmentId),
      roleId: Number(selectedRoleId),
    };

    if (currentUserProfile) {
      updateProfileMutation.mutate(data);
    } else {
      createProfileMutation.mutate(data);
    }
  };


  // Updated loading and error states for consistency
  if (isLoading || isLoadingDepartments || isLoadingRoles) {
    return <div className="flex justify-center items-center min-h-screen">Loading profile data...</div>;
  }

  // If userProfile fetch errors out AND no profile data is present for creation flow.
  // This is a more critical error than just "no profile found" (which comes as currentUserProfile === null).
  if (isError) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Error loading user profile. Please try logging in again.</div>;
  }

  // If no profile AND not in a creation flow (e.g., manually navigated to /profile but no profile exists)
  // This should ideally be caught by useProfileStatusCheck on dashboard and redirected.
  // But as a fallback, ensure we either allow creation or redirect to login.
  if (!currentUserProfile && !isCreatingProfileFlow) {
    logger.warn('ProfilePage: No current user profile and not in creation flow. Redirecting to login or allowing creation.');
    // Offer to create, or redirect if no intent. Forcing creation is usually better here.
    setIsEditing(true); // Force edit mode to allow creation
  }


  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200 p-4">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-3xl mb-4">
            {currentUserProfile && !isCreatingProfileFlow ? 'Your Profile' : 'Complete Your Profile'}
          </h1>

          {isPendingApprovalFlow && currentUserProfile && !currentUserProfile.approved && (
            <div role="alert" className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>Your profile is pending admin approval. You may have limited access.</span>
            </div>
          )}
          {isCreatingProfileFlow && !currentUserProfile && (
            <div role="alert" className="alert alert-info mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Please complete your profile to continue.</span>
            </div>
          )}


          {(isEditing || isCreatingProfileFlow) ? (
            <form onSubmit={handleSubmit}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="input input-bordered w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Department</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedDepartmentId}
                  onChange={(e) => {
                    setSelectedDepartmentId(Number(e.target.value));
                    setSelectedRoleId(''); // Reset role when department changes
                  }}
                  required
                >
                  <option value="" disabled>Select Department</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">Role</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                  required
                  disabled={!selectedDepartmentId || filteredRoles.length === 0}
                >
                  <option value="" disabled>Select Role</option>
                  {filteredRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                {!selectedDepartmentId && <p className="text-sm text-gray-500 mt-1">Select a department first to see roles.</p>}
                {selectedDepartmentId && filteredRoles.length === 0 && !isLoadingRoles && <p className="text-sm text-red-500 mt-1">No roles found for the selected department.</p>}
              </div>

              <div className="flex justify-end space-x-2">
                <button type="submit" className="btn btn-primary"
                  disabled={createProfileMutation.isPending || updateProfileMutation.isPending}>
                  {createProfileMutation.isPending || updateProfileMutation.isPending
                    ? 'Saving...'
                    : (currentUserProfile ? 'Save Changes' : 'Create Profile')}
                </button>
                {currentUserProfile && (
                    <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>
                        Cancel
                    </button>
                )}
              </div>
            </form>
          ) : (
            <div>
              <p><strong>Email:</strong> {currentUserProfile?.userId}</p>
              <p><strong>Name:</strong> {currentUserProfile?.name || 'N/A'}</p>
              <p><strong>Department:</strong> {currentUserProfile?.department?.name || 'N/A'}</p>
              <p><strong>Role:</strong> {currentUserProfile?.role?.name || 'N/A'}</p>
              <p><strong>Approved:</strong> {currentUserProfile?.approved ? 'Yes' : 'No (Pending Admin Approval)'}</p>
              <button onClick={() => setIsEditing(true)} className="btn btn-secondary mt-4">
                Edit Profile
              </button>
              {currentUserProfile?.approved && (
                  <Link href="/dashboard" className="btn btn-link mt-4 ml-2">Go to Dashboard</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// src/app/profile/page.tsx - FIXED roles.filter error
