const prisma = require('../config/db');
const pick = require('../utils/pick');
const logger = require('../utils/logger');
const { logActivity } = require('../utils/audit');
const {
  getVehicleDocumentWarnings,
  getLicenseWarnings,
  getCapacityWarnings,
  getRoutesWithoutVehicle,
  getUnassignedTransportStudents,
  getOverdueTransportFees,
  syncTransportNotifications,
  expiryStatus,
} = require('../utils/transportWarning');

const AUDIT = {
  Vehicle: { entity: 'Vehicle', created: 'VEHICLE_CREATED', updated: 'VEHICLE_UPDATED', deleted: 'VEHICLE_DELETED' },
  Driver: { entity: 'TransportStaff', created: 'DRIVER_CREATED', updated: 'DRIVER_UPDATED', deleted: 'DRIVER_DELETED' },
  Route: { entity: 'TransportRoute', created: 'ROUTE_CREATED', updated: 'ROUTE_UPDATED', deleted: 'ROUTE_DELETED' },
  Stop: { entity: 'TransportStop', created: 'STOP_CREATED', updated: 'STOP_UPDATED', deleted: 'STOP_DELETED' },
  Assignment: { entity: 'StudentTransport', created: 'STUDENT_TRANSPORT_ASSIGNED', updated: 'STUDENT_TRANSPORT_UPDATED', deleted: 'STUDENT_TRANSPORT_REMOVED' },
  TransportFee: { entity: 'Fee', created: 'TRANSPORT_FEE_CREATED', updated: 'TRANSPORT_FEE_UPDATED', deleted: 'TRANSPORT_FEE_DELETED' },
};

const audit = (req, key, action, entityId, description) =>
  logActivity({ req, action: AUDIT[key][action], entity: AUDIT[key].entity, entityId, description });

const toInt = (v) => (v === undefined || v === null || v === '' ? undefined : parseInt(v, 10));
const toFloat = (v) => (v === undefined || v === null || v === '' ? undefined : parseFloat(v));
const toDate = (v) => (v ? new Date(v) : undefined);

const VEHICLE_FIELDS = ['vehicleId', 'registrationNumber', 'type', 'model', 'manufacturer', 'capacity', 'status', 'purchaseDate', 'registrationDate', 'notes'];
const STAFF_FIELDS = ['staffId', 'name', 'phone', 'dob', 'address', 'licenseNumber', 'licenseCategory', 'licenseExpiry', 'joiningDate', 'status', 'assignedVehicleId', 'emergencyContact', 'notes'];
const ROUTE_FIELDS = ['routeCode', 'name', 'status', 'startPoint', 'endPoint', 'assignedVehicleId', 'assignedDriverId', 'notes'];
const STOP_FIELDS = ['name', 'sequence', 'pickupTime', 'dropTime', 'landmark', 'notes'];
const ASSIGNMENT_FIELDS = ['studentId', 'routeId', 'pickupStopId', 'dropStopId', 'status', 'startDate', 'endDate', 'feeAmount', 'feeDueDate'];
const FEE_FIELDS = ['studentId', 'amount', 'paidAmount', 'dueDate', 'status'];

const vehicleInclude = {
  driver: { select: { id: true, staffId: true, name: true, phone: true, licenseNumber: true, status: true } },
  routes: { select: { id: true, routeCode: true, name: true, status: true } },
  documents: { orderBy: { expiryDate: 'asc' } },
};

const assignmentInclude = {
  student: { select: { id: true, name: true, admissionNo: true, rollNo: true, classId: true, isActive: true, class: { select: { id: true, name: true, section: true } } } },
  route: { select: { id: true, routeCode: true, name: true, status: true, assignedVehicle: { select: { id: true, vehicleId: true, registrationNumber: true, capacity: true, status: true, driver: { select: { id: true, staffId: true, name: true } } } } } },
  pickupStop: { select: { id: true, name: true, sequence: true, pickupTime: true } },
  dropStop: { select: { id: true, name: true, sequence: true, dropTime: true } },
};

// ---------------------------------------------------------------- Dashboard

