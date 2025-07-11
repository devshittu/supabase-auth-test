// src/lib/auth.ts
import { createClient as createServerSupabaseClient } from '@/lib/supabase-server'; // Use the new server client
import { logger } from './logger';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers'; // Still needed here to get cookieStore
import { RoleLevel } from './rbac';
import { prisma } from './prisma'; // Assuming prisma client is still imported

// Utility to get current session on the server
export async function getSession() {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    logger.error('Error fetching session:', error.message);
    return null;
  }
  return session;
}

// Utility to get current user and their profile on the server
export async function getUserWithProfile() {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.debug('No user found or error fetching user:', userError?.message);
    return { user: null, profile: null, roleLevel: RoleLevel.OPEN };
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      include: { role: true, department: true },
    });

    if (!profile) {
      logger.warn(`No profile found for user ${user.id}`);
      return { user, profile: null, roleLevel: RoleLevel.OPEN };
    }

    return { user, profile, roleLevel: profile.role?.level || RoleLevel.OPEN };
  } catch (prismaError) {
    logger.error(
      'Error fetching user profile from Prisma in getUserWithProfile:',
      prismaError,
    );
    return { user, profile: null, roleLevel: RoleLevel.OPEN };
  }
}

// Utility for handling authentication redirects
export function redirectToLogin(nextUrl?: string) {
  const redirectPath = nextUrl
    ? `/login?next=${encodeURIComponent(nextUrl)}`
    : '/login';
  redirect(redirectPath);
}

// Utility for handling unauthorized access
export function redirectToForbidden() {
  redirect('/forbidden');
}
