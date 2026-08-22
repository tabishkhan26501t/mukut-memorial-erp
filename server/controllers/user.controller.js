const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { validatePasswordStrength } = require('../utils/password');
const { logActivity } = require('../utils/audit');
const { ROLES } = require('../constants/roles');

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  photo: true,
  isActive: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true, description: true } },
};

const getUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const search = (req.query.search || '').toString().trim();
    const roleId = req.query.roleId ? parseInt(req.query.roleId, 10) : null;
    const isActive = req.query.isActive !== undefined && req.query.isActive !== ''
      ? req.query.isActive === 'true'
      : null;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (roleId) where.roleId = roleId;
    if (isActive !== null) where.isActive = isActive;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      select: USER_SAFE_SELECT,
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, phone, roleId, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ message: strength.message });
    }

    const targetRole = roleId ? await prisma.role.findUnique({ where: { id: parseInt(roleId, 10) } }) : null;
    if (roleId && !targetRole) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    if (targetRole && targetRole.name === ROLES.SUPER_ADMIN) {
      const actorIsSuperAdmin = req.user.role && req.user.role.name === ROLES.SUPER_ADMIN;
      if (!actorIsSuperAdmin) {
        return res.status(403).json({ message: 'Only a Super Admin can create a Super Admin account.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: phone ? String(phone) : null,
        password: hashedPassword,
        roleId: targetRole ? targetRole.id : null,
      },
      select: USER_SAFE_SELECT,
    });

    await logActivity({
      req,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      description: `Created user ${user.email} with role ${targetRole ? targetRole.name : 'none'}`,
    });
    res.status(201).json({ message: 'User created successfully.', user });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const target = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
      select: { id: true, email: true, isActive: true, role: { select: { name: true } } },
    });
    if (!target) return res.status(404).json({ message: 'User not found.' });

    const targetIsSuperAdmin = target.role && target.role.name === ROLES.SUPER_ADMIN;
    const actorIsSuperAdmin = req.user.role && req.user.role.name === ROLES.SUPER_ADMIN;
    if (targetIsSuperAdmin && !actorIsSuperAdmin) {
      return res.status(403).json({ message: 'Only Super Admin accounts can be modified by a Super Admin.' });
    }

    const data = {};
    if (req.body.name !== undefined) {
      data.name = String(req.body.name).trim();
      if (!data.name) return res.status(400).json({ message: 'Name cannot be empty.' });
    }
    if (req.body.phone !== undefined) data.phone = req.body.phone ? String(req.body.phone) : null;

    if (req.body.email !== undefined && req.body.email !== target.email) {
      const email = String(req.body.email).trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ message: 'A user with this email already exists.' });
      }
      data.email = email;
    }

    let newRoleName = null;
    let oldRoleName = target.role ? target.role.name : 'none';
    if (req.body.roleId !== undefined) {
      const roleId = req.body.roleId === null || req.body.roleId === '' ? null : parseInt(req.body.roleId, 10);
      if (id === req.user.id && roleId !== req.user.roleId) {
        return res.status(400).json({ message: 'You cannot change your own role.' });
      }
      const role = roleId === null ? null : await prisma.role.findUnique({ where: { id: roleId } });
      if (roleId !== null && !role) return res.status(400).json({ message: 'Invalid role.' });
      if (role && role.name === ROLES.SUPER_ADMIN && !actorIsSuperAdmin) {
        return res.status(403).json({ message: 'Only a Super Admin can assign the Super Admin role.' });
      }
      data.roleId = roleId;
      newRoleName = role ? role.name : 'none';
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: USER_SAFE_SELECT,
    });

    await logActivity({
      req,
      action: newRoleName && newRoleName !== oldRoleName ? 'ROLE_CHANGED' : 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      description: newRoleName && newRoleName !== oldRoleName
        ? `Role changed for ${user.email}: ${oldRoleName} -> ${newRoleName}`
        : `Updated user ${user.email}`,
    });
    res.json({ message: 'User updated successfully.', user });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const setUserActive = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot disable your own account.' });
    }
    const isActive = req.body.isActive === true || req.body.isActive === 'true';

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: { select: { name: true } } },
    });
    if (!target) return res.status(404).json({ message: 'User not found.' });

    const targetIsSuperAdmin = target.role && target.role.name === ROLES.SUPER_ADMIN;
    const actorIsSuperAdmin = req.user.role && req.user.role.name === ROLES.SUPER_ADMIN;
    if (targetIsSuperAdmin && !actorIsSuperAdmin) {
      return res.status(403).json({ message: 'Only a Super Admin can change a Super Admin account.' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive, refreshToken: isActive ? undefined : null },
      select: USER_SAFE_SELECT,
    });

    await logActivity({
      req,
      action: isActive ? 'USER_ENABLED' : 'USER_DISABLED',
      entity: 'User',
      entityId: id,
      description: `${isActive ? 'Enabled' : 'Disabled'} account ${user.email}`,
    });
    res.json({ message: isActive ? 'User enabled.' : 'User disabled.', user });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { password } = req.body;
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ message: strength.message });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword, refreshToken: null, resetToken: null, resetTokenExpiry: null },
    });

    await logActivity({
      req,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: id,
      description: `Password reset by ${req.user.email} for ${user.email}`,
    });
    res.json({ message: 'Password reset successfully. The user must log in again.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: { select: { id: true, name: true, module: true, description: true } } },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        userCount: role._count.users,
        permissions: role.permissions.map((rp) => rp.permission.name),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getPermissionsList = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
    const grouped = {};
    permissions.forEach((permission) => {
      if (!grouped[permission.module]) grouped[permission.module] = [];
      grouped[permission.module].push({
        name: permission.name,
        description: permission.description,
      });
    });
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return res.status(404).json({ message: 'Role not found.' });

    const permissionNames = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const permissions = await prisma.permission.findMany({
      where: { name: { in: permissionNames } },
    });
    if (permissions.length !== new Set(permissionNames).size) {
      return res.status(400).json({ message: 'One or more permissions are invalid.' });
    }

    const permissionIds = permissions.map((permission) => permission.id);
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...permissionIds.map((permissionId) =>
        prisma.rolePermission.create({ data: { roleId, permissionId } })
      ),
    ]);

    await logActivity({
      req,
      action: 'PERMISSION_CHANGED',
      entity: 'Role',
      entityId: roleId,
      description: `Permissions for role ${role.name} updated (${permissionIds.length} granted)`,
    });
    res.json({ message: 'Role permissions updated.', roleId, permissions: permissionNames });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  setUserActive,
  resetUserPassword,
  getRoles,
  getPermissionsList,
  updateRolePermissions,
};