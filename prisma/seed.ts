// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { RoleLevel } from '../src/lib/rbac';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial departments and roles...');

  // Departments
  const engineering = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: { name: 'Engineering' },
  });
  const hr = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources' },
  });
  const operations = await prisma.department.upsert({
    where: { name: 'Operations' },
    update: {},
    create: { name: 'Operations' },
  });
  const administration = await prisma.department.upsert({
    where: { name: 'Administration' },
    update: {},
    create: { name: 'Administration' },
  });

  console.log('Departments seeded.');

  // Roles
  await prisma.role.upsert({
    where: { name: 'Open User' },
    update: {},
    create: {
      name: 'Open User',
      level: RoleLevel.OPEN,
      departmentId: administration.id,
    },
  });
  await prisma.role.upsert({
    where: { name: 'Assistant Developer' },
    update: {},
    create: {
      name: 'Assistant Developer',
      level: RoleLevel.ASSISTANT,
      departmentId: engineering.id,
    },
  });
  await prisma.role.upsert({
    where: { name: 'Professional Developer' },
    update: {},
    create: {
      name: 'Professional Developer',
      level: RoleLevel.PROFESSIONAL,
      departmentId: engineering.id,
    },
  });
  await prisma.role.upsert({
    where: { name: 'Senior Engineer' },
    update: {},
    create: {
      name: 'Senior Engineer',
      level: RoleLevel.SENIOR,
      departmentId: engineering.id,
    },
  });
  await prisma.role.upsert({
    where: { name: 'Engineering Manager' },
    update: {},
    create: {
      name: 'Engineering Manager',
      level: RoleLevel.MANAGER,
      departmentId: engineering.id,
    },
  });
  await prisma.role.upsert({
    where: { name: 'HR Executive' },
    update: {},
    create: {
      name: 'HR Executive',
      level: RoleLevel.EXECUTIVE,
      departmentId: hr.id,
    },
  });
  await prisma.role.upsert({
    where: { name: 'Operations Manager' },
    update: {},
    create: {
      name: 'Operations Manager',
      level: RoleLevel.MANAGER,
      departmentId: operations.id,
    },
  });
  await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      level: RoleLevel.SUPER_ADMIN,
      departmentId: administration.id,
    },
  });

  console.log('Roles seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// prisma/seed.ts
