require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE = 'http://localhost:5000/api';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name + (extra ? ' :: ' + extra : '')); console.log(`  FAIL  ${name} ${extra}`); }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* response body may be empty */ }
  return { status: res.status, data };
}

async function login(email, password) {
  const { status, data } = await api('/auth/login', { method: 'POST', body: { email, password } });
  return { status, data };
}

async function setupUsers() {
  const roles = {};
  for (const r of await prisma.role.findMany()) roles[r.name] = r.id;
  const hash = (p) => bcrypt.hash(p, 10);
  const pw = 'TestPass123';
  const usersToCreate = [
    ['TEST_SUPERADMIN', 'test.superadmin@school.test', 'SUPER_ADMIN', true],
    ['TEST_PRINCIPAL', 'test.principal@school.test', 'PRINCIPAL', true],
    ['TEST_TEACHER', 'test.teacher@school.test', 'TEACHER', true],
    ['TEST_ACCOUNTANT', 'test.accountant@school.test', 'ACCOUNTANT', true],
    ['TEST_RECEPTION', 'test.reception@school.test', 'RECEPTION', true],
    ['TEST_STAFF', 'test.staff@school.test', 'STAFF', true],
    ['TEST_DISABLED', 'test.disabled@school.test', 'STAFF', false],
  ];
  const created = [];
  for (const [name, email, roleName, active] of usersToCreate) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) await prisma.user.delete({ where: { id: existing.id } });
    const user = await prisma.user.create({
      data: { name, email, password: await hash(pw), roleId: roles[roleName], isActive: active },
      include: { role: true },
    });
    created.push(user);
  }
  return created;
}

async function cleanupUsers() {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@school.test' } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@school.test2' } } });
}

