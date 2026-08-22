const prisma = require('../config/db');
const pick = require('../utils/pick');
const logger = require('../utils/logger');

const getExams = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const classId = req.query.classId;
    const where = classId ? { classId: parseInt(classId) } : {};

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip,
        take: limit,
        include: {
          class: { select: { id: true, name: true, section: true } },
          subjects: { include: { subject: true } },
          _count: { select: { marks: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.exam.count({ where }),
    ]);
    res.json({ exams, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getExam = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        class: { include: { students: { orderBy: { rollNo: 'asc' } } } },
        subjects: { include: { subject: true, marks: true } },
      },
    });
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const ALLOWED_EXAM_FIELDS = ['name', 'term', 'type', 'startDate', 'endDate', 'classId', 'subjects'];

const createExam = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_EXAM_FIELDS);
    if (!data.name || !data.type || !data.classId) {
      return res.status(400).json({ message: 'Name, type and classId are required.' });
    }

    const exam = await prisma.exam.create({
      data: {
        name: data.name,
        term: data.term,
        type: data.type,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        classId: parseInt(data.classId),
        subjects: data.subjects ? {
          create: data.subjects.map(s => ({
            subjectId: parseInt(s.subjectId),
            maxMarks: s.maxMarks || 100,
            passingMarks: s.passingMarks || 33,
          })),
        } : undefined,
      },
      include: { subjects: { include: { subject: true } } },
    });
    res.status(201).json(exam);
  } catch (error) {
    logger.error('Create exam error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateExam = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = pick(req.body, ALLOWED_EXAM_FIELDS);
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const { subjects, ...fields } = data;

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...fields,
        ...(subjects ? {
          subjects: {
            deleteMany: {},
            create: subjects.map(s => ({
              subjectId: parseInt(s.subjectId),
              maxMarks: s.maxMarks || 100,
              passingMarks: s.passingMarks || 33,
            })),
          },
        } : {}),
      },
      include: { subjects: { include: { subject: true } } },
    });
    res.json(exam);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Exam not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteExam = async (req, res) => {
  try {
    await prisma.exam.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Exam deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Exam not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getExams, getExam, createExam, updateExam, deleteExam };
