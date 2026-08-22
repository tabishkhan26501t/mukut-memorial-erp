const prisma = require('../config/db');
const logger = require('../utils/logger');

const getFeeSummary = async () => {
  try {
    const agg = await prisma.fee.aggregate({
      _sum: { amount: true, paidAmount: true },
    });
    return {
      total: Number(agg._sum.amount || 0),
      collected: Number(agg._sum.paidAmount || 0),
    };
  } catch {
    return { total: 0, collected: 0 };
  }
};

const getFeeRecords = async () => {
  try {
    return await prisma.fee.findMany({
      select: { amount: true, paidAmount: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  } catch {
    return [];
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [
      totalStudents, activeStudents,
      totalTeachers, totalClasses, totalSubjects,
      todayAttendance,
      feeSummary,
      studentsThisMonth, studentsLastMonth,
      recentAdmissions,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: { isActive: true } }),
      prisma.class.count(),
      prisma.subject.count(),
      (async () => {
        const present = await prisma.attendance.count({ where: { date: today, status: 'present' } });
        const total = await prisma.attendance.count({ where: { date: today } });
        return total > 0 ? Math.round((present / total) * 100) : 0;
      })(),
      getFeeSummary(),
      prisma.student.count({ where: { createdAt: { gte: firstOfMonth } } }),
      prisma.student.count({ where: { createdAt: { gte: firstOfLastMonth, lt: firstOfMonth } } }),
      prisma.student.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, admissionNo: true, gender: true, classId: true, createdAt: true, class: { select: { name: true } } },
      }),
    ]);

    const totalFees = feeSummary.total;
    const collectedFees = feeSummary.collected;
    const pendingFees = totalFees - collectedFees;

    const studentTrend = studentsLastMonth > 0
      ? (((studentsThisMonth - studentsLastMonth) / studentsLastMonth) * 100).toFixed(1)
      : studentsThisMonth > 0 ? '100' : '0';

    res.json({
      stats: {
        totalStudents, activeStudents,
        totalTeachers, totalClasses, totalSubjects,
        todayAttendance,
        totalFees, collectedFees, pendingFees,
        studentTrend,
      },
      recentAdmissions,
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getChartData = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyMap = {};
    students.forEach(s => {
      const key = s.createdAt.toISOString().slice(0, 7);
      monthlyMap[key] = (monthlyMap[key] || 0) + 1;
    });
    const monthlyEnrollments = Object.entries(monthlyMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceRecords = await prisma.attendance.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      select: { date: true, status: true },
      orderBy: { date: 'asc' },
    });

    const attendanceMap = {};
    attendanceRecords.forEach(a => {
      const key = `${a.date.toISOString().slice(0, 10)}:${a.status}`;
      attendanceMap[key] = (attendanceMap[key] || 0) + 1;
    });
    const attendanceData = Object.entries(attendanceMap)
      .map(([key, count]) => {
        const [date, status] = key.split(':');
        return { date, status, count };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const genderStats = await prisma.student.groupBy({
      by: ['gender'],
      _count: true,
    });

    const classDistribution = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        section: true,
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });

    const feeRecords = await getFeeRecords();

    const feeMonthlyMap = {};
    feeRecords.forEach(f => {
      const key = f.createdAt.toISOString().slice(0, 7);
      if (!feeMonthlyMap[key]) feeMonthlyMap[key] = { total: 0, collected: 0 };
      feeMonthlyMap[key].total += Number(f.amount);
      feeMonthlyMap[key].collected += Number(f.paidAmount);
    });
    const feeTrend = Object.entries(feeMonthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      monthlyEnrollments,
      attendanceData,
      genderStats,
      classDistribution,
      feeTrend,
    });
  } catch (error) {
    logger.error('Chart data error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getActivity = async (req, res) => {
  try {
    const [recentStudents, recentTeachers, recentExams, recentNotifs] = await Promise.all([
      prisma.student.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, createdAt: true } }),
      prisma.teacher.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, createdAt: true } }),
      prisma.exam.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, type: true, createdAt: true } }),
      prisma.notification.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, createdAt: true } }),
    ]);

    const activities = [];

    recentStudents.forEach(s => activities.push({
      type: 'student_added',
      title: s.name,
      description: 'New student enrolled',
      timestamp: s.createdAt,
    }));

    recentTeachers.forEach(t => activities.push({
      type: 'teacher_added',
      title: t.name,
      description: 'New teacher joined',
      timestamp: t.createdAt,
    }));

    recentExams.forEach(e => activities.push({
      type: 'exam_created',
      title: e.name,
      description: `${e.type} exam created`,
      timestamp: e.createdAt,
    }));

    recentNotifs.forEach(n => activities.push({
      type: 'notice_published',
      title: n.title,
      description: 'Notice published',
      timestamp: n.createdAt,
    }));

    activities.sort((a, b) => b.timestamp - a.timestamp);
    activities.splice(15);

    res.json({ activities });
  } catch (error) {
    logger.error('Activity error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getUpcomingExams = async (req, res) => {
  try {
    const now = new Date();
    const exams = await prisma.exam.findMany({
      where: { endDate: { gte: now }, isActive: true },
      include: { class: { select: { name: true, section: true } } },
      orderBy: { startDate: 'asc' },
      take: 10,
    });

    const result = exams.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      className: e.class ? `${e.class.name}${e.class.section ? ` - ${e.class.section}` : ''}` : 'All',
      startDate: e.startDate,
      endDate: e.endDate,
      daysRemaining: e.startDate
        ? Math.ceil((new Date(e.startDate) - now) / (1000 * 60 * 60 * 24))
        : null,
    }));

    res.json({ exams: result });
  } catch (error) {
    logger.error('Upcoming exams error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getNotices = async (req, res) => {
  try {
    const notices = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ notices });
  } catch (error) {
    logger.error('Notices error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getSystemHealth = async (req, res) => {
  try {
    let dbStatus = 'healthy';
    let dbError = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'offline';
      dbError = e.message;
    }

    const authStatus = (() => {
      try {
        require('jsonwebtoken');
        return 'healthy';
      } catch {
        return 'warning';
      }
    })();

    const serverUptime = process.uptime();
    const uptimeMinutes = Math.floor(serverUptime / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeStr = uptimeHours > 0
      ? `${uptimeHours}h ${uptimeMinutes % 60}m`
      : `${uptimeMinutes}m`;

    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    res.json({
      database: { status: dbStatus, error: dbError },
      api: { status: 'healthy', uptime: uptimeStr },
      authentication: { status: authStatus },
      server: { status: 'healthy', memory: `${memoryMB}MB`, uptime: uptimeStr, node: process.version },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getDashboardStats, getChartData, getActivity, getUpcomingExams, getNotices, getSystemHealth };