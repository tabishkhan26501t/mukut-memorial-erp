const prisma = require('../config/db');
const logger = require('../utils/logger');
const { logActivity } = require('../utils/audit');
const { getSettings, getLogoDataUri, formatDate, formatMoney, buildHeader, makePdf, sectionTitle } = require('../utils/pdf');
const { getVehicleDocumentWarnings, getLicenseWarnings } = require('../utils/transportWarning');

const sendPdf = (res, docDefinition, filename) => {
  const pdfDoc = makePdf(docDefinition);
  const chunks = [];
  pdfDoc.on('data', (chunk) => chunks.push(chunk));
  pdfDoc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(Buffer.concat(chunks));
  });
  pdfDoc.on('error', (error) => {
    logger.error('PDF generation error:', error);
    res.status(500).json({ message: 'PDF generation failed.' });
  });
  pdfDoc.end();
};

const buildTable = (headers, rows, widths = null) => ({
  layout: 'lightHorizontalLines',
  table: {
    headerRows: 1,
    widths: widths || headers.map(() => '*'),
    body: [
      headers.map((h) => ({ text: h, bold: true, fontSize: 9 })),
      ...rows.map((row) => row.map((cell) => ({ text: cell === null || cell === undefined ? '-' : cell, fontSize: 9 }))),
    ],
  },
});

// ------------------------------------------------------------------ Data

const reportVehicles = async () => {
  const vehicles = await prisma.vehicle.findMany({
    include: { driver: { select: { name: true, staffId: true } }, routes: { select: { id: true, name: true, status: true } }, documents: { select: { id: true, type: true, expiryDate: true } } },
    orderBy: { vehicleId: 'asc' },
  });
  return { vehicles };
};

const reportDrivers = async () => {
  const staff = await prisma.transportStaff.findMany({
    include: { assignedVehicle: { select: { vehicleId: true, registrationNumber: true } } },
    orderBy: { name: 'asc' },
  });
  return { staff };
};

