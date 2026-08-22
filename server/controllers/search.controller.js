const prisma = require('../config/db');
const logger = require('../utils/logger');

const search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const results = {
      students: [],
      teachers: [],
      classes: [],
      subjects: [],
      notifications: [],
    };

    if (q.length >= 2) {
      const [students, teachers, classes, subjects, notifications] = await Promise.all([
        prisma.student.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { admissionNo: { contains: q } },
              { fatherName: { contains: q } },
              { motherName: { contains: q } },
            ],
          },
          take: 5,
          select: { id: true, name: true, admissionNo: true, rollNo: true },
          orderBy: { name: 'asc' },
        }),
        prisma.teacher.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { teacherId: { contains: q } },
              { email: { contains: q } },
            ],
          },
          take: 5,
          select: { id: true, name: true, teacherId: true, email: true },
          orderBy: { name: 'asc' },
        }),
        prisma.class.findMany({
          where: { OR: [{ name: { contains: q } }, { section: { contains: q } }] },
          take: 5,
          select: { id: true, name: true, section: true },
          orderBy: [{ name: 'asc' }, { section: 'asc' }],
        }),
        prisma.subject.findMany({
          where: { OR: [{ name: { contains: q } }, { code: { contains: q } }] },
          take: 5,
          select: { id: true, name: true, code: true, classId: true },
          orderBy: { name: 'asc' },
        }),
        prisma.notification.findMany({
          where: { OR: [{ title: { contains: q } }, { message: { contains: q } }] },
          take: 5,
          select: { id: true, title: true, type: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      results.students = students;
      results.teachers = teachers;
      results.classes = classes;
      results.subjects = subjects;
      results.notifications = notifications;
    }

    res.json(results);
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { search };
