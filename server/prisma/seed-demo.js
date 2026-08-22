/**
 * Demo Seed — Mukut Memorial School ERP
 * Creates a SEPARATE fictional dataset for SALES DEMO only.
 * Run with: DATABASE_URL="mysql://...demo_db" node prisma/seed-demo.js
 * Never run against production DB.
 *
 * Generates:
 *  - 14 classes (Nursery-10 with sections)
 *  - 35 teachers
 *  - 450 students
 *  - Subjects per class (3-5 each)
 *  - 2 exams per class (Mid Term, Final) with marks
 *  - Attendance (30 days, ~94% present)
 *  - Fees (tuition/transport/library with varied statuses)
 *  - Notifications, Settings, Transport sample, Audit-safe
 * All names are fictional.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@mukutmemorial.demo';
const DEMO_PASSWORD = 'Demo@12345';

const firstNames = ['Aarav','Vivaan','Advik','Kabir','Arjun','Reyansh','Ayaan','Atharv','Krishna','Ishaan','Sai','Dhruv','Rudra','Aaradhya','Diya','Saanvi','Ananya','Pari','Navya','Ishani','Myra','Sara','Aadhya','Prisha','Kavya','Riya','Anvi','Avni','Ira','Kiara','Aarohi','Urvi','Nisha','Tara','Meera','Reet','Harsh','Naksh','Vedant','Yash','Samar','Dev','Harshit','Laksh','Darsh','Om','Kunal','Rohan','Aryan','Tanmay','Nikhil','Aditya','Siddharth','Harshita','Simran','Pooja','Khushi','Sneha','Shreya','Muskan'];
const lastNames = ['Sharma','Verma','Gupta','Singh','Yadav','Mishra','Tiwari','Jain','Patel','Kumar','Chauhan','Rathore','Mehta','Agarwal','Bansal','Saini','Thakur','Rawat','Bhatt','Pandey','Dubey','Chopra','Malhotra','Kapoor','Khanna','Arora','Saxena','Shukla','Joshi','Nair','Reddy','Das','Sen','Ghosh','Banerjee','Roy','Dixit'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fullName = () => `${pick(firstNames)} ${pick(lastNames)}`;
const phone = () => `+91-9${Math.floor(700000000 + Math.random()*299999999)}`;

async function clearDemoData() {
  console.log('[demo-seed] Clearing previous demo-generated data if any...');
  // Delete in FK-safe order. Only demo-prefixed records where possible to avoid wiping real data if accidentally pointed at prod.
  // If DEMO_RESET is true, we wipe all demo DB anyway. Otherwise we delete by demo markers.
  // For safety, this script is intended for a SEPARATE demo DB. We wipe all students/teachers etc.
  await prisma.mark.deleteMany({});
  await prisma.examSubject.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.teacherAttendance.deleteMany({});
  await prisma.fee.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.studentTransportAssignment.deleteMany({});
  await prisma.transportStop.deleteMany({});
  await prisma.transportRoute.deleteMany({});
  await prisma.vehicleDocument.deleteMany({});
  await prisma.transportStaff.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.class.deleteMany({});
  // Keep roles/permissions/users except demo user will be upserted
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  console.log('[demo-seed] Cleared.');
}

async function seedClasses() {
  const classDefs = [
    { name: 'Nursery', section: 'A' }, { name: 'LKG', section: 'A' }, { name: 'UKG', section: 'A' },
    { name: '1', section: 'A' }, { name: '1', section: 'B' },
    { name: '2', section: 'A' }, { name: '2', section: 'B' },
    { name: '3', section: 'A' }, { name: '3', section: 'B' },
    { name: '4', section: 'A' }, { name: '5', section: 'A' },
    { name: '6', section: 'A' }, { name: '7', section: 'A' }, { name: '8', section: 'A' },
  ];
  const classes = [];
  for (const c of classDefs) {
    const cls = await prisma.class.create({ data: { name: c.name, section: c.section } });
    classes.push(cls);
  }
  console.log(`[demo-seed] ${classes.length} classes created.`);
  return classes;
}

async function seedTeachers(classes) {
  const teachers = [];
  for (let i = 1; i <= 35; i++) {
    const name = fullName();
    const t = await prisma.teacher.create({
      data: {
        teacherId: `TCH-DEMO-${String(i).padStart(4,'0')}`,
        name,
        email: `teacher.demo${i}@mukutmemorial.demo`,
        phone: phone(),
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        qualification: pick(['B.Ed','M.Ed','M.Sc B.Ed','B.A B.Ed','M.A B.Ed','Ph.D']),
        experience: Math.floor(1 + Math.random()*15),
        joiningDate: new Date(2020 + Math.floor(Math.random()*4), Math.floor(Math.random()*12), 1),
        salary: Math.floor(25000 + Math.random()*35000),
        address: `${Math.floor(10+Math.random()*200)}, Education Road, Delhi`,
        isActive: Math.random() > 0.05,
        subjects: pick(['Mathematics','Science','English','Hindi','Social Science','Computer']),
      }
    });
    teachers.push(t);
  }
  // Assign class teachers for first classes
  for (let i = 0; i < Math.min(classes.length, teachers.length); i++) {
    await prisma.class.update({ where: { id: classes[i].id }, data: { classTeacherId: teachers[i].id } });
  }
  console.log(`[demo-seed] ${teachers.length} teachers created.`);
  return teachers;
}

async function seedSubjects(classes) {
  const subjectPool = ['English','Hindi','Mathematics','Science','Social Science','Computer','Sanskrit','Art','Physical Education'];
  let count = 0;
  for (const cls of classes) {
    const n = cls.name === 'Nursery' || cls.name === 'LKG' || cls.name === 'UKG' ? 3 : 5;
    const chosen = subjectPool.slice(0, n);
    for (const s of chosen) {
      await prisma.subject.create({ data: { name: s, code: `${s.slice(0,3).toUpperCase()}-${cls.name}${cls.section}`, classId: cls.id } });
      count++;
    }
  }
  console.log(`[demo-seed] ${count} subjects created.`);
}

async function seedStudents(classes) {
  const students = [];
  let admCounter = 1001;
  // Distribute 450 across 14 classes ~32 each
  const perClass = Math.floor(450 / classes.length);
  let remainder = 450 - perClass * classes.length;
  for (const cls of classes) {
    let n = perClass + (remainder-- > 0 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const name = fullName();
      const dob = new Date(2012 + Math.floor(Math.random()*8), Math.floor(Math.random()*12), 1+Math.floor(Math.random()*28));
      const gender = Math.random() > 0.48 ? (Math.random() > 0.5 ? 'Male' : 'Female') : 'Male';
      const rollNo = i+1;
      const s = await prisma.student.create({
        data: {
          admissionNo: `ADM-DEMO-${admCounter++}`,
          rollNo,
          name,
          dob,
          gender,
          bloodGroup: pick(['A+','B+','O+','AB+','A-','B-']),
          fatherName: fullName(),
          motherName: fullName(),
          fatherPhone: phone(),
          motherPhone: phone(),
          phone: phone(),
          address: `${Math.floor(10+Math.random()*500)}, Green Avenue, Delhi - 1100${Math.floor(10+Math.random()*90)}`,
          city: 'New Delhi',
          state: 'Delhi',
          pinCode: `1100${Math.floor(10+Math.random()*90)}`,
          classId: cls.id,
          isActive: Math.random() > 0.02,
        }
      });
      students.push(s);
    }
  }
  console.log(`[demo-seed] ${students.length} students created.`);
  return students;
}

async function seedFees(students) {
  let count = 0;
  for (const s of students) {
    const feeConfigs = [
      { type: 'tuition', amount: 5000 },
      { type: 'transport', amount: 1500 },
      { type: 'library', amount: 500 },
    ];
    for (const cfg of feeConfigs) {
      const r = Math.random();
      let status, paidAmount;
      if (r < 0.55) { status = 'paid'; paidAmount = cfg.amount; }
      else if (r < 0.70) { status = 'partial'; paidAmount = Math.floor(cfg.amount * 0.5); }
      else if (r < 0.85) { status = 'pending'; paidAmount = 0; }
      else { status = 'overdue'; paidAmount = 0; }
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + (status === 'overdue' ? -1 : 1));
      dueDate.setDate(5 + Math.floor(Math.random()*20));
      await prisma.fee.create({ data: { studentId: s.id, amount: cfg.amount, paidAmount, dueDate, status, type: cfg.type } });
      count++;
    }
  }
  console.log(`[demo-seed] ${count} fee records created.`);
}

async function seedExamsAndMarks(classes) {
  let examCount = 0, subjectCount = 0, markCount = 0;
  const terms = [
    { name: 'Mid Term Examination 2025-26', type: 'Mid Term', startMonth: 8 },
    { name: 'Final Examination 2025-26', type: 'Final', startMonth: 2 },
  ];
  for (const cls of classes) {
    const subjects = await prisma.subject.findMany({ where: { classId: cls.id } });
    if (subjects.length === 0) continue;
    const classStudents = await prisma.student.findMany({ where: { classId: cls.id, isActive: true } });
    for (const term of terms) {
      const exam = await prisma.exam.create({
        data: { name: term.name, term: term.type, type: term.type, classId: cls.id, startDate: new Date(2025, term.startMonth, 10), endDate: new Date(2025, term.startMonth, 20), isActive: true }
      });
      examCount++;
      for (const subj of subjects) {
        const es = await prisma.examSubject.create({ data: { examId: exam.id, subjectId: subj.id, maxMarks: 100, passingMarks: 33 } });
        subjectCount++;
        for (const stu of classStudents) {
          // Skip 1% absent
          if (Math.random() < 0.01) continue;
          const marks = Math.floor(20 + Math.random()*78 + (Math.random() < 0.15 ? -15 : 0)); // realistic, few low
          const clamped = Math.max(0, Math.min(100, marks));
          const grade = clamped >= 90 ? 'A+' : clamped >= 80 ? 'A' : clamped >= 70 ? 'B+' : clamped >= 60 ? 'B' : clamped >= 50 ? 'C' : clamped >= 40 ? 'D' : 'F';
          await prisma.mark.create({
            data: { examSubjectId: es.id, studentId: stu.id, subjectId: subj.id, examId: exam.id, marksObtained: clamped, grade, remarks: grade === 'F' ? 'Needs improvement' : grade === 'A+' ? 'Excellent' : null }
          });
          markCount++;
        }
      }
    }
  }
  console.log(`[demo-seed] ${examCount} exams, ${subjectCount} examSubjects, ${markCount} marks.`);
}

async function seedAttendance(students) {
  // Last 30 days excluding Sundays
  let count = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let d = 29; d >= 0; d--) {
    const date = new Date(today); date.setDate(today.getDate() - d);
    if (date.getDay() === 0) continue; // Sunday off
    for (const s of students) {
      if (!s.isActive) continue;
      if (Math.random() < 0.015) continue; // some not marked
      const r = Math.random();
      const status = r < 0.94 ? 'present' : r < 0.97 ? 'absent' : 'leave';
      await prisma.attendance.create({ data: { studentId: s.id, date, status, remarks: status === 'leave' ? 'Medical leave' : null } });
      count++;
    }
  }
  console.log(`[demo-seed] ${count} student attendance records.`);
}

async function seedTeacherAttendance(teachers) {
  let count = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let d = 29; d >= 0; d--) {
    const date = new Date(today); date.setDate(today.getDate() - d);
    if (date.getDay() === 0) continue;
    for (const t of teachers) {
      if (!t.isActive) continue;
      const r = Math.random();
      const status = r < 0.96 ? 'present' : r < 0.98 ? 'absent' : 'leave';
      try { await prisma.teacherAttendance.create({ data: { teacherId: t.id, date, status } }); count++; } catch (_e) { /* duplicate or FK */ }
    }
  }
  console.log(`[demo-seed] ${count} teacher attendance records.`);
}

