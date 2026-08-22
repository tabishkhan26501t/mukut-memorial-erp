const prisma = require('../config/db');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const getDocuments = async (req, res) => {
  try {
    const studentId = req.query.studentId;
    const where = studentId ? { studentId: parseInt(studentId) } : {};
    const documents = await prisma.document.findMany({
      where,
      include: { student: { select: { id: true, name: true, admissionNo: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const { studentId, type } = req.body;
    if (!req.file || !studentId || !type) {
      return res.status(400).json({ message: 'File, studentId and type are required.' });
    }

    const document = await prisma.document.upsert({
      where: { studentId_type: { studentId: parseInt(studentId), type } },
      update: {
        fileName: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`,
        fileSize: (req.file.size / 1024).toFixed(2) + ' KB',
        mimeType: req.file.mimetype,
      },
      create: {
        studentId: parseInt(studentId),
        type,
        fileName: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`,
        fileSize: (req.file.size / 1024).toFixed(2) + ' KB',
        mimeType: req.file.mimetype,
      },
    });

    res.status(201).json(document);
  } catch (error) {
    logger.error('Upload document error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    const filePath = path.join(__dirname, '..', doc.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.document.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    const filePath = path.join(__dirname, '..', doc.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found.' });

    res.download(filePath, doc.fileName);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getDocuments, uploadDocument, deleteDocument, downloadDocument };
