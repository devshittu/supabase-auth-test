// src/app/api/auth/route.ts
import { NextResponse } from 'next/server';
import { createClient as createMiddlewareSupabaseClient } from '@/lib/supabase-middleware'; // Use middleware client for auth callback
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard'; // Default redirect after auth

  if (code) {
    const { supabase, response } = createMiddlewareSupabaseClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logger.error('Error exchanging code for session:', error.message);
      return NextResponse.redirect(
        new URL('/login?error=auth_error', request.url),
      );
    }
    // Redirect to the `next` URL after successful exchange
    response.headers.set('Location', new URL(next, request.url).toString());
    return response;
  } else {
    logger.warn('No code found in auth callback URL.');
  }

  // Fallback redirect if no code
  return NextResponse.redirect(new URL(next, request.url));
}
