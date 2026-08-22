const { validationResult, body, check, param } = require('express-validator');
const { validatePasswordStrength } = require('../utils/password');

const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    next();
  },
];

const authValidators = {
  login: validate([
    check('email', 'Username is required').notEmpty(),
    check('password', 'Password is required').notEmpty(),
  ]),
  refresh: validate([
    check('refreshToken', 'Refresh token is required').notEmpty(),
  ]),
  forgotPassword: validate([
    check('email', 'Valid email is required').isEmail().normalizeEmail(),
  ]),
  resetPassword: validate([
    check('token', 'Token is required').notEmpty(),
    check('password')
      .custom((value) => validatePasswordStrength(value).valid)
      .withMessage('Password must be at least 8 characters with a letter and a number'),
  ]),
};

const passwordValidator = body('password')
  .custom((value) => validatePasswordStrength(value).valid)
  .withMessage('Password must be at least 8 characters with a letter and a number');

const userValidators = {
  create: validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().notEmpty().withMessage('Email/username is required'),
    body('roleId').optional({ nullable: true }).isInt({ min: 1 }),
    passwordValidator,
  ]),
  update: validate([
    param('id').isInt({ min: 1 }),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().trim().notEmpty().withMessage('Email/username cannot be empty'),
    body('roleId').optional({ nullable: true }).custom((value) => {
      if (value === null || value === '') return true;
      return Number.isInteger(Number(value)) && Number(value) >= 1;
    }),
  ]),
  resetUserPassword: validate([
    param('id').isInt({ min: 1 }),
    passwordValidator,
  ]),
  rolePermissions: validate([
    param('id').isInt({ min: 1 }),
    body('permissions').isArray().withMessage('permissions must be an array'),
    body('permissions.*').isString().trim().notEmpty(),
  ]),
};

