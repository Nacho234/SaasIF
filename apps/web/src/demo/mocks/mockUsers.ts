import type { User } from '@/types';
import { DEFAULT_ROLE_PERMISSIONS } from '@/constants/permissions';

export const MOCK_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Ana García',
    email: 'admin@demo.mostrador.app',
    role: 'admin',
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    status: 'active',
    avatarColor: '#7c3aed',
    lastLoginAt: null,
    createdAt: '2026-01-10T12:00:00.000Z',
  },
  {
    id: 'user-manager',
    name: 'Martín López',
    email: 'encargado@demo.mostrador.app',
    role: 'manager',
    permissions: DEFAULT_ROLE_PERMISSIONS.manager,
    status: 'active',
    avatarColor: '#0891b2',
    lastLoginAt: null,
    createdAt: '2026-01-15T12:00:00.000Z',
  },
  {
    id: 'user-seller',
    name: 'Camila Fernández',
    email: 'vendedor@demo.mostrador.app',
    role: 'seller',
    permissions: DEFAULT_ROLE_PERMISSIONS.seller,
    status: 'active',
    avatarColor: '#ea580c',
    lastLoginAt: null,
    createdAt: '2026-02-01T12:00:00.000Z',
  },
  {
    id: 'user-seller-2',
    name: 'Julián Pereyra',
    email: 'julian@demo.mostrador.app',
    role: 'seller',
    permissions: DEFAULT_ROLE_PERMISSIONS.seller,
    status: 'inactive',
    avatarColor: '#64748b',
    lastLoginAt: '2026-05-20T14:30:00.000Z',
    createdAt: '2026-02-20T12:00:00.000Z',
  },
];
