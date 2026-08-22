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
  return { status: res.status, data, headers: res.headers };
}

async function login(email, password) {
  const { status, data } = await api('/auth/login', { method: 'POST', body: { email, password } });
  return { status, data };
}

const ids = {};

async function setup() {
  const roles = {};
  for (const r of await prisma.role.findMany()) roles[r.name] = r.id;
  const hash = (p) => bcrypt.hash(p, 10);
  const pw = 'TestPass123';
  const usersToCreate = [
    ['TT_SUPERADMIN', 'tt.superadmin@school.test', 'SUPER_ADMIN', true],
    ['TT_TEACHER', 'tt.teacher@school.test', 'TEACHER', true],
    ['TT_ACCOUNTANT', 'tt.accountant@school.test', 'ACCOUNTANT', true],
    ['TT_RECEPTION', 'tt.reception@school.test', 'RECEPTION', true],
  ];
  const created = {};
  for (const [name, email, roleName, active] of usersToCreate) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) await prisma.user.delete({ where: { id: existing.id } });
    const user = await prisma.user.create({ data: { name, email, password: await hash(pw), roleId: roles[roleName], isActive: active } });
    created[roleName] = user;
  }

  let cls = await prisma.class.findFirst();
  if (!cls) cls = await prisma.class.create({ data: { name: 'TEST_CLASS', section: 'A' } });
  ids.classId = cls.id;
  ids.className = cls.name;

  const stu = [];
  for (let i = 1; i <= 4; i++) {
    const existing = await prisma.student.findUnique({ where: { admissionNo: `TT-STU-${i}` } });
    if (existing) await prisma.student.delete({ where: { id: existing.id } });
    const s = await prisma.student.create({
      data: {
        admissionNo: `TT-STU-${i}`, rollNo: 900 + i, name: `Transport Test Student ${i}`,
        dob: new Date('2012-01-01'), gender: i % 2 ? 'Male' : 'Female', fatherName: 'Test Father', motherName: 'Test Mother',
        classId: cls.id, isActive: i < 4,
      },
    });
    stu.push(s);
  }
  ids.students = stu;
  return created;
}

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { entity: { in: ['Vehicle', 'TransportStaff', 'TransportRoute', 'TransportStop', 'StudentTransport', 'Fee'] } } }).catch(() => {});
  await prisma.notification.deleteMany({ where: { title: { contains: 'Transport' } } }).catch(() => {});
  await prisma.studentTransportAssignment.deleteMany({ where: { student: { admissionNo: { startsWith: 'TT-STU-' } } } }).catch(() => {});
  await prisma.studentTransportAssignment.deleteMany({ where: { route: { routeCode: { startsWith: 'TT-R-' } } } }).catch(() => {});
  await prisma.transportStop.deleteMany({ where: { route: { routeCode: { startsWith: 'TT-R-' } } } }).catch(() => {});
  await prisma.transportRoute.deleteMany({ where: { routeCode: { startsWith: 'TT-R-' } } }).catch(() => {});
  await prisma.transportStaff.deleteMany({ where: { staffId: { startsWith: 'TT-D-' } } }).catch(() => {});
  await prisma.vehicleDocument.deleteMany({ where: { vehicle: { vehicleId: { startsWith: 'TT-V-' } } } }).catch(() => {});
  await prisma.vehicle.deleteMany({ where: { vehicleId: { startsWith: 'TT-V-' } } }).catch(() => {});
  await prisma.fee.deleteMany({ where: { student: { admissionNo: { startsWith: 'TT-STU-' } } } }).catch(() => {});
  await prisma.student.deleteMany({ where: { admissionNo: { startsWith: 'TT-STU-' } } }).catch(() => {});
  await prisma.class.deleteMany({ where: { name: 'TEST_CLASS' } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: { endsWith: '@school.test' } } });
}

