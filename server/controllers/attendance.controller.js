const prisma = require('../config/db');
const logger = require('../utils/logger');
const { logActivity } = require('../utils/audit');

const getAttendance = async (req, res) => {
  try {
    const { classId, date, studentId } = req.query;
    const where = {};
    if (classId) where.student = { classId: parseInt(classId) };
    if (date) where.date = new Date(date);
    if (studentId) where.studentId = parseInt(studentId);

    const attendance = await prisma.attendance.findMany({
      where,
      include: { student: { select: { id: true, admissionNo: true, rollNo: true, name: true, classId: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const saveAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !records) {
      return res.status(400).json({ message: 'Date and records are required.' });
    }

    const attendanceDate = new Date(date);
    const results = [];

    for (const record of records) {
      const { studentId, status, remarks } = record;
      const result = await prisma.attendance.upsert({
        where: { studentId_date: { studentId: parseInt(studentId), date: attendanceDate } },
        update: { status, remarks },
        create: { studentId: parseInt(studentId), date: attendanceDate, status, remarks },
      });
      results.push(result);
    }

    res.json({ message: 'Attendance saved successfully.', count: results.length });
    logActivity({ req, action: 'SAVE', entity: 'Attendance', entityId: date, description: `Saved attendance for ${results.length} students on ${date}` });
  } catch (error) {
    logger.error('Save attendance error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getAttendanceReport = async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;
    const where = { studentId: parseInt(studentId) };
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    res.json({ records, summary: { total, present, absent, leave, percentage } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getAttendance, saveAttendance, getAttendanceReport };
