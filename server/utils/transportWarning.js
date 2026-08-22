const prisma = require('../config/db');
const logger = require('../utils/logger');

const DEFAULT_EXPIRY_WARNING_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const expiryWarningDays = () => {
  const n = parseInt(process.env.TRANSPORT_EXPIRY_WARNING_DAYS, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EXPIRY_WARNING_DAYS;
};

const expiryStatus = (date, days = expiryWarningDays()) => {
  if (!date) return null;
  const expiry = new Date(date);
  const diff = Math.floor((expiry.getTime() - Date.now()) / DAY_MS);
  if (diff < 0) return 'expired';
  if (diff <= days) return 'expiring';
  return 'valid';
};

const statusLabel = {
  expired: 'Expired',
  expiring: 'Expiring Soon',
  valid: 'Valid',
};

const getVehicleDocumentWarnings = async () => {
  const docs = await prisma.vehicleDocument.findMany({
    where: { expiryDate: { not: null } },
    include: { vehicle: { select: { id: true, vehicleId: true, registrationNumber: true, model: true } } },
    orderBy: { expiryDate: 'asc' },
  });
  return docs
    .map((doc) => ({
      id: doc.id,
      vehicleId: doc.vehicle.id,
      vehicleName: doc.vehicle.vehicleId,
      registrationNumber: doc.vehicle.registrationNumber,
      type: doc.type,
      documentNumber: doc.documentNumber,
      expiryDate: doc.expiryDate,
      status: expiryStatus(doc.expiryDate),
      daysRemaining: Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / DAY_MS),
    }))
    .filter((w) => w.status === 'expired' || w.status === 'expiring');
};

const getLicenseWarnings = async () => {
  const staff = await prisma.transportStaff.findMany({
    where: { licenseExpiry: { not: null } },
    select: { id: true, staffId: true, name: true, licenseNumber: true, licenseExpiry: true, status: true },
  });
  return staff
    .map((s) => ({
      id: s.id,
      staffId: s.staffId,
      name: s.name,
      licenseNumber: s.licenseNumber,
      licenseExpiry: s.licenseExpiry,
      status: expiryStatus(s.licenseExpiry),
      daysRemaining: Math.ceil((new Date(s.licenseExpiry).getTime() - Date.now()) / DAY_MS),
    }))
    .filter((w) => w.status === 'expired' || w.status === 'expiring');
};

const getCapacityWarnings = async () => {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: 'active' },
    include: { routes: { where: { status: 'active' }, select: { id: true } } },
  });
  const routeIds = vehicles.flatMap((v) => v.routes.map((r) => r.id));
  const counts = routeIds.length
    ? await prisma.studentTransportAssignment.groupBy({
        by: ['routeId'],
        where: { routeId: { in: routeIds }, status: 'active' },
        _count: { _all: true },
      })
    : [];
  const countByRoute = Object.fromEntries(counts.map((c) => [c.routeId, c._count._all]));
  return vehicles
    .map((v) => {
      const assigned = v.routes.reduce((sum, r) => sum + (countByRoute[r.id] || 0), 0);
      const remaining = Math.max(0, v.capacity - assigned);
      return { vehicleId: v.id, vehicleName: v.vehicleId, registrationNumber: v.registrationNumber, capacity: v.capacity, assigned, remaining };
    })
    .filter((w) => w.remaining <= Math.max(1, Math.round(w.capacity * 0.15)));
};

const getRoutesWithoutVehicle = async () => {
  const routes = await prisma.transportRoute.findMany({
    where: { status: 'active', assignedVehicleId: null },
    select: { id: true, routeCode: true, name: true },
  });
  return routes;
};

const getUnassignedTransportStudents = async () => {
  const [withAssignment, totalActive] = await Promise.all([
    prisma.studentTransportAssignment.findMany({
      where: { status: 'active' },
      select: { studentId: true },
    }),
    prisma.student.count({ where: { isActive: true } }),
  ]);
  const assignedIds = new Set(withAssignment.map((a) => a.studentId));
  return Math.max(0, totalActive - assignedIds.size);
};

