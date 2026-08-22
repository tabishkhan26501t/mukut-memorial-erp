const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transport.controller');
const transportReportController = require('../controllers/transport.report.controller');
const { authenticate, requirePermission } = require('../middlewares/auth');
const { transportValidators } = require('../validators');

router.use(authenticate);

// Dashboard (view requires transport view; fee figures are filtered server-side)
router.get('/dashboard', requirePermission('TRANSPORT_VIEW', 'TRANSPORT_FEES_VIEW'), transportController.getDashboard);

// Meta (options for forms)
router.get('/meta', requirePermission('TRANSPORT_VIEW'), transportController.getMeta);

// Vehicles
router.get('/vehicles', requirePermission('TRANSPORT_VIEW'), transportController.getVehicles);
router.get('/vehicles/:id', requirePermission('TRANSPORT_VIEW'), transportController.getVehicle);
router.post('/vehicles', requirePermission('TRANSPORT_CREATE'), transportValidators.vehicle, transportController.createVehicle);
router.put('/vehicles/:id', requirePermission('TRANSPORT_UPDATE'), transportValidators.vehicle, transportController.updateVehicle);
router.delete('/vehicles/:id', requirePermission('TRANSPORT_DELETE'), transportController.deleteVehicle);

// Vehicle documents
router.post('/vehicles/:id/documents', requirePermission('TRANSPORT_UPDATE'), transportValidators.vehicleDocument, transportController.createVehicleDocument);
router.put('/vehicles/documents/:docId', requirePermission('TRANSPORT_UPDATE'), transportValidators.vehicleDocument, transportController.updateVehicleDocument);
router.delete('/vehicles/documents/:docId', requirePermission('TRANSPORT_UPDATE'), transportController.deleteVehicleDocument);

// Drivers / transport staff
router.get('/staff', requirePermission('TRANSPORT_VIEW'), transportController.getStaff);
router.post('/staff', requirePermission('TRANSPORT_CREATE'), transportValidators.staff, transportController.createStaff);
router.put('/staff/:id', requirePermission('TRANSPORT_UPDATE'), transportValidators.staff, transportController.updateStaff);
router.delete('/staff/:id', requirePermission('TRANSPORT_DELETE'), transportController.deleteStaff);

// Routes
router.get('/routes', requirePermission('TRANSPORT_VIEW'), transportController.getRoutes);
router.get('/routes/:id', requirePermission('TRANSPORT_VIEW'), transportController.getRoute);
router.post('/routes', requirePermission('TRANSPORT_CREATE'), transportValidators.route, transportController.createRoute);
router.put('/routes/:id', requirePermission('TRANSPORT_UPDATE'), transportValidators.route, transportController.updateRoute);
router.delete('/routes/:id', requirePermission('TRANSPORT_DELETE'), transportController.deleteRoute);

// Stops
router.post('/routes/:id/stops', requirePermission('TRANSPORT_UPDATE'), transportValidators.stop, transportController.createStop);
router.put('/routes/stops/:stopId', requirePermission('TRANSPORT_UPDATE'), transportValidators.stop, transportController.updateStop);
router.delete('/routes/stops/:stopId', requirePermission('TRANSPORT_UPDATE'), transportController.deleteStop);
router.put('/routes/:id/stops/reorder', requirePermission('TRANSPORT_UPDATE'), transportValidators.reorderStops, transportController.reorderStops);

// Student transport assignments
router.get('/assignments', requirePermission('TRANSPORT_VIEW'), transportController.getAssignments);
router.get('/assignments/:id', requirePermission('TRANSPORT_VIEW'), transportController.getAssignment);
router.post('/assignments', requirePermission('TRANSPORT_UPDATE'), transportValidators.assignment, transportController.createAssignment);
router.put('/assignments/:id', requirePermission('TRANSPORT_UPDATE'), transportValidators.assignmentUpdate, transportController.updateAssignment);
router.delete('/assignments/:id', requirePermission('TRANSPORT_UPDATE'), transportController.deleteAssignment);

// Transport fees
router.get('/fees', requirePermission('TRANSPORT_FEES_VIEW'), transportController.getTransportFees);
router.post('/fees', requirePermission('TRANSPORT_FEES_MANAGE'), transportValidators.transportFee, transportController.createTransportFee);
router.put('/fees/:id', requirePermission('TRANSPORT_FEES_MANAGE'), transportValidators.transportFeeUpdate, transportController.updateTransportFee);
router.delete('/fees/:id', requirePermission('TRANSPORT_FEES_MANAGE'), transportController.deleteTransportFee);

// Reports
router.get('/reports', requirePermission('TRANSPORT_REPORT_VIEW'), transportReportController.getReport);
router.get('/reports/print', requirePermission('TRANSPORT_REPORT_PRINT'), transportReportController.printReport);

module.exports = router;