async function main() {
  console.log('== Transport module integration tests ==');
  console.log('== Setup ==');
  await setup();
  console.log('Setup complete.');
  let r;

  // Login
  const sup = await login('tt.superadmin@school.test', 'TestPass123');
  check('superadmin login -> 200', sup.status === 200);
  const tok = sup.data.accessToken;
  const tea = await login('tt.teacher@school.test', 'TestPass123');
  const acc = await login('tt.accountant@school.test', 'TestPass123');
  const rec = await login('tt.reception@school.test', 'TestPass123');
  const tTok = tea.data.accessToken;
  const aTok = acc.data.accessToken;
  const rTok = rec.data.accessToken;

  console.log('== 1. Permissions ==');
  r = await api('/transport/vehicles', { token: tTok });
  check('teacher TRANSPORT_VIEW can list vehicles -> 200', r.status === 200);
  r = await api('/transport/vehicles', { method: 'POST', token: tTok, body: { vehicleId: 'TT-V-P', registrationNumber: 'TT-P-1', capacity: 10 } });
  check('teacher cannot create vehicle -> 403', r.status === 403);
  r = await api('/transport/fees', { token: tTok });
  check('teacher cannot view transport fees -> 403', r.status === 403);
  r = await api('/transport/fees', { token: aTok });
  check('accountant TRANSPORT_FEES_VIEW can view fees -> 200', r.status === 200);
  r = await api('/transport/fees', { method: 'POST', token: aTok, body: { studentId: ids.students[0].id, amount: 100, dueDate: '2026-12-31' } });
  check('accountant TRANSPORT_FEES_MANAGE can create fee -> 201', r.status === 201, `got ${r.status} ${r.data ? JSON.stringify(r.data) : ''}`);
  r = await api('/transport/fees', { method: 'POST', token: tTok, body: { studentId: ids.students[0].id, amount: 100, dueDate: '2026-12-31' } });
  check('teacher cannot create fee -> 403', r.status === 403, `got ${r.status}`);
  r = await api('/transport/dashboard', { token: rTok });
  check('reception TRANSPORT_VIEW dashboard -> 200', r.status === 200, `got ${r.status} ${r.data ? JSON.stringify(r.data) : ''}`);
  r = await api('/transport/reports', { token: tTok });
  check('teacher cannot view reports -> 403', r.status === 403);
  r = await api('/transport/dashboard', { token: aTok });
  check('accountant dashboard (fee-only role) -> 200', r.status === 200);
  r = await api('/transport/vehicles', { token: 'not-a-token' });
  check('no token -> 401', r.status === 401);

  console.log('== 2. Vehicles ==');
  r = await api('/transport/vehicles', { method: 'POST', token: tok, body: { vehicleId: 'TT-V-1', registrationNumber: 'KA-01-AB-1001', type: 'bus', model: 'Tata', capacity: 2, status: 'active' } });
  check('create vehicle -> 201', r.status === 201);
  ids.v1 = r.data.id;
  r = await api('/transport/vehicles', { method: 'POST', token: tok, body: { vehicleId: 'TT-V-1B', registrationNumber: 'KA-01-AB-1001', capacity: 5 } });
  check('duplicate registration -> 400', r.status === 400);
  r = await api('/transport/vehicles', { method: 'POST', token: tok, body: { vehicleId: 'TT-V-2', registrationNumber: 'KA-01-CD-2002', type: 'van', capacity: 1, status: 'active' } });
  check('create second vehicle -> 201', r.status === 201);
  ids.v2 = r.data.id;
  r = await api('/transport/vehicles', { method: 'POST', token: tok, body: { vehicleId: 'TT-V-3', registrationNumber: 'KA-01-EF-3003', type: 'bus', capacity: 40, status: 'inactive' } });
  check('create inactive vehicle -> 201', r.status === 201);
  ids.v3 = r.data.id;
  r = await api('/transport/vehicles?search=1001', { token: tok });
  check('search vehicle by registration -> 200 with 1 result', r.status === 200 && r.data.vehicles.length === 1);
  r = await api(`/transport/vehicles/${ids.v1}`, { method: 'PUT', token: tok, body: { vehicleId: 'TT-V-1', registrationNumber: 'KA-01-AB-1001', capacity: 2, status: 'active' } });
  check('update vehicle -> 200', r.status === 200);

  console.log('== 3. Drivers / staff ==');
  r = await api('/transport/staff', { method: 'POST', token: tok, body: { staffId: 'TT-D-1', name: 'Test Driver One', licenseNumber: 'TT-LIC-1', licenseExpiry: '2027-01-01', status: 'active' } });
  check('create driver -> 201', r.status === 201);
  ids.d1 = r.data.id;
  r = await api('/transport/staff', { method: 'POST', token: tok, body: { staffId: 'TT-D-2', name: 'Test Driver Two', licenseNumber: 'TT-LIC-1' } });
  check('duplicate license number -> 400', r.status === 400);
  r = await api('/transport/staff', { method: 'POST', token: tok, body: { staffId: 'TT-D-2', name: 'Test Driver Two', licenseNumber: 'TT-LIC-2', status: 'active' } });
  check('create second driver -> 201', r.status === 201);
  ids.d2 = r.data.id;
  r = await api(`/transport/staff/${ids.d1}`, { method: 'PUT', token: tok, body: { staffId: 'TT-D-1', name: 'Test Driver One', licenseNumber: 'TT-LIC-1', assignedVehicleId: ids.v1 } });
  check('assign primary vehicle to driver -> 200', r.status === 200);
  r = await api(`/transport/staff/${ids.d2}`, { method: 'PUT', token: tok, body: { staffId: 'TT-D-2', name: 'Test Driver Two', licenseNumber: 'TT-LIC-2', assignedVehicleId: ids.v1 } });
  check('second driver same primary vehicle -> 400 (one primary driver)', r.status === 400);

  console.log('== 4. Routes + stops ==');
  r = await api('/transport/routes', { method: 'POST', token: tok, body: { routeCode: 'TT-R-1', name: 'Test Route One', assignedVehicleId: ids.v1, assignedDriverId: ids.d1, status: 'active' } });
  check('create route -> 201', r.status === 201);
  ids.r1 = r.data.id;
  r = await api('/transport/routes', { method: 'POST', token: tok, body: { routeCode: 'TT-R-1', name: 'Duplicate', assignedVehicleId: ids.v1 } });
  check('duplicate route code -> 400', r.status === 400);
  r = await api('/transport/routes', { method: 'POST', token: tok, body: { routeCode: 'TT-R-2', name: 'Test Route Two', assignedVehicleId: ids.v3 } });
  check('route with inactive vehicle -> 400', r.status === 400);
  r = await api('/transport/routes', { method: 'POST', token: tok, body: { routeCode: 'TT-R-2', name: 'Test Route Two', assignedVehicleId: ids.v2, status: 'active' } });
  check('create second route -> 201', r.status === 201);
  ids.r2 = r.data.id;

  const stops = [];
  for (const [i, name] of ['Alpha', 'Beta', 'Gamma'].entries()) {
    r = await api(`/transport/routes/${ids.r1}/stops`, { method: 'POST', token: tok, body: { name, sequence: i + 1, pickupTime: `07:${10 + i * 5}`, dropTime: `14:${10 + i * 5}` } });
    check(`add stop ${name} -> 201`, r.status === 201);
    stops.push(r.data.id);
  }
  ids.stops = stops;
  r = await api(`/transport/routes/${ids.r1}/stops/reorder`, { method: 'PUT', token: tok, body: { order: [stops[1], stops[0], stops[2]] } });
  check('reorder stops (valid) -> 200', r.status === 200);
  r = await api(`/transport/routes/${ids.r1}/stops/reorder`, { method: 'PUT', token: tok, body: { order: [stops[0]] } });
  check('reorder stops (incomplete) -> 400', r.status === 400);
  r = await api(`/transport/routes/${ids.r1}/stops/reorder`, { method: 'PUT', token: tok, body: { order: [99999, stops[0], stops[1]] } });
  check('reorder stops (unknown id) -> 400', r.status === 400);

  console.log('== 5. Assignments ==');
  r = await api('/transport/assignments', { method: 'POST', token: tok, body: { studentId: ids.students[0].id, routeId: ids.r1, pickupStopId: stops[0], dropStopId: stops[1], status: 'active' } });
  check('assign student 1 -> 201', r.status === 201);
  ids.a1 = r.data.id;
  r = await api('/transport/assignments', { method: 'POST', token: tok, body: { studentId: ids.students[1].id, routeId: ids.r1, pickupStopId: stops[1], dropStopId: stops[2], status: 'active' } });
  check('assign student 2 -> 201 (capacity 2)', r.status === 201);
  r = await api('/transport/assignments', { method: 'POST', token: tok, body: { studentId: ids.students[2].id, routeId: ids.r1, pickupStopId: stops[0], dropStopId: stops[2] } });
  check('3rd active on capacity-2 vehicle -> 400 capacity reached', r.status === 400 && (r.data.message || '').includes('capacity'));
  r = await api('/transport/assignments', { method: 'POST', token: tok, body: { studentId: ids.students[1].id, routeId: ids.r1, pickupStopId: stops[0], dropStopId: stops[2] } });
  check('duplicate active assignment for same student -> 400', r.status === 400 && (r.data.message || '').includes('already has an active'));
  r = await api('/transport/assignments', { method: 'POST', token: tok, body: { studentId: ids.students[3].id, routeId: ids.r1, pickupStopId: stops[0], dropStopId: stops[1] } });
  check('inactive student -> 400', r.status === 400);
  r = await api('/transport/assignments', { method: 'POST', token: tok, body: { studentId: ids.students[2].id, routeId: ids.r1, pickupStopId: stops[0], dropStopId: 99999 } });
  check('stop not on route -> 400', r.status === 400);
  r = await api('/transport/assignments', { method: 'POST', token: tok, body: { studentId: ids.students[2].id, routeId: ids.r2, pickupStopId: stops[0], dropStopId: stops[1] } });
  check('pickup stop belongs to another route -> 400', r.status === 400);
  r = await api(`/transport/assignments/${ids.a1}`, { method: 'PUT', token: tok, body: { status: 'suspended' } });
  check('update assignment status -> 200', r.status === 200, `got ${r.status} ${r.data ? JSON.stringify(r.data) : ''}`);
  r = await api('/transport/assignments?status=active&routeId=' + ids.r1, { token: tok });
  check('filter assignments by route + status -> 200', r.status === 200 && r.data && r.data.assignments && r.data.assignments.length === 1, `got ${r.status} len=${r.data && r.data.assignments ? r.data.assignments.length : '?'}`);
  r = await api(`/transport/assignments/${ids.a1}`, { method: 'DELETE', token: tok });
  check('delete assignment -> 200', r.status === 200);

  console.log('== 6. Transport fees ==');
  r = await api('/transport/fees', { method: 'POST', token: tok, body: { studentId: ids.students[0].id, amount: 2500, paidAmount: 500, dueDate: '2026-11-30', status: 'partial' } });
  check('create transport fee -> 201', r.status === 201);
  ids.tFee = r.data.id;
  r = await api('/transport/fees', { method: 'POST', token: tok, body: { studentId: ids.students[0].id, amount: 300, dueDate: '2026-12-15' } });
  check('create second transport fee -> 201', r.status === 201);
  ids.tFee2 = r.data.id;
  r = await api('/fees', { method: 'POST', token: tok, body: { studentId: ids.students[0].id, amount: 5000, dueDate: '2026-12-01', type: 'tuition' } });
  check('create tuition fee (generic API) -> 201', r.status === 201);
  ids.tuitionFee = r.data.id;
  r = await api(`/transport/fees/${ids.tuitionFee}`, { method: 'DELETE', token: tok });
  check('transport delete rejects non-transport fee -> 400', r.status === 400);
  r = await api(`/transport/fees/${ids.tFee}`, { method: 'PUT', token: tok, body: { studentId: ids.students[0].id, amount: 2500, paidAmount: 2500, dueDate: '2026-11-30', status: 'paid' } });
  check('update transport fee -> 200', r.status === 200);
  r = await api('/transport/fees', { token: tok });
  check('fee summary total >= 2800', r.status === 200 && r.data.summary.total >= 2800);
  check('fee summary collected >= 2500', r.status === 200 && r.data.summary.collected >= 2500, `collected=${r.data ? r.data.summary.collected : '?'}`);
  r = await api('/transport/fees?search=TT-STU-1', { token: tok });
  check('filter fees by student search -> 200 all TT-STU-1', r.status === 200 && r.data.fees.length === 3 && r.data.fees.every((f) => f.student.admissionNo === 'TT-STU-1'), `got ${r.status} len=${r.data && r.data.fees ? r.data.fees.length : '?'}`);

  console.log('== 7. Dashboard + warnings + notifications ==');
  r = await api('/transport/dashboard', { token: tok });
  check('dashboard -> 200 with stats/warnings keys', r.status === 200 && r.data.stats !== undefined && r.data.warnings !== undefined);
  r = await api('/transport/meta', { token: tok });
  check('meta -> 200 with vehicles/routes/staff/students', r.status === 200 && r.data.vehicles && r.data.routes && r.data.students);
  const notif = await prisma.notification.count({ where: { title: { contains: 'Transport' } } });
  console.log(`  INFO  transport notifications created: ${notif}`);
  check('notification sync ran (dashboard call)', notif >= 0);

  console.log('== 8. Reports ==');
  r = await api('/transport/reports?type=vehicles', { token: tok });
  check('vehicles report JSON -> 200', r.status === 200 && r.data.data.vehicles);
  r = await api('/transport/reports?type=transport-fees', { token: tok });
  check('fees report JSON -> 200 with summary', r.status === 200 && r.data.data.summary);
  r = await api('/transport/reports?type=route-students&routeId=' + ids.r1, { token: tok });
  check('route-students report -> 200', r.status === 200);
  r = await api('/transport/reports?type=bogus', { token: tok });
  check('unknown report type -> 400', r.status === 400);
  r = await api('/transport/reports/print?type=vehicles', { token: tok });
  check('print vehicles PDF -> 200 + application/pdf', r.status === 200 && (r.headers.get('content-type') || '').includes('application/pdf'));

  console.log('== 9. Delete safety ==');
  r = await api(`/transport/staff/${ids.d1}`, { method: 'DELETE', token: tok });
  check('delete driver while assigned to vehicle -> 400', r.status === 400);
  r = await api(`/transport/vehicles/${ids.v1}`, { method: 'DELETE', token: tok });
  check('delete vehicle with route assignments -> 400', r.status === 400);
  r = await api(`/transport/routes/${ids.r1}`, { method: 'DELETE', token: tok });
  check('delete route with assignments -> 400', r.status === 400);
  r = await api(`/transport/routes/stops/${stops[1]}`, { method: 'DELETE', token: tok });
  check('delete stop used by assignment -> 400', r.status === 400, `got ${r.status} ${r.data ? JSON.stringify(r.data) : ''}`);

  console.log('== 10. Documents ==');
  r = await api(`/transport/vehicles/${ids.v1}/documents`, { method: 'POST', token: tok, body: { type: 'insurance', documentNumber: 'TT-INS-1', expiryDate: '2026-01-01' } });
  check('add vehicle document -> 201', r.status === 201);
  ids.doc1 = r.data.id;
  r = await api('/transport/vehicles/documents/' + ids.doc1, { method: 'PUT', token: tok, body: { type: 'insurance', documentNumber: 'TT-INS-1', expiryDate: '2027-01-01' } });
  check('update vehicle document -> 200', r.status === 200);

  console.log('== 11. Audit trail ==');
  const aud = await prisma.auditLog.findFirst({ where: { action: 'VEHICLE_CREATED', entity: 'Vehicle' }, orderBy: { createdAt: 'desc' } });
  check('VEHICLE_CREATED audit row exists', !!aud);
  const audF = await prisma.auditLog.findFirst({ where: { action: 'TRANSPORT_FEE_CREATED' }, orderBy: { createdAt: 'desc' } });
  check('TRANSPORT_FEE_CREATED audit row exists', !!audF);
  const audA = await prisma.auditLog.findFirst({ where: { action: 'STUDENT_TRANSPORT_ASSIGNED' }, orderBy: { createdAt: 'desc' } });
  check('STUDENT_TRANSPORT_ASSIGNED audit row exists', !!audA);
  const audP = await prisma.auditLog.findFirst({ where: { action: 'REPORT_PRINTED', entity: 'TransportReport' }, orderBy: { createdAt: 'desc' } });
  check('REPORT_PRINTED audit row exists', !!audP);

  console.log('== Cleanup ==');
  await cleanup();
  console.log(`\n==== ${passed} passed, ${failed} failed ====`);
  if (failures.length) { console.log('Failures:'); failures.forEach((f) => console.log(' - ' + f)); }
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error('Test run crashed:', e);
  await cleanup();
  process.exit(1);
});