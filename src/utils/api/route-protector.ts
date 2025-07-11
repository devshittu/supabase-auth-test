// src/utils/api/route-protector.ts - REVISED (Granular Profile/Approval Checks, Strict Mode)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createServerSupabaseClient } from '@/lib/supabase-server';
import { RoleLevel, hasRequiredLevel } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Profile, Role, Department } from '@prisma/client';
import { Session } from '@supabase/supabase-js';
import { PROFILE_APPROVAL_STRICT_MODE } from '@/config/constants'; // Import the new constant

type SupabaseUser = Session['user'];

export interface BaseRouteParams {
  [key: string]: string | string[] | undefined;
}

export interface RouteContext<P extends object = BaseRouteParams> {
  params: P;
}

export interface AuthenticatedNextRequest extends NextRequest {
  user: SupabaseUser;
  profile: (Profile & { role: Role; department: Department | null }) | null;
  userRoleLevel: RoleLevel;
  userDepartmentId: number | null;
}

interface ProtectedRouteOptions {
  requiredRole?: RoleLevel;
  /**
   * If true, allows access to the route even if the user's profile is not approved.
   * Useful for routes like /api/profile (GET/PATCH for self).
   */
  allowUnapprovedProfile?: boolean;
  /**
   * If true, this route is specifically for creating a profile.
   * It implies that a profile for the user should NOT exist yet, and bypasses
   * the 'profile not found' check if a profile is expected.
   */
  isProfileCreationRoute?: boolean;
  /**
   * If true, this route does NOT require a complete profile.
   * E.g., /api/departments, /api/roles.
   */
  skipProfileCompletionCheck?: boolean;
  /**
   * If true, this route does NOT require an approved profile.
   * E.g., /api/departments, /api/roles.
   * Note: allowUnapprovedProfile specifically grants access to the owner's profile methods.
   * This flag skips the general approval check for non-profile-specific routes.
   */
  skipProfileApprovalCheck?: boolean;
}

type ProtectedRouteHandler<P extends object = BaseRouteParams> = (
  req: AuthenticatedNextRequest,
  context: RouteContext<P>
) => Promise<NextResponse | Response>;

