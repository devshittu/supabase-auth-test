// src/app/api/departments/[id]/route.ts - MODIFIED (Using explicit P type)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  restrictTo,
  AuthenticatedNextRequest,
  RouteContext // Import RouteContext
} from '@/utils/api/route-protector';
import { RoleLevel } from '@/lib/rbac';

// Define a specific Params type for this route
interface DepartmentParams {
  id: string;
}

// GET /api/departments/[id] - Get single department (OPEN to all, even unauthenticated)
export const GET = async (
  req: NextRequest,
  { params }: { params: { id: string } },
) => {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid department ID' },
        { status: 400 },
      );
    }

    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return NextResponse.json(
        { message: 'Department not found' },
        { status: 404 },
      );
    }
    return NextResponse.json(department);
  } catch (error) {
    logger.error(`API /departments/${params.id} GET error:`, error);
    return NextResponse.json(
      { message: 'Error fetching department' },
      { status: 500 },
    );
  }
};

// PATCH /api/departments/[id] - Update department (SUPER_ADMIN only)
// Explicitly pass the DepartmentParams type to restrictTo
export const PATCH = restrictTo<DepartmentParams>({ requiredRole: RoleLevel.SUPER_ADMIN })(
  async (
    req: AuthenticatedNextRequest,
    context: RouteContext<DepartmentParams>, // Context now uses the explicit type
  ) => {
    try {
      const id = parseInt(context.params.id, 10);
      if (isNaN(id)) {
        return NextResponse.json(
          { message: 'Invalid department ID' },
          { status: 400 },
        );
      }

      const { name } = await req.json();

      if (!name) {
        return NextResponse.json(
          { message: 'Missing required field: name' },
          { status: 400 },
        );
      }

      const updatedDepartment = await prisma.department.update({
        where: { id },
        data: { name },
      });
      return NextResponse.json(updatedDepartment);
    } catch (error: any) {
      logger.error(`API /departments/${context.params.id} PATCH error:`, error);
      if (error.code === 'P2025') {
        return NextResponse.json(
          { message: 'Department not found' },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { message: 'Error updating department' },
        { status: 500 },
      );
    }
  },
);

// DELETE /api/departments/[id] - Delete department (SUPER_ADMIN only)
// Explicitly pass the DepartmentParams type to restrictTo
export const DELETE = restrictTo<DepartmentParams>({ requiredRole: RoleLevel.SUPER_ADMIN })(
  async (
    req: AuthenticatedNextRequest,
    context: RouteContext<DepartmentParams>, // Context now uses the explicit type
  ) => {
    try {
      const id = parseInt(context.params.id, 10);
      if (isNaN(id)) {
        return NextResponse.json(
          { message: 'Invalid department ID' },
          { status: 400 },
        );
      }

      await prisma.department.delete({
        where: { id },
      });
      return NextResponse.json(
        { message: 'Department deleted successfully' },
        { status: 200 },
      );
    } catch (error: any) {
      logger.error(`API /departments/${context.params.id} DELETE error:`, error);
      if (error.code === 'P2025') {
        return NextResponse.json(
          { message: 'Department not found' },
          { status: 404 },
        );
      }
      if (error.code === 'P2003') {
        return NextResponse.json(
          { message: 'Cannot delete department with associated roles or users.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { message: 'Error deleting department' },
        { status: 500 },
      );
    }
  },
);


// src/app/api/departments/[id]/route.ts - MODIFIED
