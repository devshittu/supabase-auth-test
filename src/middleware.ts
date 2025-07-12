// src/middleware.ts - FINAL REVISION (NO PRISMA USAGE)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient as createMiddlewareSupabaseClient } from '@/lib/supabase-middleware';
import { logger } from '@/lib/logger';
import { hasRequiredLevel, RoleLevel } from '@/lib/rbac'; // Keep these for RBAC checks

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  logger.debug(`Middleware: Processing request for pathname: ${pathname}`);

  const publicRoutes = [
    '/login',
    '/signup',
    '/auth/callback',
    '/forbidden',
    '/api/auth/', // Supabase auth callback endpoint (includes proxy)
    '/api/departments', // Allow access to get departments for signup form
    '/api/roles', // Allow access to get roles for signup form
    '/_next/', // Next.js internal paths
    '/assets/', // Static assets
  ];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    logger.debug(`Middleware: Public route matched: ${pathname}. Bypassing authentication.`);
    return NextResponse.next();
  }

  // Debugging: Log incoming cookies
  const allCookies = request.cookies.getAll();
  logger.debug(`Middleware: Incoming cookies: ${JSON.stringify(allCookies.map(c => ({ name: c.name, value: c.value.substring(0,10) + '...' })))}`);
  logger.debug(`Middleware: Has 'sb-access-token': ${request.cookies.has('sb-qvtofpvgskjazwdutwml-auth-token')}`); // Check for the specific token name

  const { supabase, response: supabaseResponse } = createMiddlewareSupabaseClient(request);

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    logger.error(`Middleware: Error getting session: ${sessionError.message}`);
  }
  
  if (!session) {
    logger.debug('Middleware: No valid session found after getSession(). Redirecting to login.');
    // Clear cookies explicitly if no session, just in case
    supabaseResponse.cookies.delete('sb-access-token');
    supabaseResponse.cookies.delete('sb-refresh-token');
    supabaseResponse.cookies.delete('sb-qvtofpvgskjazwdutwml-auth-token'); // Clear the specific token name as well
    logger.debug('Middleware: Cleared Supabase cookies via response.'); 
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  logger.debug(`Middleware: Valid session found for user: ${session.user.id}.`);

  // --- REMOVED PRISMA USAGE FROM MIDDLEWARE ---
  // Profile completeness and approval checks will now happen client-side on protected pages.
  // Middleware's primary role is now just authentication and basic RBAC for top-level paths.

  // RBAC for specific protected routes (based ONLY on session existence, not profile details)
  const protectedRoutes: Record<string, { level: RoleLevel }> = {
    '/admin': { level: RoleLevel.SUPER_ADMIN }, // This will now only check session existence
    '/dashboard': { level: RoleLevel.ASSISTANT }, // This will now only check session existence
    '/profile': { level: RoleLevel.OPEN }, // Allow any logged-in user to access profile page
    // Add other protected routes here
  };

  for (const routePrefix in protectedRoutes) {
    if (pathname.startsWith(routePrefix)) {
      // Middleware only checks if a session exists for now.
      // Detailed role level check (if needed in middleware without Prisma) would require
      // storing role level in JWT or user metadata. For now, it's a basic auth gate.
      logger.debug(`Middleware: Authenticated user attempting to access protected route ${pathname}.`);
      return supabaseResponse; // Allow access if session exists
    }
  }

  logger.debug(`Middleware: Default pass-through for pathname: ${pathname}.`);
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets).*)',
    '/',
  ],
};
