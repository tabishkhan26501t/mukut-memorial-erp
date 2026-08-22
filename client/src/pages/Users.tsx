import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, ShieldCheck, Users as UsersIcon, KeyRound, Ban, CheckCircle, Loader2, Lock } from 'lucide-react';
import { userService, ManagedUser } from '@/services/user.service';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/constants/permissions';



interface RoleRow {
  id: number;
  name: string;
  description?: string;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

const roleBadgeColors: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
  [ROLES.PRINCIPAL]: 'bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300',
  [ROLES.TEACHER]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
  [ROLES.ACCOUNTANT]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
  [ROLES.RECEPTION]: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
  [ROLES.STAFF]: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
};

const passwordValid = (p: string) => p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);

export default function Users() {
  const { user: me, hasPermission } = useAuth();
  const canCreate = hasPermission('USER_CREATE');
  const canUpdate = hasPermission('USER_UPDATE');
  const canDisable = hasPermission('USER_DISABLE');

  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<Record<string, { name: string; description?: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<ManagedUser | null>(null);
  const [permTarget, setPermTarget] = useState<RoleRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', roleId: '' });
  const [newPassword, setNewPassword] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: pagination.limit };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.roleId = roleFilter;
      if (statusFilter !== '') params.isActive = statusFilter === 'active';
      const data = await userService.getAll(params);
      setUsers(data.users as ManagedUser[]);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, pagination.limit]);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await userService.getRoles();
      setRoles(data.roles);
    } catch {
      toast.error('Failed to load roles');
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { if (tab === 'roles') fetchRoles(); }, [tab, fetchRoles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Name, username and password are required');
      return;
    }
    if (!passwordValid(form.password)) {
      toast.error('Password must be at least 8 characters with a letter and a number');
      return;
    }
    setSaving(true);
    try {
      await userService.create({
        name: form.name,
        email: form.email,
        password: form.password,
        roleId: form.roleId ? Number(form.roleId) : undefined,
      });
      toast.success('User created');
      setCreateOpen(false);
      setForm({ name: '', email: '', password: '', roleId: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await userService.update(editTarget.id, {
        name: editForm.name,
        email: editForm.email,
        roleId: editForm.roleId ? Number(editForm.roleId) : null,
      });
      toast.success('User updated');
      setEditTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordTarget || !passwordValid(newPassword)) {
      toast.error('Password must be at least 8 characters with a letter and a number');
      return;
    }
    setSaving(true);
    try {
      await userService.resetPassword(passwordTarget.id, newPassword);
      toast.success('Password reset — user must log in again');
      setPasswordTarget(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    setSaving(true);
    try {
      await userService.setActive(statusTarget.id, !statusTarget.isActive);
      toast.success(statusTarget.isActive ? 'User disabled' : 'User enabled');
      setStatusTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const openPermManager = async (role: RoleRow) => {
    setPermTarget(role);
    setSelectedPerms(role.permissions);
    try {
      const groups = await userService.getPermissions();
      setPermissionGroups(groups);
    } catch {
      toast.error('Failed to load permissions');
    }
  };

  const saveRolePermissions = async () => {
    if (!permTarget) return;
    setSaving(true);
    try {
      await userService.updateRolePermissions(permTarget.id, selectedPerms);
      toast.success('Role permissions updated');
      setPermTarget(null);
      fetchRoles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (name: string) => {
    setSelectedPerms((prev) => prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Users & Roles</h1>
          <p className="text-sm text-surface-500 mt-1">Manage staff accounts and role permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl p-1">
            <button
              onClick={() => setTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'users' ? 'bg-white dark:bg-surface-900 shadow-sm text-primary-600 dark:text-primary-400' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
            >
              <UsersIcon size={15} /> Users
            </button>
            <button
              onClick={() => setTab('roles')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'roles' ? 'bg-white dark:bg-surface-900 shadow-sm text-primary-600 dark:text-primary-400' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
            >
              <ShieldCheck size={15} /> Roles & Permissions
            </button>
          </div>
          {canCreate && tab === 'users' && (
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Plus size={18} /> New User
            </button>
          )}
        </div>
      </div>

      {tab === 'users' ? (
        <>
          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  className="input pl-9"
                  placeholder="Search name or username..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                />
              </div>
              <select className="select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
                <option value="">All roles</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select className="select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Disabled</option>
              </select>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-surface-400 border-b border-surface-100 dark:border-surface-800">
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Last Login</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-surface-500">Loading users...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-surface-500">No users found</td></tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className="border-b border-surface-50 dark:border-surface-800/60 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-surface-900 dark:text-white">{u.name}{u.id === me?.id && <span className="ml-2 text-[10px] font-semibold text-primary-600 dark:text-primary-400">(You)</span>}</p>
                        <p className="text-xs text-surface-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-md text-[11px] font-semibold ${roleBadgeColors[u.role?.name || ''] || roleBadgeColors[ROLES.STAFF]}`}>
                          {u.role?.name || 'NO ROLE'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-500">{u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && u.id !== me?.id && (
                            <button onClick={() => { setEditTarget(u); setEditForm({ name: u.name, email: u.email, roleId: u.role ? String(u.role.id) : '' }); }} className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors" title="Edit user" aria-label={`Edit ${u.name}`}>
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDisable && u.id !== me?.id && (
                            <>
                              <button onClick={() => setPasswordTarget(u)} className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors" title="Reset password" aria-label={`Reset password for ${u.name}`}>
                                <KeyRound size={14} />
                              </button>
                              <button onClick={() => setStatusTarget(u)} className={`p-2 rounded-lg transition-colors ${u.isActive ? 'text-surface-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50' : 'text-surface-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'}`} title={u.isActive ? 'Disable account' : 'Enable account'} aria-label={u.isActive ? `Disable ${u.name}` : `Enable ${u.name}`}>
                                {u.isActive ? <Ban size={14} /> : <CheckCircle size={14} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-surface-800">
                <p className="text-xs text-surface-500">Page {pagination.page} of {pagination.pages} ({pagination.total} users)</p>
                <div className="flex gap-2">
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}>Prev</button>
                  <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={pagination.page >= pagination.pages} onClick={() => fetchUsers(pagination.page + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block px-2 py-1 rounded-md text-[11px] font-semibold ${roleBadgeColors[role.name] || roleBadgeColors[ROLES.STAFF]}`}>{role.name}</span>
                  {role.isSystem && <span className="ml-2 text-[10px] text-surface-400">SYSTEM</span>}
                </div>
                <span className="text-xs text-surface-500">{role.userCount} user{role.userCount !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs text-surface-500 mt-3 leading-relaxed min-h-[2.5rem]">{role.description || 'No description'}</p>
              <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                <span className="text-xs font-medium text-surface-600 dark:text-surface-300">{role.permissions.length} permissions</span>
                {canUpdate && (
                  <button onClick={() => openPermManager(role)} className="btn-secondary !px-3 !py-1.5 text-xs flex items-center gap-1.5">
                    <ShieldCheck size={13} /> Manage
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create User" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="u-name">Full Name *</label>
              <input id="u-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Kumar" required />
            </div>
            <div>
              <label className="label" htmlFor="u-email">Username / Email *</label>
              <input id="u-email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. ramesh@school.com" required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="u-role">Role</label>
            <select id="u-role" className="select" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">No role (no access)</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="u-password">Password *</label>
            <input id="u-password" type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars, letter + number" required />
            {form.password && !passwordValid(form.password) && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">At least 8 characters with a letter and a number.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create User</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit User" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="e-name">Full Name</label>
              <input id="e-name" className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="e-email">Username / Email</label>
              <input id="e-email" className="input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="e-role">Role</label>
            <select id="e-role" className="select" value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })} disabled={editTarget?.id === me?.id}>
              <option value="">No role (no access)</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {editTarget?.id === me?.id && <p className="text-xs text-surface-500 mt-1.5">You cannot change your own role.</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />} Save Changes</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!passwordTarget} onClose={() => { setPasswordTarget(null); setNewPassword(''); }} title={`Reset Password — ${passwordTarget?.name || ''}`} size="md">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="p-new">New Password</label>
            <input id="p-new" type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 chars, letter + number" autoFocus />
            {newPassword && !passwordValid(newPassword) && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">At least 8 characters with a letter and a number.</p>
            )}
          </div>
          <p className="text-xs text-surface-500 flex items-start gap-2">
            <Lock size={14} className="mt-0.5 flex-shrink-0" />
            The user will be signed out of all sessions and must log in again with the new password.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setPasswordTarget(null); setNewPassword(''); }} className="btn-secondary">Cancel</button>
            <button onClick={handleResetPassword} disabled={saving} className="btn-primary">{saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Reset Password</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
        title={statusTarget?.isActive ? 'Disable Account' : 'Enable Account'}
        message={statusTarget
          ? statusTarget.isActive
            ? `Disable ${statusTarget.name}? They will be logged out immediately and blocked from signing in.`
            : `Enable ${statusTarget.name}? They will be able to sign in again.`
          : ''}
        itemName={statusTarget?.name}
        loading={saving}
        confirmText={statusTarget?.isActive ? 'Disable' : 'Enable'}
      />

      <Modal isOpen={!!permTarget} onClose={() => setPermTarget(null)} title={`Permissions — ${permTarget?.name || ''}`} size="xl">
        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-5">
          {Object.entries(permissionGroups).map(([module, perms]) => (
            <div key={module}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-2">{module}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perms.map((p) => (
                  <label key={p.name} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-primary-600"
                      checked={selectedPerms.includes(p.name)}
                      onChange={() => togglePerm(p.name)}
                    />
                    <span className="text-xs">
                      <span className="font-mono font-medium text-surface-700 dark:text-surface-200">{p.name}</span>
                      {p.description && <span className="block text-surface-500 mt-0.5">{p.description}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-surface-100 dark:border-surface-800">
          <button onClick={() => setPermTarget(null)} className="btn-secondary">Cancel</button>
          <button onClick={saveRolePermissions} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Save Permissions ({selectedPerms.length})
          </button>
        </div>
      </Modal>
    </div>
  );
}