// src/app/reset-password/page.tsx - NEW FILE (Password Reset Page)
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    // This effect ensures the session is properly picked up from the URL fragment
    // and sets the user context for password update.
    // Supabase Auth Helpers' createBrowserClient should automatically handle
    // parsing the URL fragment for session data on page load.
    const checkSession = async () => {
      // Give a small delay to ensure Supabase client has processed the URL hash
      await new Promise(resolve => setTimeout(resolve, 100)); 
      
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        logger.error('ResetPasswordPage: Error getting session after redirect:', error.message);
        toast.error('Could not retrieve session for password reset. Please try again.');
        router.replace('/login'); // Redirect to login if session is not valid
        return;
      }

      if (!session) {
        // If there's no session, it means the magic link was either invalid, expired,
        // or already used, or the client didn't pick it up.
        // Supabase usually sets the session in localStorage / cookies from the URL fragment.
        logger.warn('ResetPasswordPage: No session found after redirect. Magic link likely invalid or expired.');
        toast.error('The password reset link is invalid or has expired. Please request a new one.');
        router.replace('/login');
      } else {
        logger.info('ResetPasswordPage: Session found for password reset.');
        // At this point, the user is temporarily signed in with the reset token's session.
        // They can now update their password.
      }
    };

    checkSession();
  }, [supabase, router]);

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 8) { // Supabase default min password length
      toast.error('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      // The update password operation is done on the currently signed-in user (from the magic link session)
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        logger.error('Password update error:', error.message);
        toast.error(error.message);
      } else {
        toast.success('Your password has been reset successfully! You can now log in with your new password.');
        setResetSuccess(true);
        // Automatically sign out after password reset for security, then redirect to login.
        // This prevents the user from being logged in with the temporary reset session.
        await supabase.auth.signOut();
        router.replace('/login');
      }
    } catch (err) {
      logger.error('Unexpected password update error:', err);
      toast.error('An unexpected error occurred during password update.');
    } finally {
      setLoading(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200 text-center">
        <div className="card w-96 bg-base-100 shadow-xl p-6">
          <h2 className="card-title text-2xl mb-4">Password Reset Successful!</h2>
          <p className="mb-4">
            You can now log in with your new password. Redirecting to login page...
          </p>
          <span className="loading loading-spinner loading-lg mx-auto"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">Reset Your Password</h2>
          <form onSubmit={handlePasswordReset}>
            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text">New Password</span>
              </label>
              <input
                type="password"
                placeholder="********"
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="form-control mt-4">
              <label className="label" htmlFor="confirmPassword">
                <span className="label-text">Confirm New Password</span>
              </label>
              <input
                type="password"
                placeholder="********"
                className="input input-bordered"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}