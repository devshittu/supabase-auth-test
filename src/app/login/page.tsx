// src/app/login/page.tsx - CLEANED (Remove Debugger and Timeout)
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('mshittu.cygnet@gmail.com');
  const [password, setPassword] = useState('12345678=Aa');
  const [loading, setLoading] = useState(false);
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
          redirectTo: `${window.location.origin}/api/auth?next=${encodeURIComponent(next || '/dashboard')}`,
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="email"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                placeholder="password"
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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
              Don't have an account?{' '}
              <Link href="/signup" className="link link-primary">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/app/login/page.tsx - CRITICAL DEBUGGING ADDITION
