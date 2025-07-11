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



// // src/middleware.ts - SMALL REFINEMENT
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import { createClient as createMiddlewareSupabaseClient } from '@/lib/supabase-middleware';
// import { logger } from '@/lib/logger';
// import { hasRequiredLevel, RoleLevel } from '@/lib/rbac';
// import { prisma } from '@/lib/prisma';

// export async function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;
//   logger.debug(`Middleware: Processing request for pathname: ${pathname}`);

//   const publicRoutes = [
//     '/login',
//     '/signup',
//     '/auth/callback',
//     '/forbidden',
//     '/api/auth/', // Supabase auth callback endpoint
//     '/api/departments', // Allow access to get departments for signup form
//     '/api/roles', // Allow access to get roles for signup form
//     '/_next/', // Next.js internal paths
//     '/assets/', // Static assets
//   ];
//   if (publicRoutes.some(route => pathname.startsWith(route))) {
//     logger.debug(`Middleware: Public route matched: ${pathname}. Bypassing authentication.`);
//     return NextResponse.next();
//   }

//   // Debugging: Log incoming cookies
//   const allCookies = request.cookies.getAll();
//   logger.debug(`Middleware: Incoming cookies: ${JSON.stringify(allCookies.map(c => ({ name: c.name, value: c.value.substring(0,10) + '...' })))}`);
//   logger.debug(`Middleware: Has 'sb-access-token': ${request.cookies.has('sb-access-token')}`);
//   logger.debug(`Middleware: Has 'sb-refresh-token': ${request.cookies.has('sb-refresh-token')}`);


//   const { supabase, response: supabaseResponse } = createMiddlewareSupabaseClient(request);

//   const { data: { session }, error: sessionError } = await supabase.auth.getSession();

//   if (sessionError) {
//     logger.error(`Middleware: Error getting session: ${sessionError.message}`);
//   }
  
//   if (!session) {
//     logger.debug('Middleware: No valid session found after getSession(). Redirecting to login.');
//     // Clear cookies explicitly if no session, just in case
//     supabaseResponse.cookies.delete('sb-access-token');
//     supabaseResponse.cookies.delete('sb-refresh-token');
//     // Added specific log for clarity on where cookies are cleared
//     logger.debug('Middleware: Cleared Supabase cookies via response.'); 
//     return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
//   }

//   logger.debug(`Middleware: Valid session found for user: ${session.user.id}.`);

//   let userRoleLevel = RoleLevel.OPEN;
//   let isProfileApproved = false;
//   let hasProfile = false;

//   try {
//     const profile = await prisma.profile.findUnique({
//       where: { userId: session.user.id },
//       include: { role: true, department: true },
//     });

//     if (profile) {
//       hasProfile = true;
//       userRoleLevel = profile.role?.level || RoleLevel.OPEN;
//       isProfileApproved = profile.approved;
//       logger.debug(`Middleware: Profile found for user ${session.user.id}. Approved: ${isProfileApproved}, Role: ${userRoleLevel}`);

//       // If profile exists but is not approved, and not already on profile page
//       if (!isProfileApproved && !pathname.startsWith('/profile')) {
//         logger.warn(`Middleware: User ${session.user.id} profile not approved, redirecting to profile page.`);
//         return NextResponse.redirect(new URL('/profile?pendingApproval=true', request.url));
//       }
//     } else {
//       // If no profile exists for a logged-in user, and not already on profile creation page
//       if (!pathname.startsWith('/profile')) {
//         logger.warn(`Middleware: User ${session.user.id} has no profile, redirecting to profile creation.`);
//         return NextResponse.redirect(new URL('/profile?createProfile=true', request.url));
//       }
//     }
//   } catch (error) {
//     logger.error('Middleware: Error fetching user profile from Prisma:', error);
//     // If Prisma error, assume no profile or unapproved to be safe and redirect
//     if (!pathname.startsWith('/profile')) {
//       logger.error('Middleware: Prisma error during profile fetch, forcing redirect to profile creation as a fallback.');
//       return NextResponse.redirect(new URL('/profile?createProfile=true', request.url));
//     }
//     userRoleLevel = RoleLevel.OPEN; // Fallback level if profile lookup fails
//   }

//   // RBAC for specific protected routes (after profile check and approval status)
//   const protectedRoutes: Record<string, { level: RoleLevel }> = {
//     '/admin': { level: RoleLevel.SUPER_ADMIN },
//     '/dashboard': { level: RoleLevel.ASSISTANT },
//     // Add other protected routes here
//   };

//   for (const routePrefix in protectedRoutes) {
//     if (pathname.startsWith(routePrefix)) {
//       const { level: requiredLevel } = protectedRoutes[routePrefix];
//       logger.debug(`Middleware: Route ${pathname} requires level ${requiredLevel}.`);

//       // If user has no profile OR is not approved AND tries to access a protected route
//       // which is NOT the profile page itself (where they'd create/complete it)
//       if ( (!hasProfile || !isProfileApproved) && !pathname.startsWith('/profile') ) {
//           logger.warn(`Middleware: User ${session.user.id} has incomplete/unapproved profile. Denying access to ${pathname}.`);
//           return NextResponse.redirect(new URL('/profile?pendingApproval=true', request.url)); // Direct to profile to resolve
//       }

//       // Now check actual role level if they have a profile and are approved
//       if (hasProfile && isProfileApproved && !hasRequiredLevel(userRoleLevel, requiredLevel)) {
//         logger.warn(`Middleware: User ${session.user.id} (level: ${userRoleLevel}) unauthorized for ${pathname} (required: ${requiredLevel}).`);
//         return NextResponse.redirect(new URL('/forbidden', request.url));
//       }
//     }
//   }
  
//   logger.debug(`Middleware: Allowing access to ${pathname}.`);
//   return supabaseResponse;
// }

// export const config = {
//   matcher: [
//     '/((?!_next/static|_next/image|favicon.ico|api/auth/|login|signup|forbidden|auth/callback|assets/|api/departments|api/roles).*)',
//   ],
// };
