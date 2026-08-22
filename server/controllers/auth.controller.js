const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const { sendPasswordResetEmail } = require('../utils/email');
const { validatePasswordStrength } = require('../utils/password');
const logger = require('../utils/logger');
const { logActivity } = require('../utils/audit');

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  photo: true,
  isActive: true,
  lastLogin: true,
  createdAt: true,
  role: { select: { id: true, name: true, description: true } },
};

const buildSessionUser = (user) => {
  const permissions = user.role
    ? user.role.permissions.map((rp) => rp.permission.name)
    : [];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    photo: user.photo,
    isActive: user.isActive,
    role: user.role ? user.role.name : '',
    roleId: user.role ? user.role.id : null,
    permissions,
  };
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user) {
      await logActivity({
        req,
        action: 'LOGIN_FAILED',
        entity: 'Auth',
        description: `Failed login attempt for username "${email}" (no such account)`,
      });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logActivity({
        req,
        action: 'LOGIN_FAILED',
        entity: 'Auth',
        entityId: user.id,
        description: `Failed login attempt for ${user.email}`,
      });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      await logActivity({
        req,
        action: 'LOGIN_FAILED',
        entity: 'Auth',
        entityId: user.id,
        description: `Blocked login for disabled account ${user.email}`,
      });
      return res.status(403).json({ message: 'Account deactivated. Contact administrator.' });
    }

    const payload = { id: user.id, email: user.email, role: user.role ? user.role.name : '' };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLogin: new Date() },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    res.json({
      accessToken,
      refreshToken,
      user: buildSessionUser(updated),
    });
    await logActivity({
      req,
      user,
      action: 'LOGIN_SUCCESS',
      entity: 'Auth',
      entityId: user.id,
      description: `${user.email} logged in as ${payload.role}`,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, refreshToken: true, isActive: true, role: true },
    });

    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const payload = { id: user.id, email: user.email, role: user.role ? user.role.name : '' };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error('Refresh error:', error);
    return res.status(401).json({ message: 'Invalid refresh token.' });
  }
};

const logout = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });
    await logActivity({
      req,
      action: 'LOGOUT',
      entity: 'Auth',
      entityId: req.user.id,
      description: `${req.user.email} logged out`,
    });
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    // Do not reveal whether the account exists (avoid user enumeration).
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: hashedToken, resetTokenExpiry: expiresAt },
      });
      await logActivity({
        req,
        action: 'PASSWORD_RESET_REQUESTED',
        entity: 'Auth',
        entityId: user.id,
        description: `Password reset requested for ${user.email}`,
      });
      await sendPasswordResetEmail(email, rawToken);
    }
    res.json({ message: 'Password reset email sent.' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required.' });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ message: strength.message });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: { resetToken: hashedToken, resetTokenExpiry: { gte: new Date() } },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, refreshToken: null, resetToken: null, resetTokenExpiry: null },
    });
    await logActivity({
      req,
      action: 'PASSWORD_RESET',
      entity: 'Auth',
      entityId: user.id,
      description: `Password reset by token for ${user.email}`,
    });

    res.json({ message: 'Password reset successful.' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(400).json({ message: 'Invalid or expired token.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        ...USER_SELECT,
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(buildSessionUser(user));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { login, refresh, logout, forgotPassword, resetPassword, getProfile };