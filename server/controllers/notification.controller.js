const prisma = require('../config/db');
const pick = require('../utils/pick');
const { logActivity } = require('../utils/audit');

const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count(),
    ]);
    res.json({ notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const ALLOWED_NOTIFICATION_FIELDS = ['title', 'message', 'type', 'targetRole'];

const createNotification = async (req, res) => {
  try {
    const data = pick(req.body, ALLOWED_NOTIFICATION_FIELDS);
    if (!data.title || !data.message) return res.status(400).json({ message: 'Title and message are required.' });

    const notification = await prisma.notification.create({ data });
    res.status(201).json(notification);
    logActivity({ req, action: 'CREATE', entity: 'Notification', entityId: notification.id, description: `Created notification: ${notification.title}` });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const markAsRead = async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: parseInt(req.params.id) }, select: { title: true } });
    await prisma.notification.delete({ where: { id: parseInt(req.params.id) } });
    logActivity({ req, action: 'DELETE', entity: 'Notification', entityId: req.params.id, description: `Deleted notification: ${notification ? notification.title : ''}` });
    res.json({ message: 'Notification deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getNotifications, createNotification, markAsRead, deleteNotification };
