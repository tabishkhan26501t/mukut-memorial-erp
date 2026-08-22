import api from './api';
import { User } from '@/types';

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  role?: { id: number; name: string; description?: string } | null;
}

export const userService = {
  getAll: async (params?: Record<string, any>): Promise<{ users: ManagedUser[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
    const { data } = await api.get('/users', { params });
    return data;
  },
  getRoles: async (): Promise<{ roles: { id: number; name: string; description?: string; isSystem: boolean; userCount: number; permissions: string[] }[] }> => {
    const { data } = await api.get('/users/roles');
    return data;
  },
  getPermissions: async (): Promise<Record<string, { name: string; description?: string }[]>> => {
    const { data } = await api.get('/users/permissions');
    return data;
  },
  create: async (payload: { name: string; email: string; password: string; roleId?: number; phone?: string }): Promise<User> => {
    const { data } = await api.post('/users', payload);
    return data.user;
  },
  update: async (id: number, payload: { name?: string; email?: string; phone?: string; roleId?: number | null }): Promise<User> => {
    const { data } = await api.put(`/users/${id}`, payload);
    return data.user;
  },
  setActive: async (id: number, isActive: boolean): Promise<User> => {
    const { data } = await api.put(`/users/${id}/active`, { isActive });
    return data.user;
  },
  resetPassword: async (id: number, password: string): Promise<void> => {
    await api.put(`/users/${id}/reset-password`, { password });
  },
  updateRolePermissions: async (roleId: number, permissions: string[]): Promise<void> => {
    await api.put(`/users/roles/${roleId}/permissions`, { permissions });
  },
};