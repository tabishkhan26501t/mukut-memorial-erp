const prisma = require('../config/db');
const pick = require('../utils/pick');
const { logActivity } = require('../utils/audit');

const getTeachers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const isActive = req.query.isActive;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { teacherId: { contains: search } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { classes: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teacher.count({ where }),
    ]);

    res.json({
      teachers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getTeacher = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { classes: true, attendance: true },
    });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const ALLOWED_TEACHER_FIELDS = [
  'teacherId', 'name', 'email', 'phone', 'gender', 'dob',
  'qualification', 'experience', 'joiningDate', 'salary',
  'address', 'city', 'state', 'pinCode', 'bloodGroup', 'subjects',
];

const createTeacher = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_TEACHER_FIELDS);
    if (!data.name || !data.email || !data.teacherId) {
      return res.status(400).json({ message: 'Name, email, and teacher ID are required.' });
    }
    if (data.dob) data.dob = new Date(data.dob);
    if (data.joiningDate) data.joiningDate = new Date(data.joiningDate);
    if (data.salary) data.salary = parseFloat(data.salary);
    if (data.experience) data.experience = parseInt(data.experience);

    const teacher = await prisma.teacher.create({ data });
    res.status(201).json(teacher);
    logActivity({ req, action: 'CREATE', entity: 'Teacher', entityId: teacher.id, description: `Created teacher ${teacher.name} (${teacher.teacherId})` });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Teacher ID or email already exists.' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = pick(req.body, ALLOWED_TEACHER_FIELDS);
    if (data.dob) data.dob = new Date(data.dob);
    if (data.joiningDate) data.joiningDate = new Date(data.joiningDate);
    if (data.salary) data.salary = parseFloat(data.salary);

    const teacher = await prisma.teacher.update({ where: { id }, data });
    res.json(teacher);
    logActivity({ req, action: 'UPDATE', entity: 'Teacher', entityId: id, description: `Updated teacher ${teacher.name}` });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Teacher not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id: parseInt(req.params.id) }, select: { name: true, teacherId: true } });
    await prisma.teacher.delete({ where: { id: parseInt(req.params.id) } });
    logActivity({ req, action: 'DELETE', entity: 'Teacher', entityId: req.params.id, description: `Deleted teacher ${teacher ? teacher.name : ''} (${teacher ? teacher.teacherId : req.params.id})` });
    res.json({ message: 'Teacher deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Teacher not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateTeacherPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const teacher = await prisma.teacher.update({
      where: { id: parseInt(req.params.id) },
      data: { photo: `/uploads/${req.file.filename}` },
    });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher, updateTeacherPhoto };
