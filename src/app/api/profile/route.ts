// src/app/api/profile/route.ts - REVISED (Correct restrictTo options)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  restrictTo,
  AuthenticatedNextRequest,
} from '@/utils/api/route-protector';
import { hasRequiredLevel, RoleLevel } from '@/lib/rbac';
import { createAdminClient } from '@/lib/supabase-server'; // For admin actions

// GET /api/profile - Fetch user profile
// Allow any authenticated user to get their own profile, regardless of completeness or approval.
export const GET = restrictTo({
  requiredRole: RoleLevel.OPEN, // Any logged-in user
  skipProfileCompletionCheck: true, // Allow fetching even if incomplete
  allowUnapprovedProfile: true, // Allow fetching even if unapproved
})(async (
  req: AuthenticatedNextRequest,
) => {
  try {
    // req.profile will contain the user's profile if it exists, otherwise null
    // The protector ensures the user is authenticated.
    // If profile is null, it means no profile exists for this user in Prisma yet.
    if (!req.profile) {
      // Return 200 with null profile if it doesn't exist, to signify "no profile yet"
      // This allows the client to know it needs to initiate profile creation.
      logger.debug(`API /profile GET: No profile found for user ${req.user.id}. Returning null.`);
      return NextResponse.json(null, { status: 200 }); // Returning 200 with null indicates "no profile yet"
    }
    logger.debug(`API /profile GET: Profile found for user ${req.user.id}. Approved: ${req.profile.approved}`);
    return NextResponse.json(req.profile);
  } catch (error) {
    logger.error('API /profile GET error:', error);
    return NextResponse.json(
      { message: 'Error fetching profile' },
      { status: 500 },
    );
  }
});


// POST /api/profile - Create user profile (for new signups)
// This route is special: it's for logged-in users who *don't* have a profile yet.
// isProfileCreationRoute handles this in the protector.
export const POST = restrictTo({
  requiredRole: RoleLevel.OPEN,
  isProfileCreationRoute: true, // Crucial flag: allows access if no profile exists
})(
  async (req: AuthenticatedNextRequest) => {
    try {
      const { name, departmentId, roleId } = await req.json();
      const userId = req.user.id;

      // The protector's `isProfileCreationRoute` handles allowing access if no profile.
      // If req.profile is not null here, it means a profile already exists,
      // which is an integrity check for a *creation* endpoint.
      if (req.profile) {
        logger.warn(`API /profile POST: Attempted to create profile for user ${userId} but profile already exists.`);
        return NextResponse.json({ message: 'Profile already exists for this user' }, { status: 409 });
      }

      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      const role = await prisma.role.findUnique({ where: { id: roleId } });

      if (!department || !role) {
        return NextResponse.json({ message: 'Invalid department or role selected.' }, { status: 400 });
      }

      const newProfile = await prisma.profile.create({
        data: {
          userId,
          name,
          departmentId,
          roleId,
          approved: false, // Default to false, requires admin approval
        },
      });
      logger.info(`API /profile POST: Profile created for user ${userId}.`);
      return NextResponse.json(newProfile, { status: 201 });
    } catch (error) {
      logger.error('API /profile POST error:', error);
      return NextResponse.json({ message: 'Error creating profile' }, { status: 500 });
    }
  },
);

// PATCH /api/profile - Update user profile
// Allow any authenticated user to update their own profile, regardless of approval status.
// This is critical for users to complete/correct their profile.
export const PATCH = restrictTo({
  requiredRole: RoleLevel.OPEN, // Any logged-in user
  allowUnapprovedProfile: true, // Allow updating even if unapproved
  skipProfileCompletionCheck: true, // Allow updating even if currently incomplete
})(
  async (req: AuthenticatedNextRequest) => {
    try {
      const { name, departmentId, roleId } = await req.json();
      const userId = req.user.id;

      if (!req.profile || req.profile.userId !== userId) {
        logger.warn(`API /profile PATCH: Profile not found or unauthorized for user ${userId}.`);
        return NextResponse.json({ message: 'Profile not found or unauthorized' }, { status: 404 });
      }

      const updateData: any = {};
      let approvalStatusChange = false;

      if (name !== undefined) updateData.name = name;
      if (departmentId !== undefined) {
        const department = await prisma.department.findUnique({ where: { id: departmentId } });
        if (!department) return NextResponse.json({ message: 'Invalid department ID' }, { status: 400 });
        updateData.departmentId = departmentId;
      }
      if (roleId !== undefined) {
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) return NextResponse.json({ message: 'Invalid role ID' }, { status: 400 });
        updateData.roleId = roleId;
      }

      // If the profile was incomplete and is now becoming complete by this update,
      // or if any core field (name, department, role) changes,
      // it might necessitate re-approval.
      // For simplicity, let's say *any* update requires re-approval.
      // Or, we can only set `approved: false` if it was previously true and key fields changed.
      // For now, let's keep it simple: if profile becomes "complete" it remains unapproved.
      // If it was already approved and is updated, it might revert to unapproved.
      // Given the `PATCH` for *completing* profile, setting to `false` is appropriate.
      // If the profile was *already approved* and now edited, the admin needs to re-approve.
      const wasApproved = req.profile.approved;
      if (wasApproved) { // If it was approved, any edit makes it unapproved
        updateData.approved = false;
        approvalStatusChange = true;
      }


      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
      }

      const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: updateData,
        include: { role: true, department: true },
      });
      logger.info(`API /profile PATCH: Profile updated for user ${userId}. Approved status: ${updatedProfile.approved}.`);
      return NextResponse.json(updatedProfile);
    } catch (error: any) {
      logger.error('API /profile PATCH error:', error);
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Error updating profile' }, { status: 500 });
    }
  },
);

// // Add other API routes that should bypass general profile checks
// // Example: /api/departments and /api/roles should not require a complete/approved profile
// // as they are needed for profile creation.
// export const GET_DEPARTMENTS = restrictTo({
//   requiredRole: RoleLevel.OPEN,
//   skipProfileCompletionCheck: true,
//   skipProfileApprovalCheck: true,
// })(async (req: AuthenticatedNextRequest) => {
//     try {
//         const departments = await prisma.department.findMany();
//         return NextResponse.json(departments);
//     } catch (error) {
//         logger.error('API /departments GET error:', error);
//         return NextResponse.json({ message: 'Error fetching departments' }, { status: 500 });
//     }
// });

// export const GET_ROLES = restrictTo({
//   requiredRole: RoleLevel.OPEN,
//   skipProfileCompletionCheck: true,
//   skipProfileApprovalCheck: true,
// })(async (req: AuthenticatedNextRequest) => {
//     try {
//         const roles = await prisma.role.findMany();
//         return NextResponse.json(roles);
//     } catch (error) {
//         logger.error('API /roles GET error:', error);
//         return NextResponse.json({ message: 'Error fetching roles' }, { status: 500 });
//     }
// });


// src/app/api/profile/route.ts