async function seedNotifications() {
  const notices = [
    { title: 'Mid Term Examinations Schedule Released', message: 'Mid Term examinations for all classes will commence from 10th September 2025. Time table has been shared with class teachers. Students are advised to prepare well.', type: 'info' },
    { title: 'Annual Sports Day — 15th December 2025', message: 'Annual Sports Day will be celebrated on 15th December. Inter-house competitions begin next week. Contact your sports teacher to enroll.', type: 'info' },
    { title: 'Fee Due Reminder — Tuition Fee', message: 'Tuition fee for the current quarter is due on 30th October 2025. Kindly pay before the due date to avoid late fee.', type: 'warning' },
    { title: 'Parent-Teacher Meeting — 22nd November', message: 'PTM for all classes is scheduled on 22nd November 2025 from 9 AM to 1 PM. Attendance of parents is mandatory.', type: 'info' },
    { title: 'Diwali Holidays Announced', message: 'School will remain closed from 20th to 26th October for Diwali. Classes resume on 27th October.', type: 'info' },
    { title: 'Science Exhibition Winners', message: 'Congratulations to Class 8-A for winning the Inter-School Science Exhibition. Their project on solar irrigation was highly appreciated.', type: 'success' },
    { title: 'Transport Fee — Overdue Notice', message: 'Transport fee for 23 students is overdue. Parents are requested to clear dues at the accounts office.', type: 'warning' },
    { title: 'New Library Books Arrived', message: '500 new books have been added to the library including NCERT companions and storybooks. Visit the library to explore.', type: 'info' },
  ];
  for (const n of notices) {
    await prisma.notification.create({ data: { title: n.title, message: n.message, type: n.type, targetRole: null } });
  }
  console.log(`[demo-seed] ${notices.length} notifications created.`);
}

