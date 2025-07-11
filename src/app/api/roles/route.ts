// and instead of individually calling the records every time on the server why not load all departments 

// src/app/api/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  restrictTo,
  AuthenticatedNextRequest,
} from '@/utils/api/route-protector';
import { RoleLevel } from '@/lib/rbac';



// GET /api/roles - List roles (OPEN to all, even unauthenticated)
// Removed restrictTo here
export const GET = async (req: NextRequest) => {
  try {
    const roles = await prisma.role.findMany({
      include: { department: true },
      orderBy: { name: 'asc' }, // Order alphabetically for better UX
    });
    return NextResponse.json(roles);
  } catch (error) {
    logger.error('API /roles GET error:', error);
    return NextResponse.json(
      { message: 'Error fetching roles' },
      { status: 500 },
    );
  }
};


// POST /api/roles - Create role (SUPER_ADMIN only)
export const POST = restrictTo({ requiredRole: RoleLevel.SUPER_ADMIN })(async (
  req: AuthenticatedNextRequest,
) => {
  // Type as AuthenticatedNextRequest
  try {
    const { name, level, departmentId } = await req.json();

    if (!name || level === undefined || !departmentId) {
      return NextResponse.json(
        { message: 'Missing required fields: name, level, departmentId' },
        { status: 400 },
      );
    }

    // Validate department existence
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) {
      return NextResponse.json(
        { message: 'Department not found' },
        { status: 404 },
      );
    }

    // Prevent creating roles with levels higher than SUPER_ADMIN
    if (level > RoleLevel.SUPER_ADMIN) {
      return NextResponse.json(
        { message: 'Role level cannot exceed SUPER_ADMIN' },
        { status: 400 },
      );
    }

    const newRole = await prisma.role.create({
      data: { name, level, departmentId },
    });
    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    logger.error('API /roles POST error:', error);
    return NextResponse.json(
      { message: 'Error creating role' },
      { status: 500 },
    );
  }
});