const studentValidators = {
  create: validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('classId').isInt({ min: 1 }).withMessage('Valid classId is required'),
    body('rollNo').optional().isInt({ min: 0 }),
    body('gender').optional().isIn(['male', 'female', 'other']),
    body('email').optional().isEmail().normalizeEmail(),
    body('fatherPhone').optional().matches(/^\d{10}$/).withMessage('Father phone must be 10 digits'),
    body('motherPhone').optional().matches(/^\d{10}$/).withMessage('Mother phone must be 10 digits'),
    body('dob').optional().isISO8601().toDate(),
  ]),
  update: validate([
    param('id').isInt({ min: 1 }),
    body('name').optional().trim().notEmpty(),
    body('classId').optional().isInt({ min: 1 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('fatherPhone').optional().matches(/^\d{10}$/).withMessage('Father phone must be 10 digits'),
    body('motherPhone').optional().matches(/^\d{10}$/).withMessage('Mother phone must be 10 digits'),
  ]),
  delete: validate([param('id').isInt({ min: 1 })]),
};

const teacherValidators = {
  create: validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('teacherId').trim().notEmpty().withMessage('Teacher ID is required'),
    body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
    body('dob').optional().isISO8601().toDate(),
    body('joiningDate').optional().isISO8601().toDate(),
    body('salary').optional().isFloat({ min: 0 }),
  ]),
  update: validate([
    param('id').isInt({ min: 1 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().matches(/^\d{10}$/),
  ]),
  delete: validate([param('id').isInt({ min: 1 })]),
};

const classValidators = {
  create: validate([
    body('name').trim().notEmpty().withMessage('Class name is required'),
    body('classTeacherId').optional().isInt({ min: 1 }),
  ]),
  update: validate([
    param('id').isInt({ min: 1 }),
    body('name').optional().trim().notEmpty(),
    body('classTeacherId').optional().isInt({ min: 1 }),
  ]),
  delete: validate([param('id').isInt({ min: 1 })]),
};

const subjectValidators = {
  create: validate([
    body('name').trim().notEmpty().withMessage('Subject name is required'),
    body('classId').isInt({ min: 1 }).withMessage('Valid classId is required'),
  ]),
  update: validate([
    param('id').isInt({ min: 1 }),
    body('name').optional().trim().notEmpty(),
    body('classId').optional().isInt({ min: 1 }),
  ]),
  delete: validate([param('id').isInt({ min: 1 })]),
};

const examValidators = {
  create: validate([
    body('name').trim().notEmpty().withMessage('Exam name is required'),
    body('type').trim().notEmpty().withMessage('Exam type is required'),
    body('classId').isInt({ min: 1 }).withMessage('Valid classId is required'),
    body('startDate').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate(),
    body('subjects').optional().isArray(),
  ]),
  update: validate([
    param('id').isInt({ min: 1 }),
    body('name').optional().trim().notEmpty(),
    body('type').optional().trim().notEmpty(),
  ]),
  delete: validate([param('id').isInt({ min: 1 })]),
};

const markValidators = {
  save: validate([
    param('examId').isInt({ min: 1 }),
    body('marks').isArray({ min: 1 }).withMessage('Marks array is required'),
  ]),
};

const attendanceValidators = {
  save: validate([
    body('date').isISO8601().withMessage('Valid date is required'),
    body('records').isArray({ min: 1 }).withMessage('Records array is required'),
    body('records.*.studentId').isInt({ min: 1 }),
    body('records.*.status').isIn(['present', 'absent', 'leave']),
  ]),
};

const notificationValidators = {
  create: validate([
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ]),
  delete: validate([param('id').isInt({ min: 1 })]),
};

const documentValidators = {
  delete: validate([param('id').isInt({ min: 1 })]),
};

const transportValidators = {
  vehicle: validate([
    body('vehicleId').optional().trim().notEmpty().withMessage('Vehicle ID cannot be empty'),
    body('registrationNumber').optional().trim().notEmpty().withMessage('Registration number cannot be empty'),
    body('type').optional().isIn(['bus', 'van', 'mini_bus', 'other']).withMessage('Invalid vehicle type'),
    body('status').optional().isIn(['active', 'inactive', 'maintenance', 'retired']).withMessage('Invalid vehicle status'),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('purchaseDate').optional({ nullable: true }).isISO8601().toDate(),
    body('registrationDate').optional({ nullable: true }).isISO8601().toDate(),
  ]),
  vehicleDocument: validate([
    body('type').trim().notEmpty().withMessage('Document type is required'),
    body('type').isIn(['insurance', 'fitness', 'permit', 'pollution', 'registration', 'other']).withMessage('Invalid document type'),
    body('issueDate').optional({ nullable: true }).isISO8601().toDate(),
    body('expiryDate').optional({ nullable: true }).isISO8601().toDate(),
  ]),
  staff: validate([
    body('staffId').optional().trim().notEmpty().withMessage('Staff ID cannot be empty'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional({ nullable: true }).matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
    body('status').optional().isIn(['active', 'inactive', 'on_leave']).withMessage('Invalid staff status'),
    body('dob').optional({ nullable: true }).isISO8601().toDate(),
    body('licenseExpiry').optional({ nullable: true }).isISO8601().toDate(),
    body('joiningDate').optional({ nullable: true }).isISO8601().toDate(),
    body('assignedVehicleId').optional({ nullable: true }).isInt({ min: 1 }),
  ]),
  route: validate([
    body('routeCode').optional().trim().notEmpty().withMessage('Route code cannot be empty'),
    body('name').optional().trim().notEmpty().withMessage('Route name cannot be empty'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid route status'),
    body('assignedVehicleId').optional({ nullable: true }).isInt({ min: 1 }),
    body('assignedDriverId').optional({ nullable: true }).isInt({ min: 1 }),
  ]),
  stop: validate([
    body('name').optional().trim().notEmpty().withMessage('Stop name cannot be empty'),
    body('sequence').optional().isInt({ min: 1 }),
    body('pickupTime').optional({ nullable: true }).matches(/^\d{2}:\d{2}$/).withMessage('Pickup time must be HH:MM'),
    body('dropTime').optional({ nullable: true }).matches(/^\d{2}:\d{2}$/).withMessage('Drop time must be HH:MM'),
  ]),
  reorderStops: validate([
    body('order').isArray({ min: 1 }).withMessage('order must be a non-empty array'),
    body('order.*').isInt({ min: 1 }),
  ]),
  assignment: validate([
    body('studentId').isInt({ min: 1 }).withMessage('Valid studentId is required'),
    body('routeId').isInt({ min: 1 }).withMessage('Valid routeId is required'),
    body('pickupStopId').isInt({ min: 1 }),
    body('dropStopId').isInt({ min: 1 }),
    body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid assignment status'),
    body('startDate').optional({ nullable: true }).isISO8601().toDate(),
    body('endDate').optional({ nullable: true }).isISO8601().toDate(),
    body('feeAmount').optional({ nullable: true }).isFloat({ min: 0 }),
    body('feeDueDate').optional({ nullable: true }).isISO8601().toDate(),
  ]),
  assignmentUpdate: validate([
    param('id').isInt({ min: 1 }),
    body('studentId').optional().isInt({ min: 1 }),
    body('routeId').optional().isInt({ min: 1 }),
    body('pickupStopId').optional().isInt({ min: 1 }),
    body('dropStopId').optional().isInt({ min: 1 }),
    body('status').optional().isIn(['active', 'inactive', 'suspended']),
    body('startDate').optional({ nullable: true }).isISO8601().toDate(),
    body('endDate').optional({ nullable: true }).isISO8601().toDate(),
    body('feeAmount').optional({ nullable: true }).isFloat({ min: 0 }),
    body('feeDueDate').optional({ nullable: true }).isISO8601().toDate(),
  ]),
  transportFee: validate([
    body('studentId').isInt({ min: 1 }).withMessage('Valid studentId is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('paidAmount').optional({ nullable: true }).isFloat({ min: 0 }),
    body('dueDate').isISO8601().toDate().withMessage('Valid dueDate is required'),
    body('status').optional().isIn(['pending', 'paid', 'partial', 'overdue']),
  ]),
  transportFeeUpdate: validate([
    param('id').isInt({ min: 1 }),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('paidAmount').optional().isFloat({ min: 0 }),
    body('dueDate').optional().isISO8601().toDate(),
    body('status').optional().isIn(['pending', 'paid', 'partial', 'overdue']),
  ]),
};

module.exports = {
  validate,
  authValidators,
  userValidators,
  studentValidators,
  teacherValidators,
  classValidators,
  subjectValidators,
  examValidators,
  markValidators,
  attendanceValidators,
  notificationValidators,
  documentValidators,
  transportValidators,
};