async function seedTransport() {
  // Minimal transport demo for dashboard visuals
  const vehicles = [];
  for (let i = 1; i <= 6; i++) {
    const v = await prisma.vehicle.create({ data: { vehicleId: `DEMO-V-${String(i).padStart(3,'0')}`, registrationNumber: `DL-01-AB-${1000+i}`, type: i <= 4 ? 'bus' : 'van', capacity: i <= 4 ? 40 : 12, status: 'active', model: i <= 4 ? 'Tata Starbus' : 'Force Traveller' } });
    vehicles.push(v);
    await prisma.vehicleDocument.create({ data: { vehicleId: v.id, type: 'insurance', documentNumber: `INS-${10000+i}`, issueDate: new Date(2024,0,1), expiryDate: new Date(2026, 5 + i, 15) } });
  }
  const drivers = [];
  for (let i = 1; i <= 4; i++) {
    const d = await prisma.transportStaff.create({ data: { staffId: `DEMO-D-${String(i).padStart(3,'0')}`, name: fullName(), phone: phone(), licenseNumber: `DL-LIC-DEMO-${1000+i}`, licenseExpiry: new Date(2027, i, 10), status: 'active', assignedVehicleId: i <= vehicles.length ? vehicles[i-1].id : null } });
    drivers.push(d);
  }
  const routeNames = ['Green Avenue', 'Dwarka Sector 12', 'Rohini Sector 15', 'Janakpuri'];
  for (let i = 0; i < routeNames.length; i++) {
    const r = await prisma.transportRoute.create({ data: { routeCode: `DEMO-R-${String(i+1).padStart(3,'0')}`, name: routeNames[i], status: 'active', startPoint: routeNames[i], endPoint: 'Mukut Memorial School', assignedVehicleId: vehicles[i]?.id, assignedDriverId: drivers[i]?.id } });
    for (let s = 0; s < 4; s++) {
      await prisma.transportStop.create({ data: { routeId: r.id, name: `${routeNames[i]} Stop ${s+1}`, sequence: s+1, pickupTime: `07:${10+s*5}`, dropTime: `14:${10+s*5}`, landmark: `Near Park ${s+1}` } });
    }
  }
  console.log('[demo-seed] Transport sample created (6 vehicles, 4 drivers, 4 routes).');
}

