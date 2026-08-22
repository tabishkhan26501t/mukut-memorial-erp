const prisma = require('../config/db');
const logger = require('../utils/logger');
const { logActivity } = require('../utils/audit');

const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
};

const getMarks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const { examId, subjectId } = req.query;
    const where = {};
    if (examId) where.examId = parseInt(examId);
    if (subjectId) where.subjectId = parseInt(subjectId);

    const [marks, total] = await Promise.all([
      prisma.mark.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: { select: { id: true, admissionNo: true, rollNo: true, name: true } },
          subject: true,
          exam: true,
          examSubject: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.mark.count({ where }),
    ]);
    res.json({ marks, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getMarksByExam = async (req, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        class: { include: { students: { orderBy: { rollNo: 'asc' }, where: { isActive: true } } } },
        subjects: { include: { subject: true, marks: true } },
      },
    });
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const result = exam.subjects.map(es => ({
      examSubjectId: es.id,
      subjectId: es.subjectId,
      subjectName: es.subject.name,
      maxMarks: es.maxMarks,
      passingMarks: es.passingMarks,
      marks: exam.class.students.map(student => {
        const mark = es.marks.find(m => m.studentId === student.id);
        return {
          studentId: student.id,
          admissionNo: student.admissionNo,
          rollNo: student.rollNo,
          studentName: student.name,
          marksObtained: mark ? mark.marksObtained : null,
          grade: mark ? mark.grade : null,
          remarks: mark ? mark.remarks : null,
          markId: mark ? mark.id : null,
        };
      }),
    }));

    res.json({ exam: { id: exam.id, name: exam.name, type: exam.type, classId: exam.classId }, subjects: result });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const saveMarks = async (req, res) => {
  try {
    const { examId } = req.params;
    const { marks } = req.body;
    if (!marks || !Array.isArray(marks)) {
      return res.status(400).json({ message: 'Marks array is required.' });
    }

    const results = [];
    for (const markData of marks) {
      const { examSubjectId, studentId, subjectId, marksObtained } = markData;
      const examSubject = await prisma.examSubject.findUnique({ where: { id: parseInt(examSubjectId) } });
      if (!examSubject) continue;

      const isValid = marksObtained !== null && marksObtained !== '' && marksObtained !== undefined;
      const numericMarks = isValid ? parseFloat(marksObtained) : null;
      const finalMarks = numericMarks !== null && !isNaN(numericMarks) ? numericMarks : null;
      const grade = finalMarks !== null ? calculateGrade((finalMarks / examSubject.maxMarks) * 100) : null;

      const result = await prisma.mark.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId: parseInt(examSubjectId),
            studentId: parseInt(studentId),
          },
        },
        update: {
          marksObtained: finalMarks,
          grade,
          examId: parseInt(examId),
          subjectId: parseInt(subjectId),
        },
        create: {
          examSubjectId: parseInt(examSubjectId),
          studentId: parseInt(studentId),
          subjectId: parseInt(subjectId),
          examId: parseInt(examId),
          marksObtained: finalMarks,
          grade,
        },
      });
      results.push(result);
    }

    res.json({ message: 'Marks saved successfully.', count: results.length });
    logActivity({ req, action: 'SAVE', entity: 'Mark', entityId: examId, description: `Saved marks for ${results.length} students in exam ${examId}` });
  } catch (error) {
    logger.error('Save marks error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getStudentReport = async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const examId = parseInt(req.params.examId);

    const marks = await prisma.mark.findMany({
      where: { studentId, examId },
      include: { subject: true, examSubject: true, exam: true },
      orderBy: { subject: { name: 'asc' } },
    });

    const totalMarks = marks.reduce((sum, m) => sum + (parseFloat(m.marksObtained) || 0), 0);
    const totalMaxMarks = marks.reduce((sum, m) => sum + m.examSubject.maxMarks, 0);
    const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
    const grade = calculateGrade(percentage);

    res.json({
      marks,
      summary: {
        totalMarks,
        totalMaxMarks,
        percentage: percentage.toFixed(2),
        grade,
        totalSubjects: marks.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getMarks, getMarksByExam, saveMarks, getStudentReport };
