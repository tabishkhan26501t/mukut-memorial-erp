const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PERMISSIONS } = require('../constants/permissions');
const { ROLES, ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } = require('../constants/roles');

const prisma = new PrismaClient();

const isProduction = process.env.NODE_ENV === 'production';

async function seedRolesAndPermissions() {
  const roles = {};
  for (const name of Object.keys(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {
        description: ROLE_DESCRIPTIONS[name],
        isSystem: name === ROLES.SUPER_ADMIN,
      },
      create: {
        name,
        description: ROLE_DESCRIPTIONS[name],
        isSystem: name === ROLES.SUPER_ADMIN,
      },
    });
    roles[name] = role.id;
  }

  const permissionIds = {};
  for (const permission of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { name: permission.name },
      update: { module: permission.module, description: permission.description },
      create: permission,
    });
    permissionIds[permission.name] = record.id;
  }

  for (const [roleName, rolePermissions] of Object.entries(ROLE_PERMISSIONS)) {
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: roles[roleName] } }),
      ...rolePermissions.map((permissionName) =>
        prisma.rolePermission.create({
          data: {
            roleId: roles[roleName],
            permissionId: permissionIds[permissionName],
          },
        })
      ),
    ]);
  }

  console.log(`Seeded ${Object.keys(roles).length} roles with ${Object.keys(permissionIds).length} permissions.`);
  return roles;
}

async function seedSuperAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'tabish26501').toString();
  const role = await prisma.role.findUnique({ where: { name: ROLES.SUPER_ADMIN } });

  const existing = await prisma.user.findUnique({ where: { email } });

  let password = process.env.SEED_ADMIN_PASSWORD;
  if (password && password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
  }

  if (existing) {
    const data = { roleId: role.id };
    let changed = false;
    if (password) {
      data.password = await bcrypt.hash(password, 12);
      changed = true;
    }
    await prisma.user.update({ where: { email }, data });
    console.log(`Super Admin "${email}" already exists. Role ensured (SUPER_ADMIN).${changed ? ' Password reset from SEED_ADMIN_PASSWORD.' : ' Existing password preserved.'}`);
    return;
  }

  if (!password) {
    password = crypto.randomBytes(6).toString('base64url') + 'A1!';
    console.log(`No SEED_ADMIN_PASSWORD set; generated a development password: ${password}`);
  } else if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters with a letter and a number.');
  }
  if (isProduction && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error('SEED_ADMIN_PASSWORD must be set in production to seed the initial Super Admin.');
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email,
      password: hashedPassword,
      phone: '+91-9876543210',
      roleId: role.id,
    },
  });
  console.log(`Super Admin "${email}" created.` + (process.env.SEED_ADMIN_PASSWORD ? '' : ' (development-only credentials above)'));
}

async function seedFees() {
  const students = await prisma.student.findMany({ take: 5 });
  if (students.length === 0) return;
  const feeTypes = ['tuition', 'transport', 'library', 'sports', 'lab'];
  for (const student of students) {
    const existing = await prisma.fee.count({ where: { studentId: student.id } });
    if (existing > 0) continue;
    for (const type of feeTypes) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1);
      const amount = type === 'tuition' ? 5000 : type === 'transport' ? 1500 : 500;
      const isPaid = Math.random() > 0.3;
      await prisma.fee.create({
        data: {
          studentId: student.id,
          amount,
          paidAmount: isPaid ? amount : 0,
          dueDate,
          status: isPaid ? 'paid' : 'pending',
          type,
        },
      });
    }
  }
  console.log('Sample fees seeded for existing students.');
}

async function seedSettings() {
  const settings = [
    { key: 'school_name', value: 'xyz school ltd' },
    { key: 'school_principal', value: 'Principal Name' },
    { key: 'school_address', value: '123, Education Road, City, State - 123456' },
    { key: 'school_phone', value: '+91-1234567890' },
    { key: 'school_email', value: 'info@xyzschool.com' },
    { key: 'school_website', value: 'https://xyzschool.com' },
    { key: 'academic_year', value: '2025-2026' },
    { key: 'grading_system', value: JSON.stringify({ 'A+': '90-100', 'A': '80-89', 'B+': '70-79', 'B': '60-69', 'C': '50-59', 'D': '40-49', 'F': '0-39' }) },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('School settings seeded.');
}

async function main() {
  const roles = await seedRolesAndPermissions();
  await seedSuperAdmin();
  await seedFees();
  await seedSettings();
  console.log('Seed completed.');
  console.log('Roles:', Object.keys(roles).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });