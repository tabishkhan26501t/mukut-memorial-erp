const prisma = require('../config/db');
const pick = require('../utils/pick');
const logger = require('../utils/logger');

const ALLOWED_FEE_FIELDS = ['studentId', 'amount', 'paidAmount', 'dueDate', 'status', 'type'];

const getFees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { studentId, status, type } = req.query;
    const where = {};
    if (studentId) where.studentId = parseInt(studentId);
    if (status) where.status = status;
    if (type) where.type = type;

    const [fees, total] = await Promise.all([
      prisma.fee.findMany({
        where,
        skip,
        take: limit,
        include: { student: { select: { id: true, name: true, admissionNo: true, rollNo: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fee.count({ where }),
    ]);
    res.json({ fees, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Get fees error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getFee = async (req, res) => {
  try {
    const fee = await prisma.fee.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { student: { select: { id: true, name: true, admissionNo: true, classId: true } } },
    });
    if (!fee) return res.status(404).json({ message: 'Fee record not found.' });
    res.json(fee);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createFee = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_FEE_FIELDS);
    if (!data.studentId || !data.amount || !data.dueDate) {
      return res.status(400).json({ message: 'StudentId, amount, and dueDate are required.' });
    }
    data.studentId = parseInt(data.studentId);
    data.amount = parseFloat(data.amount);
    data.paidAmount = parseFloat(data.paidAmount || 0);
    data.dueDate = new Date(data.dueDate);

    const fee = await prisma.fee.create({ data });
    res.status(201).json(fee);
  } catch (error) {
    if (error.code === 'P2003') return res.status(400).json({ message: 'Invalid student reference.' });
    logger.error('Create fee error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateFee = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = pick(req.body, ALLOWED_FEE_FIELDS);
    if (data.amount) data.amount = parseFloat(data.amount);
    if (data.paidAmount) data.paidAmount = parseFloat(data.paidAmount);
    if (data.dueDate) data.dueDate = new Date(data.dueDate);

    const fee = await prisma.fee.update({ where: { id }, data });
    res.json(fee);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Fee record not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteFee = async (req, res) => {
  try {
    await prisma.fee.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Fee record deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Fee record not found.' });
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getFees, getFee, createFee, updateFee, deleteFee };