const getDashboard = async (req, res) => {
  try {
    const canSeeFees = req.user.role && req.user.role.name === 'SUPER_ADMIN' ? true : (req.user.role ? req.user.role.permissions.some((rp) => rp.permission.name === 'TRANSPORT_FEES_VIEW') : false);

    const [
      totalVehicles, activeVehicles, maintenanceVehicles,
      totalRoutes, activeRoutes,
      staffCount, activeStaffCount,
      studentsUsingTransport,
      docWarnings, licenseWarnings, capacityWarnings, routesWithoutVehicle,
      unassignedCount, overdueFees, feeSummary,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'active' } }),
      prisma.vehicle.count({ where: { status: 'maintenance' } }),
      prisma.transportRoute.count(),
      prisma.transportRoute.count({ where: { status: 'active' } }),
      prisma.transportStaff.count(),
      prisma.transportStaff.count({ where: { status: 'active' } }),
      prisma.studentTransportAssignment.groupBy({ by: ['studentId'], where: { status: 'active' } }).then((rows) => rows.length),
      getVehicleDocumentWarnings(),
      getLicenseWarnings(),
      getCapacityWarnings(),
      getRoutesWithoutVehicle(),
      getUnassignedTransportStudents(),
      getOverdueTransportFees(),
      canSeeFees
        ? prisma.fee.aggregate({ where: { type: 'transport' }, _sum: { amount: true, paidAmount: true } }).then((a) => ({ total: Number(a._sum.amount || 0), collected: Number(a._sum.paidAmount || 0) }))
        : Promise.resolve(null),
    ]);

    syncTransportNotifications();

    const payload = {
      stats: {
        totalVehicles,
        activeVehicles,
        maintenanceVehicles,
        totalRoutes,
        activeRoutes,
        studentsUsingTransport,
        transportStaff: staffCount,
        activeTransportStaff: activeStaffCount,
        unassignedStudents: unassignedCount,
      },
      warnings: {
        vehicleDocuments: docWarnings,
        driverLicenses: licenseWarnings,
        capacity: capacityWarnings,
        routesWithoutVehicle,
        overdueFees: canSeeFees ? overdueFees : [],
      },
    };
    if (canSeeFees) {
      const pending = await prisma.fee.count({ where: { type: 'transport', status: { in: ['pending', 'partial', 'overdue'] } } });
      payload.stats.transportFeesTotal = feeSummary.total;
      payload.stats.transportFeesCollected = feeSummary.collected;
      payload.stats.transportFeesPending = feeSummary.total - feeSummary.collected;
      payload.stats.transportFeesOverdue = pending;
    }
    res.json(payload);
  } catch (error) {
    logger.error('Transport dashboard error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ---------------------------------------------------------------- Vehicles

const getVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;
    const type = req.query.type;

    const where = {};
    if (search) {
      where.OR = [
        { vehicleId: { contains: search } },
        { registrationNumber: { contains: search } },
        { model: { contains: search } },
        { manufacturer: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (type) where.type = type;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        include: {
          driver: { select: { id: true, staffId: true, name: true } },
          routes: { where: { status: 'active' }, select: { id: true, name: true, routeCode: true } },
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicle.count({ where }),
    ]);

    const activeRouteIds = vehicles.flatMap((v) => v.routes.map((r) => r.id));
    const counts = activeRouteIds.length
      ? await prisma.studentTransportAssignment.groupBy({ by: ['routeId'], where: { routeId: { in: activeRouteIds }, status: 'active' }, _count: { _all: true } })
      : [];
    const countByRoute = Object.fromEntries(counts.map((c) => [c.routeId, c._count._all]));
    const withAssigned = vehicles.map((v) => ({
      ...v,
      assignedStudents: v.routes.reduce((sum, r) => sum + (countByRoute[r.id] || 0), 0),
      remainingSeats: Math.max(0, v.capacity - v.routes.reduce((sum, r) => sum + (countByRoute[r.id] || 0), 0)),
    }));

    res.json({ vehicles: withAssigned, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get vehicles error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getVehicle = async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: parseInt(req.params.id) },
      include: vehicleInclude,
    });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    const activeRouteIds = vehicle.routes.filter((r) => r.status === 'active').map((r) => r.id);
    const counts = activeRouteIds.length
      ? await prisma.studentTransportAssignment.groupBy({ by: ['routeId'], where: { routeId: { in: activeRouteIds }, status: 'active' }, _count: { _all: true } })
      : [];
    const countByRoute = Object.fromEntries(counts.map((c) => [c.routeId, c._count._all]));
    const assignedStudents = vehicle.routes.reduce((sum, r) => sum + (countByRoute[r.id] || 0), 0);
    res.json({ ...vehicle, assignedStudents, remainingSeats: Math.max(0, vehicle.capacity - assignedStudents), documents: vehicle.documents.map((d) => ({ ...d, expiryStatus: expiryStatus(d.expiryDate) })) });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createVehicle = async (req, res) => {
  try {
    const data = pick(req.body, VEHICLE_FIELDS);
    if (!data.vehicleId || !data.registrationNumber) {
      return res.status(400).json({ message: 'Vehicle ID and registration number are required.' });
    }
    data.vehicleId = String(data.vehicleId).trim();
    data.registrationNumber = String(data.registrationNumber).trim().toUpperCase();
    data.capacity = data.capacity !== undefined ? parseInt(data.capacity, 10) : 20;
    if (!Number.isFinite(data.capacity) || data.capacity < 1) return res.status(400).json({ message: 'Capacity must be a positive number.' });
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.registrationDate) data.registrationDate = new Date(data.registrationDate);

    const vehicle = await prisma.vehicle.create({ data });
    audit(req, 'Vehicle', 'created', vehicle.id, `Vehicle created: ${vehicle.vehicleId} (${vehicle.registrationNumber})`);
    res.status(201).json(vehicle);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'Vehicle ID or registration number already exists.' });
    logger.error('Create vehicle error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = pick(req.body, VEHICLE_FIELDS);
    if (data.vehicleId !== undefined) data.vehicleId = String(data.vehicleId).trim();
    if (data.registrationNumber !== undefined) data.registrationNumber = String(data.registrationNumber).trim().toUpperCase();
    if (data.capacity !== undefined) {
      data.capacity = parseInt(data.capacity, 10);
      if (!Number.isFinite(data.capacity) || data.capacity < 1) return res.status(400).json({ message: 'Capacity must be a positive number.' });
    }
    if (data.purchaseDate !== undefined) data.purchaseDate = toDate(data.purchaseDate);
    if (data.registrationDate !== undefined) data.registrationDate = toDate(data.registrationDate);

    const vehicle = await prisma.vehicle.update({ where: { id }, data });
    audit(req, 'Vehicle', 'updated', id, `Vehicle updated: ${vehicle.vehicleId} (${vehicle.registrationNumber})`);
    res.json(vehicle);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Vehicle not found.' });
    if (error.code === 'P2002') return res.status(400).json({ message: 'Vehicle ID or registration number already exists.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vehicle = await prisma.vehicle.findUnique({ where: { id }, include: { routes: { select: { id: true } } } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    const activeAssignments = await prisma.studentTransportAssignment.count({ where: { routeId: { in: vehicle.routes.map((r) => r.id) }, status: 'active' } });
    if (activeAssignments > 0) {
      return res.status(400).json({ message: `Cannot delete this vehicle because ${activeAssignments} student(s) are assigned to it. Reassign students or mark the vehicle inactive.` });
    }
    await prisma.vehicle.delete({ where: { id } });
    audit(req, 'Vehicle', 'deleted', id, `Vehicle deleted: ${vehicle.vehicleId} (${vehicle.registrationNumber})`);
    res.json({ message: 'Vehicle deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Vehicle not found.' });
    if (error.code === 'P2003') return res.status(400).json({ message: 'Cannot delete this vehicle. A driver, route or assignment still references it.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ------------------------------------------------- Vehicle documents

const createVehicleDocument = async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.id);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, vehicleId: true } });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    const data = pick(req.body, ['type', 'documentNumber', 'issueDate', 'expiryDate', 'notes']);
    if (!data.type) return res.status(400).json({ message: 'Document type is required.' });
    if (data.issueDate) data.issueDate = new Date(data.issueDate);
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);
    const doc = await prisma.vehicleDocument.create({ data: { ...data, vehicleId } });
    audit(req, 'Vehicle', 'updated', vehicleId, `Document added to ${vehicle.vehicleId}: ${doc.type}${doc.documentNumber ? ` (${doc.documentNumber})` : ''}`);
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateVehicleDocument = async (req, res) => {
  try {
    const id = parseInt(req.params.docId);
    const data = pick(req.body, ['type', 'documentNumber', 'issueDate', 'expiryDate', 'notes']);
    if (data.issueDate !== undefined) data.issueDate = toDate(data.issueDate);
    if (data.expiryDate !== undefined) data.expiryDate = toDate(data.expiryDate);
    const doc = await prisma.vehicleDocument.update({ where: { id }, data });
    audit(req, 'Vehicle', 'updated', doc.vehicleId, `Document updated: ${doc.type}${doc.documentNumber ? ` (${doc.documentNumber})` : ''}`);
    res.json(doc);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Document not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteVehicleDocument = async (req, res) => {
  try {
    const id = parseInt(req.params.docId);
    const doc = await prisma.vehicleDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Document not found.' });
    await prisma.vehicleDocument.delete({ where: { id } });
    audit(req, 'Vehicle', 'updated', doc.vehicleId, `Document deleted: ${doc.type}`);
    res.json({ message: 'Document deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------- Transport staff

const getStaff = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { staffId: { contains: search } },
        { phone: { contains: search } },
        { licenseNumber: { contains: search } },
      ];
    }
    if (status) where.status = status;

    const [staff, total] = await Promise.all([
      prisma.transportStaff.findMany({
        where,
        skip,
        take: limit,
        include: { assignedVehicle: { select: { id: true, vehicleId: true, registrationNumber: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transportStaff.count({ where }),
    ]);
    res.json({
      staff: staff.map((s) => ({ ...s, licenseStatus: expiryStatus(s.licenseExpiry) })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get transport staff error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createStaff = async (req, res) => {
  try {
    const data = pick(req.body, STAFF_FIELDS);
    if (!data.name || !data.staffId) return res.status(400).json({ message: 'Name and staff ID are required.' });
    data.staffId = String(data.staffId).trim();
    if (data.licenseNumber !== undefined && data.licenseNumber !== null && String(data.licenseNumber).trim() !== '') data.licenseNumber = String(data.licenseNumber).trim();
    else data.licenseNumber = null;
    if (data.dob) data.dob = new Date(data.dob);
    if (data.licenseExpiry) data.licenseExpiry = new Date(data.licenseExpiry);
    if (data.joiningDate) data.joiningDate = new Date(data.joiningDate);
    if (data.assignedVehicleId !== undefined) data.assignedVehicleId = toInt(data.assignedVehicleId) || null;

    if (data.assignedVehicleId) {
      const existing = await prisma.transportStaff.findFirst({ where: { assignedVehicleId: data.assignedVehicleId } });
      if (existing) return res.status(400).json({ message: 'This vehicle already has a primary driver. Unassign them first.' });
    }

    const staff = await prisma.transportStaff.create({ data });
    audit(req, 'Driver', 'created', staff.id, `Driver created: ${staff.name} (${staff.staffId})`);
    res.status(201).json(staff);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'Staff ID or license number already exists.' });
    if (error.code === 'P2003') return res.status(400).json({ message: 'Assigned vehicle not found.' });
    logger.error('Create transport staff error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateStaff = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = pick(req.body, STAFF_FIELDS);
    if (data.staffId !== undefined) data.staffId = String(data.staffId).trim();
    if (data.licenseNumber !== undefined) {
      data.licenseNumber = String(data.licenseNumber).trim() || null;
    }
    if (data.dob !== undefined) data.dob = toDate(data.dob);
    if (data.licenseExpiry !== undefined) data.licenseExpiry = toDate(data.licenseExpiry);
    if (data.joiningDate !== undefined) data.joiningDate = toDate(data.joiningDate);
    if (data.assignedVehicleId !== undefined) data.assignedVehicleId = toInt(data.assignedVehicleId) || null;

    if (data.assignedVehicleId) {
      const existing = await prisma.transportStaff.findFirst({ where: { assignedVehicleId: data.assignedVehicleId, NOT: { id } } });
      if (existing) return res.status(400).json({ message: 'This vehicle already has a primary driver. Unassign them first.' });
    }

    const staff = await prisma.transportStaff.update({ where: { id }, data });
    audit(req, 'Driver', 'updated', id, `Driver updated: ${staff.name} (${staff.staffId})`);
    res.json(staff);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Transport staff not found.' });
    if (error.code === 'P2002') return res.status(400).json({ message: 'Staff ID or license number already exists.' });
    if (error.code === 'P2003') return res.status(400).json({ message: 'Assigned vehicle not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const staff = await prisma.transportStaff.findUnique({
      where: { id },
      include: { assignedVehicle: { select: { id: true, vehicleId: true } }, routes: { select: { id: true, name: true } } },
    });
    if (!staff) return res.status(404).json({ message: 'Transport staff not found.' });
    if (staff.assignedVehicle) {
      return res.status(400).json({ message: `Cannot delete ${staff.name}: still assigned to vehicle ${staff.assignedVehicle.vehicleId}. Unassign the driver first.` });
    }
    if (staff.routes.length > 0) {
      return res.status(400).json({ message: `Cannot delete ${staff.name}: still assigned to route(s): ${staff.routes.map((r) => r.name).join(', ')}. Unassign first.` });
    }
    await prisma.transportStaff.delete({ where: { id } });
    audit(req, 'Driver', 'deleted', id, `Driver deleted: ${staff.name} (${staff.staffId})`);
    res.json({ message: 'Transport staff deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Transport staff not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// --------------------------------------------------------------- Routes

const routeInclude = {
  stops: { orderBy: { sequence: 'asc' } },
  assignedVehicle: { select: { id: true, vehicleId: true, registrationNumber: true, capacity: true, status: true } },
  assignedDriver: { select: { id: true, staffId: true, name: true, phone: true, licenseNumber: true, status: true } },
  _count: { select: { assignments: true } },
};

const getRoutes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;

    const where = {};
    if (search) {
      where.OR = [{ name: { contains: search } }, { routeCode: { contains: search } }, { startPoint: { contains: search } }, { endPoint: { contains: search } }];
    }
    if (status) where.status = status;

    const [routes, total] = await Promise.all([
      prisma.transportRoute.findMany({ where, skip, take: limit, include: routeInclude, orderBy: { createdAt: 'desc' } }),
      prisma.transportRoute.count({ where }),
    ]);

    const counts = await prisma.studentTransportAssignment.groupBy({
      by: ['routeId'],
      where: { routeId: { in: routes.map((r) => r.id) }, status: 'active' },
      _count: { _all: true },
    });
    const countByRoute = Object.fromEntries(counts.map((c) => [c.routeId, c._count._all]));

    res.json({
      routes: routes.map((r) => ({ ...r, activeStudents: countByRoute[r.id] || 0 })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get routes error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getRoute = async (req, res) => {
  try {
    const route = await prisma.transportRoute.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        ...routeInclude,
        assignments: {
          where: { status: 'active' },
          select: { id: true, student: { select: { id: true, name: true, admissionNo: true, rollNo: true, isActive: true, class: { select: { name: true, section: true } } } }, pickupStop: { select: { id: true, name: true } }, dropStop: { select: { id: true, name: true } }, status: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!route) return res.status(404).json({ message: 'Route not found.' });
    res.json(route);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createRoute = async (req, res) => {
  try {
    const data = pick(req.body, ROUTE_FIELDS);
    if (!data.name || !data.routeCode) return res.status(400).json({ message: 'Route name and route code are required.' });
    data.routeCode = String(data.routeCode).trim().toUpperCase();
    data.assignedVehicleId = toInt(data.assignedVehicleId) || null;
    data.assignedDriverId = toInt(data.assignedDriverId) || null;

    if (data.assignedVehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: data.assignedVehicleId }, select: { status: true } });
      if (!vehicle) return res.status(400).json({ message: 'Assigned vehicle not found.' });
      if (vehicle.status !== 'active') return res.status(400).json({ message: 'Cannot assign an inactive vehicle to a route.' });
    }

    const route = await prisma.transportRoute.create({ data });
    audit(req, 'Route', 'created', route.id, `Route created: ${route.name} (${route.routeCode})`);
    res.status(201).json(route);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'Route code already exists.' });
    if (error.code === 'P2003') return res.status(400).json({ message: 'Assigned vehicle or driver not found.' });
    logger.error('Create route error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateRoute = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = pick(req.body, ROUTE_FIELDS);
    if (data.routeCode !== undefined) data.routeCode = String(data.routeCode).trim().toUpperCase();
    if (data.assignedVehicleId !== undefined) data.assignedVehicleId = toInt(data.assignedVehicleId) || null;
    if (data.assignedDriverId !== undefined) data.assignedDriverId = toInt(data.assignedDriverId) || null;

    if (data.assignedVehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: data.assignedVehicleId }, select: { status: true } });
      if (!vehicle) return res.status(400).json({ message: 'Assigned vehicle not found.' });
      if (vehicle.status !== 'active') return res.status(400).json({ message: 'Cannot assign an inactive vehicle to a route.' });
    }

    const route = await prisma.transportRoute.update({ where: { id }, data });
    audit(req, 'Route', 'updated', id, `Route updated: ${route.name} (${route.routeCode})`);
    res.json(route);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Route not found.' });
    if (error.code === 'P2002') return res.status(400).json({ message: 'Route code already exists.' });
    if (error.code === 'P2003') return res.status(400).json({ message: 'Assigned vehicle or driver not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteRoute = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const route = await prisma.transportRoute.findUnique({ where: { id }, select: { id: true, name: true, routeCode: true } });
    if (!route) return res.status(404).json({ message: 'Route not found.' });
    const assignments = await prisma.studentTransportAssignment.count({ where: { routeId: id } });
    if (assignments > 0) {
      return res.status(400).json({ message: `Cannot delete this route because ${assignments} student assignment(s) exist. Reassign or remove them first.` });
    }
    await prisma.transportRoute.delete({ where: { id } });
    audit(req, 'Route', 'deleted', id, `Route deleted: ${route.name} (${route.routeCode})`);
    res.json({ message: 'Route deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Route not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ----------------------------------------------------------------- Stops

const createStop = async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const route = await prisma.transportRoute.findUnique({ where: { id: routeId }, select: { id: true } });
    if (!route) return res.status(404).json({ message: 'Route not found.' });

    const data = pick(req.body, STOP_FIELDS);
    if (!data.name) return res.status(400).json({ message: 'Stop name is required.' });
    data.name = String(data.name).trim();

    const maxSeq = await prisma.transportStop.aggregate({ where: { routeId }, _max: { sequence: true } });
    data.sequence = data.sequence !== undefined ? parseInt(data.sequence, 10) : (maxSeq._max.sequence || 0) + 1;

    const stop = await prisma.transportStop.create({ data: { ...data, routeId } });
    audit(req, 'Stop', 'created', stop.id, `Stop added to route ${routeId}: ${stop.name}`);
    res.status(201).json(stop);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'A stop with this name already exists on the route.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateStop = async (req, res) => {
  try {
    const id = parseInt(req.params.stopId);
    const data = pick(req.body, STOP_FIELDS);
    if (data.name !== undefined) data.name = String(data.name).trim();
    if (data.sequence !== undefined) data.sequence = parseInt(data.sequence, 10);
    const stop = await prisma.transportStop.update({ where: { id }, data });
    audit(req, 'Stop', 'updated', id, `Stop updated: ${stop.name} (route ${stop.routeId})`);
    res.json(stop);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Stop not found.' });
    if (error.code === 'P2002') return res.status(400).json({ message: 'A stop with this name already exists on the route.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteStop = async (req, res) => {
  try {
    const id = parseInt(req.params.stopId);
    const stop = await prisma.transportStop.findUnique({ where: { id } });
    if (!stop) return res.status(404).json({ message: 'Stop not found.' });
    const usedAsPickup = await prisma.studentTransportAssignment.count({ where: { pickupStopId: id } });
    const usedAsDrop = await prisma.studentTransportAssignment.count({ where: { dropStopId: id } });
    if (usedAsPickup + usedAsDrop > 0) {
      return res.status(400).json({ message: `Cannot delete this stop: it is used by ${usedAsPickup + usedAsDrop} student assignment(s). Reassign those students first.` });
    }
    await prisma.transportStop.delete({ where: { id } });
    audit(req, 'Stop', 'deleted', id, `Stop deleted: ${stop.name}`);
    res.json({ message: 'Stop deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const reorderStops = async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const order = req.body.order;
    if (!Array.isArray(order)) return res.status(400).json({ message: 'order must be an array of stop ids.' });
    const stops = await prisma.transportStop.findMany({ where: { routeId }, select: { id: true } });
    const stopIds = new Set(stops.map((s) => s.id));
    if (order.length !== stops.length || order.some((id) => !stopIds.has(parseInt(id, 10)))) {
      return res.status(400).json({ message: 'Order must include every stop of this route exactly once.' });
    }
    await prisma.$transaction(order.map((id, index) => prisma.transportStop.update({ where: { id: parseInt(id, 10) }, data: { sequence: index + 1 } })));
    audit(req, 'Stop', 'updated', routeId, `Stops reordered on route ${routeId}`);
    res.json({ message: 'Stop order updated.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// --------------------------------------------------------------- Assignments

const getAssignments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, classId, routeId, stopId, status, studentId } = req.query;

    const where = {};
    if (search) {
      where.student = { OR: [{ name: { contains: search } }, { admissionNo: { contains: search } }] };
    }
    if (classId) where.student = { ...(where.student || {}), classId: parseInt(classId, 10) };
    if (routeId) where.routeId = parseInt(routeId, 10);
    if (stopId) where.pickupStopId = parseInt(stopId, 10);
    if (status) where.status = status;
    if (studentId) where.studentId = parseInt(studentId, 10);

    const [assignments, total] = await Promise.all([
      prisma.studentTransportAssignment.findMany({
        where,
        skip,
        take: limit,
        include: assignmentInclude,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.studentTransportAssignment.count({ where }),
    ]);
    res.json({ assignments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get transport assignments error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getAssignment = async (req, res) => {
  try {
    const assignment = await prisma.studentTransportAssignment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: assignmentInclude,
    });
    if (!assignment) return res.status(404).json({ message: 'Transport assignment not found.' });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const validateAssignmentData = async (data, currentId = null) => {
  const errors = [];

  if (data.studentId === undefined) errors.push('studentId is required');
  if (data.routeId === undefined) errors.push('routeId is required');
  if (data.pickupStopId === undefined) errors.push('pickupStopId is required');
  if (data.dropStopId === undefined) errors.push('dropStopId is required');
  if (errors.length) return errors;

  const studentId = parseInt(data.studentId, 10);
  const routeId = parseInt(data.routeId, 10);
  const pickupStopId = parseInt(data.pickupStopId, 10);
  const dropStopId = parseInt(data.dropStopId, 10);

  const [student, route] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true, isActive: true } }),
    prisma.transportRoute.findUnique({
      where: { id: routeId },
      include: { assignedVehicle: { select: { id: true, capacity: true, status: true } }, stops: { select: { id: true, name: true } } },
    }),
  ]);

  if (!student) errors.push('Student not found.');
  else if (!student.isActive) errors.push('Cannot assign an inactive student to transport.');
  if (!route) errors.push('Route not found.');
  else if (route.status !== 'active') errors.push('Cannot assign to an inactive route.');
  else if (!route.assignedVehicle) errors.push('This route has no vehicle assigned.');
  else if (route.assignedVehicle.status !== 'active') errors.push('Cannot assign students to a route whose vehicle is not active.');

  const stopIds = route ? new Set(route.stops.map((s) => s.id)) : new Set();
  if (route) {
    if (!stopIds.has(pickupStopId)) errors.push('Pickup stop does not belong to the selected route.');
    if (!stopIds.has(dropStopId)) errors.push('Drop stop does not belong to the selected route.');
  }

  if (route && route.assignedVehicle) {
    const activeCount = await prisma.studentTransportAssignment.count({
      where: { routeId, status: 'active', NOT: currentId ? { id: currentId } : undefined },
    });
    if (data.status === undefined || data.status === 'active') {
      if (activeCount >= route.assignedVehicle.capacity) {
        errors.push('Vehicle capacity reached.');
      }
    }
  }

  if (data.status === undefined || data.status === 'active') {
    const otherActive = await prisma.studentTransportAssignment.findFirst({
      where: { studentId, status: 'active', NOT: currentId ? { id: currentId } : undefined },
      select: { id: true },
    });
    if (otherActive) errors.push('This student already has an active transport assignment.');
  }

  return errors;
};

const createAssignment = async (req, res) => {
  try {
    const data = pick(req.body, ASSIGNMENT_FIELDS);
    data.studentId = toInt(data.studentId);
    data.routeId = toInt(data.routeId);
    data.pickupStopId = toInt(data.pickupStopId);
    data.dropStopId = toInt(data.dropStopId);
    data.status = data.status || 'active';
    data.startDate = toDate(data.startDate) || new Date();
    if (data.endDate !== undefined) data.endDate = toDate(data.endDate);
    if (data.feeAmount !== undefined) data.feeAmount = toFloat(data.feeAmount) || null;
    if (data.feeDueDate !== undefined) data.feeDueDate = toDate(data.feeDueDate);

    const errors = await validateAssignmentData(data);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const assignment = await prisma.studentTransportAssignment.create({ data });
    audit(req, 'Assignment', 'created', assignment.id, `Student #${assignment.studentId} assigned to route #${assignment.routeId} (${assignment.status})`);
    res.status(201).json(assignment);
  } catch (error) {
    if (error.code === 'P2003') return res.status(400).json({ message: 'Invalid student, route or stop reference.' });
    logger.error('Create transport assignment error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.studentTransportAssignment.findUnique({ where: { id }, select: { id: true, studentId: true, routeId: true, pickupStopId: true, dropStopId: true } });
    if (!existing) return res.status(404).json({ message: 'Transport assignment not found.' });

    const data = pick(req.body, ASSIGNMENT_FIELDS);
    if (data.studentId !== undefined) data.studentId = toInt(data.studentId);
    if (data.routeId !== undefined) data.routeId = toInt(data.routeId);
    if (data.pickupStopId !== undefined) data.pickupStopId = toInt(data.pickupStopId);
    if (data.dropStopId !== undefined) data.dropStopId = toInt(data.dropStopId);
    if (data.startDate !== undefined) data.startDate = toDate(data.startDate);
    if (data.endDate !== undefined) data.endDate = toDate(data.endDate);
    if (data.feeAmount !== undefined) data.feeAmount = toFloat(data.feeAmount) || null;
    if (data.feeDueDate !== undefined) data.feeDueDate = toDate(data.feeDueDate);

    const merged = { ...existing, ...data, id };
    const errors = await validateAssignmentData(merged, id);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const assignment = await prisma.studentTransportAssignment.update({ where: { id }, data });
    audit(req, 'Assignment', 'updated', id, `Student #${assignment.studentId} transport updated (${assignment.status})`);
    res.json(assignment);
  } catch (error) {
    if (error.code === 'P2003') return res.status(400).json({ message: 'Invalid student, route or stop reference.' });
    logger.error('Update transport assignment error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const assignment = await prisma.studentTransportAssignment.findUnique({ where: { id }, select: { id: true, studentId: true } });
    if (!assignment) return res.status(404).json({ message: 'Transport assignment not found.' });
    await prisma.studentTransportAssignment.delete({ where: { id } });
    audit(req, 'Assignment', 'deleted', id, `Student #${assignment.studentId} transport removed`);
    res.json({ message: 'Transport assignment removed.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------- Transport fees

const transportFeeWhere = (query) => {
  const where = { type: 'transport' };
  const { status, studentId, routeId, classId, search } = query;
  if (status) where.status = status;
  if (studentId) where.studentId = parseInt(studentId, 10);
  if (classId || routeId || search) {
    where.student = {};
    if (classId) where.student.classId = parseInt(classId, 10);
    if (search) where.student.OR = [{ name: { contains: search } }, { admissionNo: { contains: search } }];
    if (routeId) {
      where.student.transportAssignments = { some: { routeId: parseInt(routeId, 10) } };
    }
  }
  return where;
};

const getTransportFees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const where = transportFeeWhere(req.query);

    const [fees, total, summary] = await Promise.all([
      prisma.fee.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            select: { id: true, name: true, admissionNo: true, classId: true, class: { select: { id: true, name: true, section: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fee.count({ where }),
      prisma.fee.aggregate({ where, _sum: { amount: true, paidAmount: true } }),
    ]);

    res.json({
      fees,
      summary: { total: Number(summary._sum.amount || 0), collected: Number(summary._sum.paidAmount || 0), pending: Math.max(0, Number(summary._sum.amount || 0) - Number(summary._sum.paidAmount || 0)) },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get transport fees error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createTransportFee = async (req, res) => {
  try {
    const data = pick(req.body, FEE_FIELDS);
    if (!data.studentId || !data.amount || !data.dueDate) {
      return res.status(400).json({ message: 'StudentId, amount, and dueDate are required.' });
    }
    data.studentId = parseInt(data.studentId, 10);
    data.amount = parseFloat(data.amount);
    data.paidAmount = parseFloat(data.paidAmount || 0);
    data.dueDate = new Date(data.dueDate);
    data.type = 'transport';

    const student = await prisma.student.findUnique({ where: { id: data.studentId }, select: { id: true } });
    if (!student) return res.status(400).json({ message: 'Student not found.' });

    const fee = await prisma.fee.create({ data });
    audit(req, 'TransportFee', 'created', fee.id, `Transport fee created for student #${fee.studentId}: ₹${Number(fee.amount).toFixed(2)}`);
    res.status(201).json(fee);
  } catch (error) {
    if (error.code === 'P2003') return res.status(400).json({ message: 'Invalid student reference.' });
    logger.error('Create transport fee error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateTransportFee = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.fee.findUnique({ where: { id }, select: { id: true, type: true } });
    if (!existing) return res.status(404).json({ message: 'Fee record not found.' });
    if (existing.type !== 'transport') return res.status(400).json({ message: 'This fee record is not a transport fee.' });

    const data = pick(req.body, FEE_FIELDS);
    if (data.amount !== undefined) data.amount = parseFloat(data.amount);
    if (data.paidAmount !== undefined) data.paidAmount = parseFloat(data.paidAmount);
    if (data.dueDate !== undefined) data.dueDate = new Date(data.dueDate);

    const fee = await prisma.fee.update({ where: { id }, data });
    audit(req, 'TransportFee', 'updated', id, `Transport fee updated for student #${fee.studentId}: paid ₹${Number(fee.paidAmount).toFixed(2)}`);
    res.json(fee);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Fee record not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteTransportFee = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const fee = await prisma.fee.findUnique({ where: { id }, select: { id: true, type: true } });
    if (!fee) return res.status(404).json({ message: 'Fee record not found.' });
    if (fee.type !== 'transport') return res.status(400).json({ message: 'This fee record is not a transport fee.' });
    await prisma.fee.delete({ where: { id } });
    audit(req, 'TransportFee', 'deleted', id, 'Transport fee deleted');
    res.json({ message: 'Transport fee deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ----------------------------------------------------------------- Meta

const getMeta = async (req, res) => {
  try {
    const [vehicles, routes, staff, students] = await Promise.all([
      prisma.vehicle.findMany({ select: { id: true, vehicleId: true, registrationNumber: true, status: true } }),
      prisma.transportRoute.findMany({ select: { id: true, name: true, routeCode: true, status: true, stops: { select: { id: true, name: true, sequence: true } } } }),
      prisma.transportStaff.findMany({ select: { id: true, name: true, staffId: true, status: true } }),
      prisma.student.findMany({ where: { isActive: true }, select: { id: true, name: true, admissionNo: true, classId: true, class: { select: { id: true, name: true, section: true } } } }),
    ]);
    res.json({ vehicles, routes, staff, students });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getDashboard,
  getVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle,
  createVehicleDocument, updateVehicleDocument, deleteVehicleDocument,
  getStaff, createStaff, updateStaff, deleteStaff,
  getRoutes, getRoute, createRoute, updateRoute, deleteRoute,
  createStop, updateStop, deleteStop, reorderStops,
  getAssignments, getAssignment, createAssignment, updateAssignment, deleteAssignment,
  getTransportFees, createTransportFee, updateTransportFee, deleteTransportFee,
  getMeta,
};