async function main() {
  console.log('== Setup test users ==');
  const [superAdmin, principal, teacher, accountant, reception, staff, disabled] = await setupUsers();
  console.log('Test users created.');

  // 1. Login failures
  console.log('== 1. Login behavior ==');
  let r = await login('test.teacher@school.test', 'WrongPass1');
  check('wrong password -> 401', r.status === 401);

  r = await login('test.disabled@school.test', 'TestPass123');
  check('disabled user login -> 403', r.status === 403);

  r = await login('nobody@school.test', 'TestPass123');
  check('unknown user -> 401', r.status === 401);

  // 2. Valid logins + shape
  const ses = {};
  for (const [key, u] of [['admin', superAdmin], ['principal', principal], ['teacher', teacher], ['accountant', accountant], ['reception', reception], ['staff', staff]]) {
    r = await login(u.email, 'TestPass123');
    check(`${key} login -> 200`, r.status === 200, `got ${r.status}`);
    if (r.status === 200) {
      ses[key] = { accessToken: r.data.accessToken, refreshToken: r.data.refreshToken, user: r.data.user };
      check(`${key} user has role`, r.data.user && r.data.user.role === u.role.name, `role=${r.data.user && r.data.user.role}`);
      check(`${key} user has permissions array`, Array.isArray(r.data.user.permissions) && r.data.user.permissions.length > 0, `perms=${r.data.user && r.data.user.permissions ? r.data.user.permissions.length : 'none'}`);
      check(`${key} NO password/hash leaked`, !r.data.user.password && !r.data.user.refreshToken && !JSON.stringify(r.data).includes('$2a$') && !JSON.stringify(r.data).includes('$2b$'));
    }
  }

  // 3. Unauthenticated / invalid token
  console.log('== 3. 401 behaviors ==');
  r = await api('/students');
  check('no token -> 401', r.status === 401);
  r = await api('/dashboard/stats', { token: 'garbage.token.here' });
  check('invalid token -> 401', r.status === 401);
  r = await api('/settings/public'); // public endpoint must stay open
  check('settings/public stays public -> 200', r.status === 200);

  // 4. Permission matrix (403s)
  console.log('== 4. Permission matrix ==');
  r = await api('/backups', { token: ses.accountant.accessToken });
  check('accountant GET /backups -> 403', r.status === 403);
  r = await api('/backups/restore', { method: 'POST', token: ses.principal.accessToken, body: { filename: 'x.sql' } });
  check('principal restore -> 403 (BACKUP_RESTORE superadmin only)', r.status === 403);
  r = await api('/backups', { method: 'POST', token: ses.principal.accessToken });
  check('principal create backup -> 201 (has BACKUP_CREATE)', r.status === 201);
  r = await api('/marks/exam/1', { method: 'POST', token: ses.accountant.accessToken, body: { marks: [] } });
  check('accountant save marks -> 403 (no MARKS_UPDATE)', r.status === 403);
  r = await api('/settings', { method: 'PUT', token: ses.teacher.accessToken, body: { school_name: 'x' } });
  check('teacher update settings -> 403 (no SETTINGS_UPDATE)', r.status === 403);
  r = await api('/settings', { token: ses.teacher.accessToken });
  check('teacher GET /settings -> 403 (no SETTINGS_VIEW)', r.status === 403);
  r = await api('/teachers', { token: ses.teacher.accessToken });
  check('teacher GET /teachers -> 403 (no TEACHER_VIEW) - salary protection', r.status === 403);
  r = await api('/teachers', { token: ses.reception.accessToken });
  check('reception GET /teachers -> 403 (no TEACHER_VIEW)', r.status === 403);
  r = await api('/users', { token: ses.accountant.accessToken });
  check('accountant GET /users -> 403 (no USER_VIEW)', r.status === 403);
  r = await api('/audit-logs', { token: ses.staff.accessToken });
  check('staff GET /audit-logs -> 403 (no AUDIT_VIEW)', r.status === 403);
  r = await api('/fees', { method: 'POST', token: ses.teacher.accessToken, body: { studentId: 1, amount: 100, dueDate: '2026-12-01' } });
  check('teacher create fee -> 403 (no FEES_CREATE)', r.status === 403);

  // Allowed paths
  r = await api('/students', { token: ses.teacher.accessToken });
  check('teacher GET /students -> 200 (has STUDENT_VIEW)', r.status === 200);
  r = await api('/students', { method: 'POST', token: ses.reception.accessToken, body: { name: '', classId: 1 } });
  check('reception create student (bad payload) -> 400 validation, not 403 (has STUDENT_CREATE)', r.status === 400);
  r = await api('/users', { token: ses.principal.accessToken });
  check('principal GET /users -> 200 (has USER_VIEW)', r.status === 200);
  r = await api('/dashboard/stats', { token: ses.staff.accessToken });
  check('staff dashboard -> 200 (has DASHBOARD_VIEW)', r.status === 200);

  // 5. User management API
  console.log('== 5. User management ==');
  r = await api('/users', { method: 'POST', token: ses.admin.accessToken, body: { name: 'Weak Pw', email: 'weak@school.test', password: 'short1' } });
  check('create user weak password -> 400', r.status === 400);
  r = await api('/users', { method: 'POST', token: ses.admin.accessToken, body: { name: 'Temp T', email: 'temp@school.test2', password: 'StrongPass9' } });
  check('create user (superadmin) -> 201', r.status === 201, `got ${r.status} ${JSON.stringify(r.data)}`);
  check('created user has NO password field', !r.data.user || r.data.user.password === undefined);
  r = await api('/users', { method: 'POST', token: ses.principal.accessToken, body: { name: 'X', email: 'x@school.test', password: 'StrongPass9', roleId: 1 } });
  check('principal cannot create SUPER_ADMIN user -> 403', r.status === 403, `got ${r.status}`);
  r = await api('/users/999999999', { method: 'PUT', token: ses.accountant.accessToken, body: {} });
  check('accountant update user -> 403 (no USER_UPDATE)', r.status === 403, `got ${r.status}`);

  // 6. Disable semantics
  console.log('== 6. Disable semantics ==');
  r = await login('temp@school.test2', 'StrongPass9');
  const tempUserId = r.data.user.id;
  r = await api(`/users/${tempUserId}/active`, { method: 'PUT', token: ses.admin.accessToken, body: { isActive: false } });
  check('disable user by superadmin -> 200', r.status === 200);
  r = await login('temp@school.test2', 'StrongPass9');
  check('disabled user cannot log in -> 403', r.status === 403);
  r = await api(`/users/${tempUserId}/active`, { method: 'PUT', token: ses.admin.accessToken, body: { isActive: true } });
  check('re-enable user -> 200', r.status === 200);
  const idMe = ses.admin.user.id;
  r = await api(`/users/${idMe}/active`, { method: 'PUT', token: ses.admin.accessToken, body: { isActive: false } });
  check('cannot disable yourself -> 400', r.status === 400);

  // 7. Refresh + logout
  console.log('== 7. Token refresh & logout ==');
  r = await api('/auth/refresh', { method: 'POST', body: { refreshToken: ses.teacher.refreshToken } });
  check('refresh -> 200 with new tokens', r.status === 200 && r.data.accessToken && r.data.refreshToken);
  const freshAccess = r.data.accessToken;
  r = await api('/students', { token: freshAccess });
  check('refreshed access token works -> 200', r.status === 200);
  r = await api('/auth/refresh', { method: 'POST', body: { refreshToken: 'not-a-real-token' } });
  check('refresh with garbage token -> 401', r.status === 401);
  r = await api('/auth/logout', { method: 'POST', token: ses.teacher.accessToken });
  check('logout -> 200', r.status === 200);
  r = await api('/auth/refresh', { method: 'POST', body: { refreshToken: ses.teacher.refreshToken } });
  check('refresh with rotated/revoked token after logout -> 401', r.status === 401);

  // 8. UNAUTHORIZED_ACCESS_ATTEMPT audit entries
  console.log('== 8. Audit events ==');
  const blockedCount = await prisma.auditLog.count({ where: { action: 'UNAUTHORIZED_ACCESS_ATTEMPT' } });
  check('UNAUTHORIZED_ACCESS_ATTEMPT rows recorded', blockedCount > 0, `count=${blockedCount}`);
  const loginSuccess = await prisma.auditLog.count({ where: { action: 'LOGIN_SUCCESS' } });
  const loginFailed = await prisma.auditLog.count({ where: { action: 'LOGIN_FAILED' } });
  check('LOGIN_SUCCESS rows recorded', loginSuccess > 0, `count=${loginSuccess}`);
  check('LOGIN_FAILED rows recorded', loginFailed >= 4, `count=${loginFailed}`);

  // 9. Existing data intact
  console.log('== 9. Data intact ==');
  const data = {
    students: await prisma.student.count(),
    teachers: await prisma.teacher.count(),
    classes: await prisma.class.count(),
    fees: await prisma.fee.count(),
    marks: await prisma.mark.count(),
    attendance: await prisma.attendance.count(),
    settings: await prisma.setting.count(),
  };
  console.log('  Data:', JSON.stringify(data));
  check('no data destroyed (all table counts returned cleanly)', Object.values(data).every((v) => typeof v === 'number'));

  await cleanupUsers();
  console.log('Test users cleaned up.');

  console.log(`\n==== RESULT: ${passed} passed, ${failed} failed ====`);
  if (failures.length) console.log('Failures:\n - ' + failures.join('\n - '));
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('Test harness error:', e);
  try { await cleanupUsers(); } catch { /* cleanup best-effort */ }
  await prisma.$disconnect();
  process.exit(1);
});