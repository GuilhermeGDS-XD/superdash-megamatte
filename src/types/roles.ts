// src/types/roles.ts
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  MANAGER: 'Gestor'
};
