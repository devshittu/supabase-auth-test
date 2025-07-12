// src/app/login/page.tsx - REVISED (Add Forgot Password Link and Request Logic)
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import { IS_DEBUG_MODE } from '@/config/constants';

export default function LoginPage() {
  // Initial states for email and password can be empty for production
  // For development, you might keep them pre-filled for convenience,
  // but remove for final deployment.
  const [email, setEmail] = useState(IS_DEBUG_MODE ? 'mshittu.cygnet@gmail.com' : '');
  const [password, setPassword] = useState(IS_DEBUG_MODE ? '12345678=Aa' : '');
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false); // New state for reset flow
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const { data: { subscription: authListenerSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug(`Supabase Auth State Change Event: ${event}`);
        if (event === 'SIGNED_IN' && session) {
          toast.success('Logged in successfully!');

          logger.debug(`Client-side: document.cookie after SIGNED_IN: ${document.cookie}`);
          logger.debug(`Client-side: Session user ID: ${session.user.id}`);
          logger.debug(`Client-side: Session access token (truncated): ${session.access_token.substring(0, 10)}...`);

          const redirectTo = next || '/dashboard';
          logger.debug(`Auth Listener: Redirecting to ${redirectTo}`);

          router.replace(redirectTo); // Navigate to the new page
          router.refresh(); // Force a re-fetch of server components and middleware evaluation
        } else if (event === 'SIGNED_OUT') {
            toast.info('Logged out successfully.');
            router.replace('/login');
        }
      },
    );

    return () => {
      if (authListenerSubscription) {
        authListenerSubscription.unsubscribe();
    }
    };
  }, [supabase, next, router]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('Login error:', error.message);
        toast.error(error.message);
      }
    } catch (err) {
      logger.error('Unexpected login error:', err);
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Ensure this redirectTo points to your auth callback route, which then redirects properly
          // This path needs to be correctly handled by src/app/api/auth/[...supabase]/route.ts
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next || '/dashboard')}`,
        },
      });

      if (error) {
        logger.error(`OAuth login error (${provider}):`, error.message);
        toast.error(`Error with ${provider} login: ${error.message}`);
      }
    } catch (err) {
      logger.error('Unexpected OAuth login error:', err);
      toast.error('An unexpected error occurred during OAuth login.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: FormEvent) => {
    e.preventDefault();
    setResettingPassword(true);
    setLoading(true); // Also use general loading state for consistency
    try {
      if (!email) {
        toast.error('Please enter your email to reset password.');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // This is the URL Supabase will redirect to AFTER the user clicks the magic link.
        // It must be a URL on your Next.js application where the user can set a new password.
        // We'll create this page at /reset-password
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        logger.error('Password reset request error:', error.message);
        toast.error(error.message);
      } else {
        toast.success('Password reset link sent! Check your email.');
        // Optionally, redirect to a confirmation page or clear the form
        setEmail('');
      }
    } catch (err) {
      logger.error('Unexpected password reset request error:', err);
      toast.error('An unexpected error occurred during password reset request.');
    } finally {
      setResettingPassword(false);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">Login</h2>

          {/* Conditional rendering for password reset request form */}
          {resettingPassword ? (
            <form onSubmit={handlePasswordResetRequest}>
              <div className="form-control">
                <label className="label" htmlFor="email">
                  <span className="label-text">Enter your email to receive a password reset link</span>
                </label>
                <input
                  type="email"
                  placeholder="your@example.com"
                  className="input input-bordered"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="link link-primary"
                  onClick={() => setResettingPassword(false)}
                  disabled={loading}
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            // Original Login Form
            <form onSubmit={handleLogin}>
              <div className="form-control">
                <label className="label" htmlFor='email'>
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  placeholder="email"
                  className="input input-bordered"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-control mt-4">
                <label className="label" htmlFor="password">
                  <span className="label-text">Password</span>
                </label>
                <input
                id='password'
                  type="password"
                  placeholder="password"
                  className="input input-bordered"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <label className="label" htmlFor="button">
                  <button
                    type="button"
                    onClick={() => setResettingPassword(true)}
                    className="label-text-alt link link-hover"
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </label>
              </div>
              <div className="form-control mt-6">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          )}

          {/* OAuth and Sign Up link only visible when not resetting password */}
          {!resettingPassword && (
            <>
              <div className="divider">OR</div>
              <button
                className="btn btn-outline btn-info mt-2"
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
              >
                Login with Google
              </button>
              <div className="mt-4 text-center">
                <p>
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="link link-primary">
                    Sign Up
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// src/app/login/page.tsx
