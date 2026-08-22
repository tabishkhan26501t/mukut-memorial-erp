const prisma = require('../config/db');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const logger = require('../utils/logger');
const pick = require('../utils/pick');
const { logActivity } = require('../utils/audit');

const getStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const classId = req.query.classId;
    const gender = req.query.gender;
    const isActive = req.query.isActive;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { admissionNo: { contains: search } },
        { fatherName: { contains: search } },
        { motherName: { contains: search } },
      ];
    }
    if (classId) where.classId = parseInt(classId);
    if (gender) where.gender = gender;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: { class: { select: { id: true, name: true, section: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      students,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Get students error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getStudent = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        class: true,
        documents: true,
        marks: { include: { exam: true, subject: true } },
      },
    });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const ALLOWED_STUDENT_FIELDS = [
  'admissionNo', 'rollNo', 'name', 'dob', 'gender', 'bloodGroup',
  'nationality', 'religion', 'caste', 'aadhaarNo', 'motherAadhaar', 'fatherAadhaar', 'childId', 'apaarId', 'phone', 'email',
  'address', 'city', 'state', 'pinCode', 'fatherName', 'fatherPhone',
  'fatherOccupation', 'motherName', 'motherPhone', 'motherOccupation',
  'guardianName', 'guardianPhone', 'classId',
];

const createStudent = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_STUDENT_FIELDS);
    if (!data.name || !data.classId) {
      return res.status(400).json({ message: 'Name and class are required.' });
    }
    if (!data.admissionNo) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      const rand = String(Math.floor(1000 + Math.random() * 9000));
      data.admissionNo = `ADM-${dateStr}-${rand}`;
    }
    if (data.dob) data.dob = new Date(data.dob);
    data.classId = parseInt(data.classId);
    data.rollNo = parseInt(data.rollNo) || 0;

    const student = await prisma.student.create({ data });
    res.status(201).json(student);
    logActivity({ req, action: 'CREATE', entity: 'Student', entityId: student.id, description: `Created student ${student.name} (${student.admissionNo})` });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Admission number already exists.' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ message: 'Invalid class reference.' });
    }
    logger.error('Create student error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateStudent = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = pick(req.body, ALLOWED_STUDENT_FIELDS);
    if (data.dob) data.dob = new Date(data.dob);
    if (data.classId) data.classId = parseInt(data.classId);
    if (data.rollNo) data.rollNo = parseInt(data.rollNo);

    const student = await prisma.student.update({ where: { id }, data });
    res.json(student);
    logActivity({ req, action: 'UPDATE', entity: 'Student', entityId: id, description: `Updated student ${student.name}` });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Admission number already exists.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Student not found.' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: parseInt(req.params.id) }, select: { name: true, admissionNo: true } });
    await prisma.student.delete({ where: { id: parseInt(req.params.id) } });
    logActivity({ req, action: 'DELETE', entity: 'Student', entityId: req.params.id, description: `Deleted student ${student ? student.name : ''} (${student ? student.admissionNo : req.params.id})` });
    res.json({ message: 'Student deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Student not found.' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateStudentPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const student = await prisma.student.update({
      where: { id: parseInt(req.params.id) },
      data: { photo: `/uploads/${req.file.filename}` },
    });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const IMPORT_COLUMNS = [
  'name', 'rollNo', 'dob', 'gender', 'bloodGroup',
  'nationality', 'religion', 'caste', 'aadhaarNo',
  'motherAadhaar', 'fatherAadhaar', 'childId', 'apaarId',
  'email', 'address', 'city', 'state', 'pinCode',
  'fatherName', 'fatherPhone', 'fatherOccupation',
  'motherName', 'motherPhone', 'motherOccupation',
  'guardianName', 'guardianPhone', 'classId',
];

const importStudents = async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file is required.' });

    filePath = req.file.path;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

    if (!records.length) return res.status(400).json({ message: 'CSV file is empty.' });

    const errors = [];
    const created = [];
    const now = new Date();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;
      try {
        if (!row.name || !row.classId) {
          errors.push({ row: rowNum, message: 'name and classId are required.' });
          continue;
        }
        const data = {};
        for (const col of IMPORT_COLUMNS) {
          if (row[col] !== undefined && row[col] !== '') data[col] = row[col];
        }
        if (!data.admissionNo) {
          const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
          const rand = String(Math.floor(1000 + Math.random() * 9000));
          data.admissionNo = `ADM-${dateStr}-${rand}`;
        }
        if (data.dob) data.dob = new Date(data.dob);
        data.classId = parseInt(data.classId);
        data.rollNo = parseInt(data.rollNo) || 0;

        const student = await prisma.student.create({ data });
        created.push({ row: rowNum, id: student.id, name: student.name });
      } catch (err) {
        errors.push({ row: rowNum, message: err.message });
      }
    }

    res.status(201).json({ created: created.length, errors, total: records.length });
    logActivity({ req, action: 'IMPORT', entity: 'Student', description: `Imported ${created.length} of ${records.length} students from CSV` });
  } catch (error) {
    logger.error('Import students error:', error);
    res.status(500).json({ message: 'Failed to process CSV file.' });
  } finally {
    if (filePath) {
      try { fs.unlinkSync(filePath); } catch { /* ignore cleanup errors */ }
    }
  }
};

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent, updateStudentPhoto, importStudents };
