// src/app/admin/page.tsx
'use client';

import { useHasAccess, useUserRole } from '@/lib/rbac-hook';
import { RoleLevel } from '@/lib/rbac';
import { apiClient } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';
import { Profile, Department, Role } from '@prisma/client';
import { useState } from 'react';

interface ProfileWithDetails extends Profile {
  department: Department;
  role: Role;
}

export default function AdminPage() {
  const hasAdminAccess = useHasAccess(RoleLevel.SUPER_ADMIN);
  const queryClient = useQueryClient();

  // Refetch `userProfile` as well in case the admin changes their own profile
  const { data: currentUserProfile, isLoading: loadingCurrentUserProfile } =
    useUserRole();

  const {
    data: profiles,
    isLoading: loadingProfiles,
    error: profilesError,
  } = useQuery<ProfileWithDetails[]>({
    queryKey: ['adminProfiles'],
    queryFn: async () => apiClient.get('/profile'), // API route will return all profiles for admin
    enabled: hasAdminAccess, // Only fetch if user has access
  });

  const { data: departments, isLoading: loadingDepartments } = useQuery<
    Department[]
  >({
    queryKey: ['departments'],
    queryFn: async () => apiClient.get('/api/departments'),
    enabled: hasAdminAccess,
  });

  const { data: roles, isLoading: loadingRoles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => apiClient.get('/api/roles'),
    enabled: hasAdminAccess,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: {
      userId: string;
      approved?: boolean;
      departmentId?: number;
      roleId?: number;
    }) => apiClient.patch('/profile', data),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] }); // Invalidate current user profile if it changed
    },
    onError: (error: any) => {
      logger.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile.');
    },
  });

  const handleApproveToggle = (profile: ProfileWithDetails) => {
    updateProfileMutation.mutate({
      userId: profile.userId,
      approved: !profile.approved,
    });
  };

  const handleRoleDepartmentChange = (
    profile: ProfileWithDetails,
    field: 'departmentId' | 'roleId',
    value: string,
  ) => {
    updateProfileMutation.mutate({
      userId: profile.userId,
      [field]: Number(value),
    });
  };

  if (
    loadingCurrentUserProfile ||
    loadingProfiles ||
    loadingDepartments ||
    loadingRoles
  ) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading admin data...
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="flex justify-center items-center h-screen text-xl font-bold">
        Access Denied. You do not have sufficient privileges to view this page.
      </div>
    );
  }

  if (profilesError) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        Error loading profiles: {(profilesError as any).message}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <h2 className="text-2xl font-semibold mb-4">Manage User Profiles</h2>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email (Supabase ID)</th>
              <th>Department</th>
              <th>Role</th>
              <th>Approved</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map((profile) => (
              <tr key={profile.id}>
                <td>{profile.name || 'N/A'}</td>
                <td>{profile.userId}</td> {/* Supabase user ID */}
                <td>
                  <select
                    className="select select-bordered select-sm"
                    value={profile.departmentId}
                    onChange={(e) =>
                      handleRoleDepartmentChange(
                        profile,
                        'departmentId',
                        e.target.value,
                      )
                    }
                  >
                    {departments?.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="select select-bordered select-sm"
                    value={profile.roleId}
                    onChange={(e) =>
                      handleRoleDepartmentChange(
                        profile,
                        'roleId',
                        e.target.value,
                      )
                    }
                  >
                    {roles
                      ?.filter(
                        (role) => role.departmentId === profile.departmentId,
                      )
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={profile.approved}
                    onChange={() => handleApproveToggle(profile)}
                  />
                </td>
                <td>{/* Additional actions like delete profile */}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">
        Manage Departments and Roles (Not implemented fully here)
      </h2>
      <p>
        You can add sections here to create/edit departments and roles using the
        `/api/departments` and `/api/roles` API routes.
      </p>
    </div>
  );
}
