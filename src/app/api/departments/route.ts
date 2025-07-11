// src/app/api/departments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  restrictTo,
  AuthenticatedNextRequest,
} from '@/utils/api/route-protector';
import { RoleLevel } from '@/lib/rbac';

// GET /api/departments - List departments (OPEN to all, even unauthenticated)
export const GET = async (req: NextRequest) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' }, // Order alphabetically for better UX
    });
    return NextResponse.json(departments);
  } catch (error) {
    logger.error('API /departments GET error:', error);
    return NextResponse.json(
      { message: 'Error fetching departments' },
      { status: 500 },
    );
  }
};

// POST /api/departments - Create department (SUPER_ADMIN only)
export const POST = restrictTo({ requiredRole: RoleLevel.SUPER_ADMIN })(async (
  req: AuthenticatedNextRequest,
) => {
  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { message: 'Missing required field: name' },
        { status: 400 },
      );
    }

    const newDepartment = await prisma.department.create({
      data: { name },
    });
    return NextResponse.json(newDepartment, { status: 201 });
  } catch (error) {
    logger.error('API /departments POST error:', error);
    return NextResponse.json(
      { message: 'Error creating department' },
      { status: 500 },
    );
  }
});