const reportRoutes = async () => {
  const routes = await prisma.transportRoute.findMany({
    include: {
      assignedVehicle: { select: { vehicleId: true, registrationNumber: true } },
      assignedDriver: { select: { name: true, staffId: true } },
      stops: { orderBy: { sequence: 'asc' }, select: { name: true, sequence: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: { name: 'asc' },
  });
  return { routes };
};

const reportRouteStudents = async (query) => {
  const routeId = query.routeId ? parseInt(query.routeId, 10) : null;
  const assignments = await prisma.studentTransportAssignment.findMany({
    where: { ...(routeId ? { routeId } : {}), status: 'active' },
    include: {
      student: { select: { id: true, name: true, admissionNo: true, rollNo: true, class: { select: { name: true, section: true } } } },
      route: { select: { id: true, name: true, routeCode: true } },
      pickupStop: { select: { name: true } },
      dropStop: { select: { name: true } },
    },
    orderBy: [{ route: { name: 'asc' } }, { student: { name: 'asc' } }],
  });
  return { assignments };
};

const reportVehicleStudents = async () => {
  const assignments = await prisma.studentTransportAssignment.findMany({
    where: { status: 'active' },
    include: {
      student: { select: { id: true, name: true, admissionNo: true, class: { select: { name: true, section: true } } } },
      route: { select: { id: true, name: true, assignedVehicle: { select: { id: true, vehicleId: true, registrationNumber: true, capacity: true } } } },
    },
    orderBy: [{ route: { assignedVehicle: { vehicleId: 'asc' } } }, { student: { name: 'asc' } }],
  });
  return { assignments };
};

const reportTransportStudents = async () => {
  const assignments = await prisma.studentTransportAssignment.findMany({
    include: {
      student: { select: { id: true, name: true, admissionNo: true, class: { select: { name: true, section: true } } } },
      route: { select: { id: true, name: true, routeCode: true, assignedVehicle: { select: { vehicleId: true, registrationNumber: true } } } },
      pickupStop: { select: { name: true } },
      dropStop: { select: { name: true } },
    },
    orderBy: [{ student: { name: 'asc' } }],
  });
  return { assignments };
};

const reportTransportFees = async (query) => {
  const where = { type: 'transport' };
  if (query.status) where.status = query.status;
  if (query.classId) where.student = { classId: parseInt(query.classId, 10) };
  const fees = await prisma.fee.findMany({
    where,
    include: { student: { select: { id: true, name: true, admissionNo: true, class: { select: { name: true, section: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  const summary = fees.reduce((acc, f) => {
    acc.total += Number(f.amount) || 0;
    acc.collected += Number(f.paidAmount) || 0;
    return acc;
  }, { total: 0, collected: 0 });
  return { fees, summary: { ...summary, pending: summary.total - summary.collected } };
};

const reportExpiredDocuments = async () => {
  const docs = await getVehicleDocumentWarnings();
  return { documents: docs.filter((d) => d.status === 'expired') };
};

const reportExpiringDocuments = async () => {
  const docs = await getVehicleDocumentWarnings();
  return { documents: docs.filter((d) => d.status === 'expiring') };
};

const reportLicenseExpiries = async () => {
  const staff = await getLicenseWarnings();
  return { staff };
};

const REPORT_BUILDERS = {
  vehicles: reportVehicles,
  drivers: reportDrivers,
  routes: reportRoutes,
  'route-students': reportRouteStudents,
  'vehicle-students': reportVehicleStudents,
  'transport-students': reportTransportStudents,
  'transport-fees': reportTransportFees,
  'expired-documents': reportExpiredDocuments,
  'expiring-documents': reportExpiringDocuments,
  'license-expiries': reportLicenseExpiries,
};

const REPORT_LABELS = {
  vehicles: 'Vehicle List',
  drivers: 'Driver List',
  routes: 'Route List',
  'route-students': 'Route-wise Student List',
  'vehicle-students': 'Vehicle-wise Student List',
  'transport-students': 'Transport Student List',
  'transport-fees': 'Transport Fee Report',
  'expired-documents': 'Expired Vehicle Documents',
  'expiring-documents': 'Upcoming Vehicle Document Expirations',
  'license-expiries': 'Driver License Expiry Report',
};

const isTransportReportType = (type) => Object.prototype.hasOwnProperty.call(REPORT_BUILDERS, type);

const buildReportDoc = async (type, data) => {
  const settings = await getSettings();
  const logo = getLogoDataUri(settings.school_logo);
  const content = [
    ...buildHeader(settings, logo),
    { text: REPORT_LABELS[type], fontSize: 15, bold: true, alignment: 'center', margin: [0, 14, 0, 2], color: '#1e293b' },
    { text: `Generated on: ${formatDate(new Date())}`, fontSize: 8, alignment: 'center', color: '#64748b' },
  ];

  if (type === 'vehicles') {
    content.push(sectionTitle('Vehicles'));
    content.push(buildTable(['Vehicle ID', 'Registration', 'Type', 'Capacity', 'Status', 'Driver', 'Assigned Route'], data.vehicles.map((v) => [v.vehicleId, v.registrationNumber, v.type, v.capacity, v.status, v.driver ? v.driver.name : '-', v.routes.map((r) => r.name).join(', ') || '-']), ['15%', '18%', '10%', '10%', '12%', '18%', '17%']));
  } else if (type === 'drivers') {
    content.push(sectionTitle('Drivers / Transport Staff'));
    content.push(buildTable(['Staff ID', 'Name', 'Phone', 'License No', 'License Expiry', 'Status', 'Assigned Vehicle'], data.staff.map((s) => [s.staffId, s.name, s.phone || '-', s.licenseNumber || '-', formatDate(s.licenseExpiry), s.status, s.assignedVehicle ? s.assignedVehicle.vehicleId : '-']), ['12%', '20%', '13%', '15%', '15%', '12%', '13%']));
  } else if (type === 'routes') {
    content.push(sectionTitle('Routes'));
    content.push(buildTable(['Route Code', 'Route Name', 'Vehicle', 'Driver', 'Stops', 'Students', 'Status'], data.routes.map((r) => [r.routeCode, r.name, r.assignedVehicle ? r.assignedVehicle.vehicleId : '-', r.assignedDriver ? r.assignedDriver.name : '-', r.stops.map((s) => s.name).join(' -> ') || '-', r._count.assignments, r.status]), ['10%', '18%', '14%', '14%', '25%', '9%', '10%']));
  } else if (type === 'route-students') {
    content.push(sectionTitle('Route-wise Student List'));
    content.push(buildTable(['Student', 'Admission No', 'Class', 'Route', 'Pickup Stop', 'Drop Stop'], data.assignments.map((a) => [a.student.name, a.student.admissionNo, `${a.student.class ? a.student.class.name + (a.student.class.section ? ' - ' + a.student.class.section : '') : '-'}`, a.route.name, a.pickupStop.name, a.dropStop.name]), ['20%', '14%', '16%', '18%', '16%', '16%']));
  } else if (type === 'vehicle-students') {
    content.push(sectionTitle('Vehicle-wise Student List'));
    content.push(buildTable(['Vehicle', 'Registration', 'Capacity', 'Route', 'Student', 'Admission No', 'Class'], data.assignments.map((a) => [a.route.assignedVehicle ? a.route.assignedVehicle.vehicleId : '-', a.route.assignedVehicle ? a.route.assignedVehicle.registrationNumber : '-', a.route.assignedVehicle ? a.route.assignedVehicle.capacity : '-', a.route.name, a.student.name, a.student.admissionNo, a.student.class ? a.student.class.name : '-']), ['12%', '14%', '9%', '16%', '20%', '13%', '16%']));
  } else if (type === 'transport-students') {
    content.push(sectionTitle('Transport Student List'));
    content.push(buildTable(['Student', 'Admission No', 'Class', 'Route', 'Pickup', 'Drop', 'Status'], data.assignments.map((a) => [a.student.name, a.student.admissionNo, a.student.class ? a.student.class.name : '-', a.route.name, a.pickupStop.name, a.dropStop.name, a.status]), ['18%', '13%', '14%', '17%', '13%', '13%', '12%']));
  } else if (type === 'transport-fees') {
    content.push(sectionTitle('Transport Fee Report'));
    content.push(buildTable(['Student', 'Admission No', 'Class', 'Amount', 'Paid', 'Due', 'Due Date', 'Status'], data.fees.map((f) => [f.student.name, f.student.admissionNo, f.student.class ? f.student.class.name : '-', formatMoney(f.amount), formatMoney(f.paidAmount), formatMoney((Number(f.amount) || 0) - (Number(f.paidAmount) || 0)), formatDate(f.dueDate), f.status]), ['18%', '12%', '13%', '11%', '11%', '11%', '13%', '11%']));
    content.push(sectionTitle('Summary'));
    content.push(buildTable(['Total', 'Collected', 'Pending'], [[formatMoney(data.summary.total), formatMoney(data.summary.collected), formatMoney(data.summary.pending)]], ['33%', '33%', '34%']));
  } else if (type === 'expired-documents' || type === 'expiring-documents') {
    content.push(sectionTitle('Documents'));
    content.push(buildTable(['Vehicle', 'Registration', 'Document Type', 'Number', 'Expiry Date', 'Status'], data.documents.map((d) => [d.vehicleName, d.registrationNumber, d.type, d.documentNumber || '-', formatDate(d.expiryDate), d.status === 'expired' ? 'Expired' : 'Expiring']), ['14%', '16%', '18%', '18%', '18%', '16%']));
  } else if (type === 'license-expiries') {
    content.push(sectionTitle('Driver Licenses'));
    content.push(buildTable(['Staff ID', 'Name', 'License No', 'Expiry Date', 'Status'], data.staff.map((s) => [s.staffId, s.name, s.licenseNumber || '-', formatDate(s.licenseExpiry), s.status === 'expired' ? 'Expired' : 'Expiring']), ['14%', '22%', '22%', '20%', '22%']));
  }

  return { content };
};

const getReport = async (req, res) => {
  try {
    const type = req.query.type || 'vehicles';
    if (!isTransportReportType(type)) {
      return res.status(400).json({ message: `Unknown report type. Valid: ${Object.keys(REPORT_BUILDERS).join(', ')}` });
    }
    const data = await REPORT_BUILDERS[type](req.query);
    res.json({ type, label: REPORT_LABELS[type], data });
  } catch (error) {
    logger.error('Transport report error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const printReport = async (req, res) => {
  try {
    const type = req.query.type || 'vehicles';
    if (!isTransportReportType(type)) {
      return res.status(400).json({ message: `Unknown report type. Valid: ${Object.keys(REPORT_BUILDERS).join(', ')}` });
    }
    const data = await REPORT_BUILDERS[type](req.query);
    const doc = await buildReportDoc(type, data);
    logActivity({ req, action: 'REPORT_PRINTED', entity: 'TransportReport', entityId: type, description: `Printed transport report: ${REPORT_LABELS[type]}` });
    sendPdf(res, doc, `${type}-report.pdf`);
  } catch (error) {
    logger.error('Transport PDF error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getReport, printReport, isTransportReportType, REPORT_LABELS };
