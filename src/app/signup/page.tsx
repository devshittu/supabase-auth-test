// src/app/signup/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import useQuery and useMutation
import { apiClient } from '@/lib/api-client'; // Assuming you have an apiClient setup
import { Department, Role } from '@prisma/client'; // Import Prisma types

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const queryClient = useQueryClient(); // For invalidating queries if needed

  // Fetch departments
  const { data: departments, isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => apiClient.get('/departments'),
  });

  // Fetch roles
  const { data: roles, isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => apiClient.get('/roles'),
  });

  // Filter roles based on selected department
  const filteredRoles = roles?.filter(role =>
    selectedDepartmentId ? role.departmentId === selectedDepartmentId : true
  ) || [];

  // Mutation for creating profile after user signup
  const createProfileMutation = useMutation({
    mutationFn: async (profileData: { userId: string; name: string; departmentId: number; roleId: number }) => {
      // Note: The POST /api/profile endpoint doesn't need userId in the body,
      // as it extracts it from the authenticated request (req.user.id).
      // So, pass only the fields it expects.
      const { userId, ...rest } = profileData; // Destructure userId
      return apiClient.post('/profile', rest);
    },
    onSuccess: () => {
      logger.info('Profile created automatically after signup.');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] }); // Invalidate user profile cache
      toast.success('Account created successfully! Your profile is pending admin approval.');
      router.push('/dashboard'); // Directly push to dashboard, middleware will handle pending approval
    },
    onError: (error: any) => {
      logger.error('Error creating profile after signup:', error);
      toast.error(error.response?.data?.message || 'Failed to create profile after signup. Please visit profile page.');
      // Even if profile creation fails, the user account is created.
      // Redirect to dashboard, middleware will send them to profile page.
      router.push('/dashboard');
    },
  });

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name || !selectedDepartmentId || !selectedRoleId) {
      toast.error('Please fill in all profile details.');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Sign up user with Supabase
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        // No emailRedirectTo needed here if profile is created immediately,
        // unless you still want email verification for the auth.
        // For simplicity, assuming immediate sign-in or handling verification separately.
      });

      if (signupError) {
        logger.error('Signup error:', signupError.message);
        toast.error(signupError.message);
        setLoading(false);
        return;
      }

      if (signupData.user) {
        logger.info('Supabase user signed up:', signupData.user.id);
        // Step 2: Create profile for the new user immediately
        createProfileMutation.mutate({
          userId: signupData.user.id, // Pass userId for logging/internal use if needed
          name,
          departmentId: Number(selectedDepartmentId),
          roleId: Number(selectedRoleId),
        });
        // The router.push is now handled inside createProfileMutation.onSuccess/onError
      } else {
        // This case might happen if email verification is pending but no session is returned.
        // Adjust based on your Supabase email verification settings.
        toast.info('Signup complete. Please check your email to verify your account.');
        router.push('/login?message=check_email');
      }

    } catch (err) {
      logger.error('Unexpected signup process error:', err);
      toast.error('An unexpected error occurred during signup.');
      setLoading(false);
    }
  };

  const formDisabled = loading || isLoadingDepartments || isLoadingRoles;

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200 p-4">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">Sign Up</h2>
          <form onSubmit={handleSignup}>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                placeholder="password"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="divider">Profile Details</div>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Your Name</span>
              </label>
              <input
                type="text"
                placeholder="Full Name"
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
                disabled={formDisabled}
              >
                <option value="" disabled>Select Department</option>
                {isLoadingDepartments ? (
                  <option disabled>Loading departments...</option>
                ) : (
                  departments?.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))
                )}
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
                disabled={formDisabled || !selectedDepartmentId || filteredRoles.length === 0}
              >
                <option value="" disabled>Select Role</option>
                {isLoadingRoles ? (
                  <option disabled>Loading roles...</option>
                ) : (
                  filteredRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))
                )}
              </select>
              {!selectedDepartmentId && <p className="text-sm text-gray-500 mt-1">Select a department first to see roles.</p>}
              {selectedDepartmentId && filteredRoles.length === 0 && !isLoadingRoles && <p className="text-sm text-red-500 mt-1">No roles found for the selected department.</p>}
            </div>

            <div className="form-control mt-6">
              <button type="submit" className="btn btn-primary" disabled={formDisabled || createProfileMutation.isPending}>
                {loading || createProfileMutation.isPending ? 'Signing Up...' : 'Sign Up'}
              </button>
            </div>
          </form>
          <div className="mt-4 text-center">
            <p>
              Already have an account?{' '}
              <Link href="/login" className="link link-primary">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


// src/app/signup/page.tsx