export const restrictTo = <P extends object = BaseRouteParams>(options: ProtectedRouteOptions) => {
  return (handler: ProtectedRouteHandler<P>) => {
    return async (req: NextRequest, context: object): Promise<NextResponse | Response> => {
      logger.debug(`Route Protector: Checking access for ${req.url}`);

      const cookieStore = cookies();
      const supabase = createServerSupabaseClient(cookieStore);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        logger.warn(
          `API Route: Unauthorized access for ${req.url} - No valid session.`,
        );
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }

      let userRoleLevel: RoleLevel = RoleLevel.OPEN;
      let isProfileApproved = false;
      let isProfileComplete = false;
      let userProfile: (Profile & { role: Role; department: Department | null }) | null = null;

      try {
        userProfile = await prisma.profile.findUnique({
          where: { userId: session.user.id },
          include: { role: true, department: true },
        });

        if (userProfile) {
          userRoleLevel = userProfile.role?.level || RoleLevel.OPEN;
          isProfileApproved = userProfile.approved;
          isProfileComplete = !!userProfile.name && !!userProfile.departmentId && !!userProfile.roleId;

          // Profile completion check (applies if not a profile creation route AND not explicitly skipped)
          if (!isProfileComplete && !options.isProfileCreationRoute && !options.skipProfileCompletionCheck) {
            logger.warn(
              `API Route: User ${session.user.id} has incomplete profile. Access denied to ${req.url}.`,
            );
            return NextResponse.json(
              { message: 'User profile incomplete. Please complete your profile.' },
              { status: 403 },
            );
          }

          // Profile approval check (applies if not explicitly allowed for unapproved AND not skipped)
          if (!isProfileApproved && !options.allowUnapprovedProfile && !options.skipProfileApprovalCheck) {
             // In strict mode, block access if profile not approved
            if (PROFILE_APPROVAL_STRICT_MODE) {
                logger.warn(
                `API Route: User ${session.user.id} profile not approved (strict mode). Access denied to ${req.url}.`,
                );
                return NextResponse.json(
                { message: 'Profile pending admin approval. Access denied.' },
                { status: 403 },
                );
            }
            // In default mode, allow access but client-side should show a banner.
            // No block here, but we'll flag it in the request object for handler logic if needed.
            logger.debug(`API Route: User ${session.user.id} profile not approved (default mode). Allowing access to ${req.url} for client-side handling.`);
          }
        } else {
          // No profile found for the user
          if (!options.isProfileCreationRoute && !options.skipProfileCompletionCheck) {
            logger.warn(
              `API Route: User ${session.user.id} has no profile. Access denied to ${req.url}.`,
            );
            return NextResponse.json(
              { message: 'User profile not found. Please create one.' },
              { status: 403 },
            );
          }
        }
      } catch (error) {
        logger.error(
          'API Route Protector: Error fetching user profile from Prisma:',
          error,
        );
        return NextResponse.json(
          { message: 'Internal server error during authorization.' },
          { status: 500 },
        );
      }

      // Role-based access check (always applies if requiredRole is set)
      if (
        options.requiredRole &&
        !hasRequiredLevel(userRoleLevel, options.requiredRole)
      ) {
        logger.warn(
          `API Route: User ${session.user.id} (level: ${userRoleLevel}) unauthorized for ${req.url} (required: ${options.requiredRole}).`,
        );
        return NextResponse.json(
          { message: 'Forbidden: Insufficient role level' },
          { status: 403 },
        );
      }

      const enrichedRequest = req as AuthenticatedNextRequest;
      enrichedRequest.user = session.user;
      enrichedRequest.profile = userProfile;
      enrichedRequest.userRoleLevel = userRoleLevel;
      // Add more profile status flags to enrichedRequest if needed by downstream handlers
      // enrichedRequest.isProfileComplete = isProfileComplete;
      // enrichedRequest.isProfileApproved = isProfileApproved;


      const typedContext = context as RouteContext<P>;

      return await handler(enrichedRequest, typedContext);
    };
  };
};

// // src/utils/api/route-protector.ts - THE ABSOLUTELY FINAL, FINAL REVISION (Type Error Resolution)
// import { NextRequest, NextResponse } from 'next/server';
// import { cookies } from 'next/headers';
// import { createClient as createServerSupabaseClient } from '@/lib/supabase-server';
// import { RoleLevel, hasRequiredLevel } from '@/lib/rbac';
// import { prisma } from '@/lib/prisma';
// import { logger } from '@/lib/logger';
// import { Profile, Role, Department } from '@prisma/client';
// import { Session } from '@supabase/supabase-js';

// type SupabaseUser = Session['user'];

// // Define a general interface for the route context params.
// // It uses an index signature to allow for any string key, with unknown values initially.
// // This is more flexible for specific parameter types like { id: string }.
// export interface BaseRouteParams {
//   [key: string]: string | string[] | undefined;
// }

// // Define the full context object that Next.js provides.
// // P extends object allows P to be any object type, including specific ones like { id: string }.
// // The default `params` is `BaseRouteParams` for non-dynamic routes.
// export interface RouteContext<P extends object = BaseRouteParams> {
//   params: P;
// }

// // Extend NextRequest to include user and profile data for handlers
// export interface AuthenticatedNextRequest extends NextRequest {
//   user: SupabaseUser;
//   profile: (Profile & { role: Role; department: Department | null }) | null;
//   userRoleLevel: RoleLevel;
//   userDepartmentId: number | null;
// }

// interface ProtectedRouteOptions {
//   requiredRole?: RoleLevel;
//   allowUnapprovedProfile?: boolean;
//   isProfileCreationRoute?: boolean;
// }

