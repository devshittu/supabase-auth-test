//   src/lib/rbac.ts
enum RoleLevel {
  OPEN = 0, // Open access for all authenticated users
  ASSISTANT = 1, // Entry Level/Assistant
  PROFESSIONAL = 2, // Nurses/Qualified Professionals
  SENIOR = 3, // Senior Professionals
  MANAGER = 4, // Managers/Ward Managers/Department Heads
  EXECUTIVE = 5, // Clinical Service Managers/Hospital Manager/Medical Consultants
  SUPER_ADMIN = 10, // Super Admin for almighty control
}

const roleLevelToNumber: Record<RoleLevel, number> = {
  [RoleLevel.OPEN]: 0,
  [RoleLevel.ASSISTANT]: 1,
  [RoleLevel.PROFESSIONAL]: 2,
  [RoleLevel.SENIOR]: 3,
  [RoleLevel.MANAGER]: 4,
  [RoleLevel.EXECUTIVE]: 5,
  [RoleLevel.SUPER_ADMIN]: 10,
};

const numberToRoleLevel: Record<number, RoleLevel> = {
  0: RoleLevel.OPEN,
  1: RoleLevel.ASSISTANT,
  2: RoleLevel.PROFESSIONAL,
  3: RoleLevel.SENIOR,
  4: RoleLevel.MANAGER,
  5: RoleLevel.EXECUTIVE,
  10: RoleLevel.SUPER_ADMIN,
};

function hasRequiredLevel(
  userLevel: number,
  requiredLevel: RoleLevel,
): boolean {
  const userRoleLevel = numberToRoleLevel[userLevel] ?? RoleLevel.OPEN;
  return (
    userRoleLevel >= requiredLevel || userRoleLevel === RoleLevel.SUPER_ADMIN
  );
}

function getRoleLevelLabel(level: number): string {
  return RoleLevel[numberToRoleLevel[level]] ?? 'Unknown';
}

export {
  RoleLevel,
  roleLevelToNumber,
  numberToRoleLevel,
  hasRequiredLevel,
  getRoleLevelLabel,
};
//   src/lib/rbac.ts
