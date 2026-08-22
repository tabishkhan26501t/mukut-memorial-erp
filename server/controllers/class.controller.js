const prisma = require('../config/db');
const pick = require('../utils/pick');
const { logActivity } = require('../utils/audit');

const getClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        classTeacher: { select: { id: true, name: true } },
        _count: { select: { students: true, subjects: true } },
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getClass = async (req, res) => {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        classTeacher: { select: { id: true, name: true } },
        students: {
          orderBy: { rollNo: 'asc' },
          select: { id: true, admissionNo: true, rollNo: true, name: true, gender: true, photo: true, isActive: true },
        },
        subjects: true,
      },
    });
    if (!cls) return res.status(404).json({ message: 'Class not found.' });
    res.json(cls);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const ALLOWED_CLASS_FIELDS = ['name', 'section', 'classTeacherId'];

const createClass = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_CLASS_FIELDS);
    if (!data.name) return res.status(400).json({ message: 'Class name is required.' });
    if (data.classTeacherId) data.classTeacherId = parseInt(data.classTeacherId);

    const cls = await prisma.class.create({
      data: { name: data.name, section: data.section || null, classTeacherId: data.classTeacherId || null },
    });
    res.status(201).json(cls);
    logActivity({ req, action: 'CREATE', entity: 'Class', entityId: cls.id, description: `Created class ${cls.name}${cls.section ? ' - ' + cls.section : ''}` });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Class with this name and section already exists.' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateClass = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = pick(req.body, ALLOWED_CLASS_FIELDS);
    if (data.classTeacherId) data.classTeacherId = parseInt(data.classTeacherId);

    const cls = await prisma.class.update({ where: { id }, data });
    res.json(cls);
    logActivity({ req, action: 'UPDATE', entity: 'Class', entityId: id, description: `Updated class ${cls.name}${cls.section ? ' - ' + cls.section : ''}` });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Class not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteClass = async (req, res) => {
  try {
    const cls = await prisma.class.findUnique({ where: { id: parseInt(req.params.id) }, select: { name: true, section: true } });
    await prisma.class.delete({ where: { id: parseInt(req.params.id) } });
    logActivity({ req, action: 'DELETE', entity: 'Class', entityId: req.params.id, description: `Deleted class ${cls ? cls.name + (cls.section ? ' - ' + cls.section : '') : req.params.id}` });
    res.json({ message: 'Class deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Class not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getClasses, getClass, createClass, updateClass, deleteClass };
