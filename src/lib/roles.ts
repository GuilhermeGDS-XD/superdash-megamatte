export type CanonicalRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

const ROLE_NORMALIZATION_MAP: Record<string, CanonicalRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  'SUPER ADMIN': 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  GESTOR: 'MANAGER',
};

export function normalizeRole(role?: string | null): CanonicalRole {
  if (!role) {
    return 'MANAGER';
  }

  const normalizedInput = role.trim().replace(/[-_]/g, ' ').toUpperCase();
  return ROLE_NORMALIZATION_MAP[normalizedInput] ?? 'MANAGER';
}

export function roleLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (normalized === 'SUPER_ADMIN') return 'Super Admin';
  if (normalized === 'ADMIN') return 'Administrador';
  return 'Gestor';
}

export function isSuperAdmin(role?: string | null): boolean {
  return normalizeRole(role) === 'SUPER_ADMIN';
}

export function isAdmin(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'SUPER_ADMIN' || normalized === 'ADMIN';
}

export function canAccessAdmin(role?: string | null): boolean {
  return isAdmin(role);
}

export function canViewLogs(role?: string | null, explicitPermission?: boolean): boolean {
  return isAdmin(role) || (!!explicitPermission && normalizeRole(role) === 'MANAGER');
}