const getOverdueTransportFees = async () => {
  const fees = await prisma.fee.findMany({
    where: { type: 'transport', status: { in: ['pending', 'partial', 'overdue'] }, dueDate: { lt: new Date() } },
    include: { student: { select: { id: true, name: true, admissionNo: true } } },
    orderBy: { dueDate: 'asc' },
  });
  return fees.map((f) => ({
    id: f.id,
    studentId: f.student.id,
    studentName: f.student.name,
    admissionNo: f.student.admissionNo,
    amount: Number(f.amount),
    paidAmount: Number(f.paidAmount),
    dueAmount: Math.max(0, Number(f.amount) - Number(f.paidAmount)),
    dueDate: f.dueDate,
    status: f.status,
  }));
};

const syncTransportNotifications = async () => {
  try {
    const warnings = await Promise.all([
      getVehicleDocumentWarnings(),
      getLicenseWarnings(),
      getOverdueTransportFees(),
      getCapacityWarnings(),
      getRoutesWithoutVehicle(),
    ]);
    const [docWarnings, licenseWarnings, overdueFees, capacityWarnings, routesWithoutVehicle] = warnings;

    const items = [
      ...docWarnings.map((w) => ({
        title: `Vehicle ${w.type} ${w.status === 'expired' ? 'expired' : 'expiring'}: ${w.vehicleName} (${w.registrationNumber})`,
        message: `${w.type.charAt(0).toUpperCase() + w.type.slice(1)} ${w.status === 'expired' ? 'expired on' : 'expires in'} ${w.status === 'expired' ? new Date(w.expiryDate).toLocaleDateString('en-IN') : `${w.daysRemaining} day(s)`} (${new Date(w.expiryDate).toLocaleDateString('en-IN')}).`,
        type: w.status === 'expired' ? 'error' : 'warning',
        targetRole: 'PRINCIPAL',
      })),
      ...licenseWarnings.map((w) => ({
        title: `Driver license ${w.status === 'expired' ? 'expired' : 'expiring'}: ${w.name} (${w.staffId})`,
        message: `License ${w.status === 'expired' ? 'expired on' : 'expires in'} ${w.status === 'expired' ? new Date(w.licenseExpiry).toLocaleDateString('en-IN') : `${w.daysRemaining} day(s)`} (${new Date(w.licenseExpiry).toLocaleDateString('en-IN')}).`,
        type: w.status === 'expired' ? 'error' : 'warning',
        targetRole: 'PRINCIPAL',
      })),
      ...capacityWarnings.map((w) => ({
        title: `Vehicle capacity nearly full: ${w.vehicleName} (${w.registrationNumber})`,
        message: `${w.remaining === 0 ? 'No seats remaining' : `${w.remaining} seat(s) remaining`} out of ${w.capacity} capacity.`,
        type: 'warning',
        targetRole: 'PRINCIPAL',
      })),
      ...routesWithoutVehicle.map((r) => ({
        title: `Route without vehicle: ${r.name} (${r.routeCode})`,
        message: 'This active route has no vehicle assigned. Assign a vehicle to avoid scheduling issues.',
        type: 'warning',
        targetRole: 'PRINCIPAL',
      })),
      ...overdueFees.map((f) => ({
        title: `Transport fee overdue: ${f.studentName} (${f.admissionNo})`,
        message: `₹${f.dueAmount.toFixed(2)} overdue since ${new Date(f.dueDate).toLocaleDateString('en-IN')}.`,
        type: 'error',
        targetRole: 'ACCOUNTANT',
      })),
    ];

    let created = 0;
    for (const item of items) {
      const existing = await prisma.notification.findFirst({ where: { title: item.title, isRead: false } });
      if (existing) continue;
      await prisma.notification.create({ data: item });
      created += 1;
    }
    return created;
  } catch (error) {
    logger.error('Transport notification sync error:', error);
    return 0;
  }
};

module.exports = {
  expiryStatus,
  expiryWarningDays,
  getVehicleDocumentWarnings,
  getLicenseWarnings,
  getCapacityWarnings,
  getRoutesWithoutVehicle,
  getUnassignedTransportStudents,
  getOverdueTransportFees,
  syncTransportNotifications,
  statusLabel,
};