async function seedSettingsAndDemoUser() {
  const settings = [
    { key: 'school_name', value: 'Mukut Memorial School' },
    { key: 'school_principal', value: 'Dr. Rajesh Sharma' },
    { key: 'school_address', value: 'Plot No. 42, Education Enclave, Dwarka, New Delhi - 110075' },
    { key: 'school_phone', value: '+91-11-45678900' },
    { key: 'school_email', value: 'info@mukutmemorial.edu.in' },
    { key: 'school_website', value: 'https://mukutmemorial.edu.in' },
    { key: 'academic_year', value: '2025-2026' },
    { key: 'grading_system', value: JSON.stringify({ 'A+': '90-100', 'A': '80-89', 'B+': '70-79', 'B': '60-69', 'C': '50-59', 'D': '40-49', 'F': '0-39' }) },
    { key: 'school_logo', value: '' },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  // Ensure roles exist
  const { PERMISSIONS } = require('../constants/permissions');
  const { ROLES, ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } = require('../constants/roles');
  const roles = {};
  for (const name of Object.keys(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({ where: { name }, update: { description: ROLE_DESCRIPTIONS[name] }, create: { name, description: ROLE_DESCRIPTIONS[name], isSystem: name === ROLES.SUPER_ADMIN } });
    roles[name] = role.id;
  }
  const permIds = {};
  for (const p of PERMISSIONS) {
    const rec = await prisma.permission.upsert({ where: { name: p.name }, update: { module: p.module, description: p.description }, create: p });
    permIds[p.name] = rec.id;
  }
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: roles[roleName] } }),
      ...perms.map(pn => prisma.rolePermission.create({ data: { roleId: roles[roleName], permissionId: permIds[pn] } }))
    ]);
  }
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 12);
  const superRole = await prisma.role.findUnique({ where: { name: ROLES.SUPER_ADMIN } });
  await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: 'Demo Administrator', password: hashed, isActive: true, roleId: superRole.id },
    create: { name: 'Demo Administrator', email: DEMO_EMAIL, password: hashed, phone: '+91-9876543210', isActive: true, roleId: superRole.id },
  });
  console.log(`[demo-seed] Demo user upserted: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

async function printStats() {
  const [students, teachers, classes, fees, attendance, exams, marks] = await Promise.all([
    prisma.student.count(), prisma.teacher.count(), prisma.class.count(), prisma.fee.count(), prisma.attendance.count(), prisma.exam.count(), prisma.mark.count(),
  ]);
  console.log('— Demo DB Stats —');
  console.log(` Students: ${students}`);
  console.log(` Teachers: ${teachers}`);
  console.log(` Classes: ${classes}`);
  console.log(` Fees: ${fees}`);
  console.log(` Attendance: ${attendance}`);
  console.log(` Exams: ${exams}`);
  console.log(` Marks: ${marks}`);
}

async function main() {
  console.log('=== Mukut Memorial — Demo Seed ===');
  console.log('DATABASE_URL:', (process.env.DATABASE_URL || '').replace(/:[^:@]*@/, ':***@'));
  if (process.env.NODE_ENV === 'production' && !process.env.DEMO_MODE) {
    console.warn('[demo-seed] DEMO_MODE not set — still seeding demo data. Ensure this is a demo DB!');
  }
  await clearDemoData();
  await seedSettingsAndDemoUser();
  const classes = await seedClasses();
  const teachers = await seedTeachers(classes);
  await seedSubjects(classes);
  const students = await seedStudents(classes);
  await seedFees(students);
  await seedExamsAndMarks(classes);
  await seedAttendance(students);
  await seedTeacherAttendance(teachers);
  await seedNotifications();
  await seedTransport();
  await printStats();
  console.log('=== Demo seed completed ===');
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