// // Define the type for the actual handler function that restrictTo will wrap.
// // It is generic over P (the params type) and ensures context is always provided.
// type ProtectedRouteHandler<P extends object = BaseRouteParams> = (
//   req: AuthenticatedNextRequest,
//   context: RouteContext<P>
// ) => Promise<NextResponse | Response>;

// // The restrictTo function itself. It takes options, and *then* takes the specific handler.
// // The P generic now correctly ensures type safety.
// export const restrictTo = <P extends object = BaseRouteParams>(options: ProtectedRouteOptions) => {
//   // This function returns a function that takes the actual route handler.
//   // The 'handler' argument is typed using ProtectedRouteHandler<P>, ensuring P is carried over.
//   return (handler: ProtectedRouteHandler<P>) => {
//     // This is the async function that will be exported by your API route files (e.g., export const GET = ...).
//     // The incoming `context` from Next.js is guaranteed to conform to `RouteContext<any>`,
//     // and we'll type-assert it to `RouteContext<P>` before passing it to the `handler`.
//     return async (req: NextRequest, context: object): Promise<NextResponse | Response> => { // context type is now 'object'
//       logger.debug(`Route Protector: Checking access for ${req.url}`);

//       const cookieStore = cookies();
//       const supabase = createServerSupabaseClient(cookieStore);

//       const {
//         data: { session },
//         error: sessionError,
//       } = await supabase.auth.getSession();

//       if (sessionError || !session) {
//         logger.warn(
//           `API Route: Unauthorized access for ${req.url} - No valid session.`,
//         );
//         return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
//       }

//       let userRoleLevel: RoleLevel = RoleLevel.OPEN;
//       let isProfileApproved = false;
//       let userProfile: (Profile & { role: Role; department: Department | null }) | null = null;

//       try {
//         userProfile = await prisma.profile.findUnique({
//           where: { userId: session.user.id },
//           include: { role: true, department: true },
//         });

//         if (userProfile) {
//           userRoleLevel = userProfile.role?.level || RoleLevel.OPEN;
//           isProfileApproved = userProfile.approved;

//           if (!isProfileApproved && !options.allowUnapprovedProfile && !options.isProfileCreationRoute) {
//             logger.warn(
//               `API Route: User ${session.user.id} profile not approved. Access denied to ${req.url}.`,
//             );
//             return NextResponse.json(
//               { message: 'Profile pending approval' },
//               { status: 403 },
//             );
//           }
//         } else {
//           if (!options.isProfileCreationRoute) {
//             logger.warn(
//               `API Route: User ${session.user.id} has no profile. Access denied to ${req.url}.`,
//             );
//             return NextResponse.json(
//               { message: 'User profile not found. Please create one.' },
//               { status: 403 },
//             );
//           }
//         }
//       } catch (error) {
//         logger.error(
//           'API Route Protector: Error fetching user profile from Prisma:',
//           error,
//         );
//         return NextResponse.json(
//           { message: 'Internal server error during authorization.' },
//           { status: 500 },
//         );
//       }

//       if (
//         options.requiredRole &&
//         !hasRequiredLevel(userRoleLevel, options.requiredRole)
//       ) {
//         logger.warn(
//           `API Route: User ${session.user.id} (level: ${userRoleLevel}) unauthorized for ${req.url} (required: ${options.requiredRole}).`,
//         );
//         return NextResponse.json(
//           { message: 'Forbidden: Insufficient role level' },
//           { status: 403 },
//         );
//       }

//       const enrichedRequest = req as AuthenticatedNextRequest;
//       enrichedRequest.user = session.user;
//       enrichedRequest.profile = userProfile;
//       enrichedRequest.userRoleLevel = userRoleLevel;

//       // Type assert the incoming context to the specific generic type P
//       // This is safe because the route handler itself defines P based on its route structure.
//       const typedContext = context as RouteContext<P>;

//       return await handler(enrichedRequest, typedContext);
//     };
//   };
// };



// // src/utils/api/route-protector.ts - REVISED (Final attempt for context compatibility)
