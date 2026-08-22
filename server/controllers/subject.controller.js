const prisma = require('../config/db');
const pick = require('../utils/pick');
const { logActivity } = require('../utils/audit');

const getSubjects = async (req, res) => {
  try {
    const classId = req.query.classId;
    const where = classId ? { classId: parseInt(classId) } : {};

    const subjects = await prisma.subject.findMany({
      where,
      include: { class: { select: { id: true, name: true, section: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getSubject = async (req, res) => {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { class: true },
    });
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const ALLOWED_SUBJECT_FIELDS = ['name', 'code', 'classId'];

const createSubject = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_SUBJECT_FIELDS);
    if (!data.name || !data.classId) {
      return res.status(400).json({ message: 'Name and classId are required.' });
    }
    const subject = await prisma.subject.create({
      data: { name: data.name, code: data.code, classId: parseInt(data.classId) },
    });
    res.status(201).json(subject);
    logActivity({ req, action: 'CREATE', entity: 'Subject', entityId: subject.id, description: `Created subject ${subject.name} (${subject.code || '-'})` });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Subject already exists for this class.' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateSubject = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_SUBJECT_FIELDS);
    const subject = await prisma.subject.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(subject);
    logActivity({ req, action: 'UPDATE', entity: 'Subject', entityId: req.params.id, description: `Updated subject ${subject.name}` });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Subject not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const subject = await prisma.subject.findUnique({ where: { id: parseInt(req.params.id) }, select: { name: true } });
    await prisma.subject.delete({ where: { id: parseInt(req.params.id) } });
    logActivity({ req, action: 'DELETE', entity: 'Subject', entityId: req.params.id, description: `Deleted subject ${subject ? subject.name : req.params.id}` });
    res.json({ message: 'Subject deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Subject not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getSubjects, getSubject, createSubject, updateSubject, deleteSubject };
