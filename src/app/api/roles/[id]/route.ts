// src/app/api/roles/[id]/route.ts - MODIFIED (Using explicit P type)
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
interface RoleParams {
  id: string;
}

// GET /api/roles/[id] - Get single role (OPEN to all, even unauthenticated)
export const GET = async (
  req: NextRequest,
  { params }: { params: { id: string } },
) => {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid role ID' },
        { status: 400 },
      );
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!role) {
      return NextResponse.json({ message: 'Role not found' }, { status: 404 });
    }
    return NextResponse.json(role);
  } catch (error) {
    logger.error(`API /roles/${params.id} GET error:`, error);
    return NextResponse.json(
      { message: 'Error fetching role' },
      { status: 500 },
    );
  }
};

// PATCH /api/roles/[id] - Update role (SUPER_ADMIN only)
// Explicitly pass the RoleParams type to restrictTo
export const PATCH = restrictTo<RoleParams>({ requiredRole: RoleLevel.SUPER_ADMIN })(
  async (
    req: AuthenticatedNextRequest,
    context: RouteContext<RoleParams>, // Context now uses the explicit type
  ) => {
    try {
      const id = parseInt(context.params.id, 10);
      if (isNaN(id)) {
        return NextResponse.json(
          { message: 'Invalid role ID' },
          { status: 400 },
        );
      }

      const { name, level, departmentId } = await req.json();

      if (!name && level === undefined && !departmentId) {
        return NextResponse.json(
          { message: 'No fields provided for update' },
          { status: 400 },
        );
      }

      const updateData: {
        name?: string;
        level?: number;
        departmentId?: number;
      } = {};
      if (name !== undefined) updateData.name = name;
      if (level !== undefined) {
        if (level > RoleLevel.SUPER_ADMIN) {
          return NextResponse.json(
            { message: 'Role level cannot exceed SUPER_ADMIN' },
            { status: 400 },
          );
        }
        updateData.level = level;
      }
      if (departmentId !== undefined) {
        const department = await prisma.department.findUnique({
          where: { id: departmentId },
        });
        if (!department) {
          return NextResponse.json(
            { message: 'Department not found' },
            { status: 404 },
          );
        }
        updateData.departmentId = departmentId;
      }

      const updatedRole = await prisma.role.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json(updatedRole);
    } catch (error: any) {
      logger.error(`API /roles/${context.params.id} PATCH error:`, error);
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Role not found' }, { status: 404 });
      }
      return NextResponse.json(
        { message: 'Error updating role' },
        { status: 500 },
      );
    }
  },
);

// DELETE /api/roles/[id] - Delete role (SUPER_ADMIN only)
// Explicitly pass the RoleParams type to restrictTo
export const DELETE = restrictTo<RoleParams>({ requiredRole: RoleLevel.SUPER_ADMIN })(
  async (
    req: AuthenticatedNextRequest,
    context: RouteContext<RoleParams>, // Context now uses the explicit type
  ) => {
    try {
      const id = parseInt(context.params.id, 10);
      if (isNaN(id)) {
        return NextResponse.json(
          { message: 'Invalid role ID' },
          { status: 400 },
        );
      }

      await prisma.role.delete({
        where: { id },
      });
      return NextResponse.json(
        { message: 'Role deleted successfully' },
        { status: 200 },
      );
    } catch (error: any) {
      logger.error(`API /roles/${context.params.id} DELETE error:`, error);
      if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Role not found' }, { status: 404 });
      }
      if (error.code === 'P2003') {
        return NextResponse.json(
          { message: 'Cannot delete role that is assigned to users.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { message: 'Error deleting role' },
        { status: 500 },
      );
    }
  },
);