const prisma = require('../config/db');
const logger = require('../utils/logger');
const { getSettings, getLogoDataUri, formatDate, formatMoney, buildHeader, makePdf, sectionTitle } = require('../utils/pdf');

const sendPdf = (res, docDefinition, filename) => {
  const pdfDoc = makePdf(docDefinition);
  const chunks = [];
  pdfDoc.on('data', (chunk) => chunks.push(chunk));
  pdfDoc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(Buffer.concat(chunks));
  });
  pdfDoc.on('error', (error) => {
    logger.error('PDF generation error:', error);
    res.status(500).json({ message: 'PDF generation failed.' });
  });
  pdfDoc.end();
};

const buildInfoTable = (items) => ({
  layout: 'lightHorizontalLines',
  table: {
    widths: ['35%', '65%'],
    body: items.map(([label, value]) => [
      { text: label, bold: true, fontSize: 9, color: '#475569', padding: [0, 3, 0, 3] },
      { text: value || '-', fontSize: 9, padding: [0, 3, 0, 3] },
    ]),
  },
});

const studentProfile = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { class: true },
    });
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const settings = await getSettings();
    const logo = getLogoDataUri(settings.school_logo);

    const doc = {
      content: [
        ...buildHeader(settings, logo),
        { text: 'Student Profile', fontSize: 15, bold: true, alignment: 'center', margin: [0, 14, 0, 2], color: '#1e293b' },
        { text: `Generated on: ${formatDate(new Date())}`, fontSize: 8, alignment: 'center', color: '#64748b' },
        sectionTitle('Personal Information'),
        buildInfoTable([
          ['Admission Number', student.admissionNo],
          ['Roll Number', student.rollNo],
          ['Full Name', student.name],
          ['Date of Birth', formatDate(student.dob)],
          ['Gender', student.gender],
          ['Blood Group', student.bloodGroup],
          ['Nationality', student.nationality],
          ['Religion', student.religion],
          ['Caste', student.caste],
          ['Aadhaar Number', student.aadhaarNo],
          ['Mother Aadhaar', student.motherAadhaar],
          ['Father Aadhaar', student.fatherAadhaar],
          ['Child ID', student.childId],
          ['APAAR ID', student.apaarId],
          ['Email', student.email],
          ['Phone', student.phone],
          ['Class', student.class ? `${student.class.name}${student.class.section ? ' - ' + student.class.section : ''}` : '-'],
        ]),
        sectionTitle('Parent / Guardian Details'),
        buildInfoTable([
          ['Father Name', student.fatherName],
          ['Father Phone', student.fatherPhone],
          ['Father Occupation', student.fatherOccupation],
          ['Mother Name', student.motherName],
          ['Mother Phone', student.motherPhone],
          ['Mother Occupation', student.motherOccupation],
          ['Guardian Name', student.guardianName],
          ['Guardian Phone', student.guardianPhone],
        ]),
        sectionTitle('Address'),
        buildInfoTable([
          ['Address', student.address],
          ['City', student.city],
          ['State', student.state],
          ['PIN Code', student.pinCode],
        ]),
      ],
    };
    sendPdf(res, doc, `student-profile-${student.admissionNo}.pdf`);
  } catch (error) {
    logger.error('Student PDF error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const teacherProfile = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { classes: { select: { id: true, name: true, section: true } } },
    });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });

    const settings = await getSettings();
    const logo = getLogoDataUri(settings.school_logo);

    const doc = {
      content: [
        ...buildHeader(settings, logo),
        { text: 'Teacher Profile', fontSize: 15, bold: true, alignment: 'center', margin: [0, 14, 0, 2], color: '#1e293b' },
        { text: `Generated on: ${formatDate(new Date())}`, fontSize: 8, alignment: 'center', color: '#64748b' },
        sectionTitle('Personal Information'),
        buildInfoTable([
          ['Teacher ID', teacher.teacherId],
          ['Full Name', teacher.name],
          ['Email', teacher.email],
          ['Phone', teacher.phone],
          ['Gender', teacher.gender],
          ['Date of Birth', formatDate(teacher.dob)],
          ['Blood Group', teacher.bloodGroup],
          ['Qualification', teacher.qualification],
          ['Experience (Years)', teacher.experience],
          ['Joining Date', formatDate(teacher.joiningDate)],
          ['Subjects', teacher.subjects],
        ]),
        sectionTitle('Class Assignments'),
        buildInfoTable([
          ['Classes', teacher.classes.length ? teacher.classes.map((c) => `${c.name}${c.section ? ' - ' + c.section : ''}`).join(', ') : '-'],
        ]),
        sectionTitle('Contact / Address'),
        buildInfoTable([
          ['Address', teacher.address],
          ['City', teacher.city],
          ['State', teacher.state],
          ['PIN Code', teacher.pinCode],
        ]),
      ],
    };
    sendPdf(res, doc, `teacher-profile-${teacher.teacherId}.pdf`);
  } catch (error) {
    logger.error('Teacher PDF error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const attendanceReport = async (req, res) => {
  try {
    const studentId = parseInt(req.query.studentId);
    if (!studentId) return res.status(400).json({ message: 'studentId is required.' });
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const where = { studentId };
    if (startDate || endDate) where.date = {};
    if (startDate) where.date.gte = startDate;
    if (endDate) where.date.lte = endDate;

    const [student, records] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId }, include: { class: true } }),
      prisma.attendance.findMany({ where, orderBy: { date: 'asc' } }),
    ]);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const leave = records.filter((r) => r.status === 'leave').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : '0.00';

    const settings = await getSettings();
    const logo = getLogoDataUri(settings.school_logo);

    const doc = {
      content: [
        ...buildHeader(settings, logo),
        { text: 'Attendance Report', fontSize: 15, bold: true, alignment: 'center', margin: [0, 14, 0, 2], color: '#1e293b' },
        { text: `Student: ${student.name} (${student.admissionNo})`, fontSize: 10, alignment: 'center', margin: [0, 0, 0, 2], color: '#334155' },
        {
          text: `Period: ${startDate ? formatDate(startDate) : 'Start'} - ${endDate ? formatDate(endDate) : 'Today'}`,
          fontSize: 8, alignment: 'center', color: '#64748b', margin: [0, 0, 0, 4],
        },
        {
          layout: 'lightHorizontalLines',
          table: {
            headerRows: 1,
            widths: ['15%', '20%', '55%', '10%'],
            body: [
              [
                { text: 'Date', bold: true, fontSize: 9 },
                { text: 'Status', bold: true, fontSize: 9 },
                { text: 'Remarks', bold: true, fontSize: 9 },
                { text: 'Sl. No', bold: true, fontSize: 9 },
              ],
              ...records.map((r, i) => [
                { text: formatDate(r.date), fontSize: 9 },
                { text: r.status, fontSize: 9 },
                { text: r.remarks || '-', fontSize: 9 },
                { text: i + 1, fontSize: 9 },
              ]),
            ],
          },
        },
        { text: 'Summary', fontSize: 11, bold: true, margin: [0, 14, 0, 6], color: '#1e293b' },
        buildInfoTable([
          ['Total Days', total],
          ['Present', present],
          ['Absent', absent],
          ['Leave', leave],
          ['Attendance Percentage', `${percentage}%`],
        ]),
      ],
    };
    sendPdf(res, doc, `attendance-${student.admissionNo}.pdf`);
  } catch (error) {
    logger.error('Attendance PDF error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const marksheet = async (req, res) => {
  try {
    const studentId = parseInt(req.query.studentId);
    const examId = parseInt(req.query.examId);
    if (!studentId || !examId) return res.status(400).json({ message: 'studentId and examId are required.' });

    const [student, exam, marks] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId }, include: { class: true } }),
      prisma.exam.findUnique({ where: { id: examId }, include: { class: true } }),
      prisma.mark.findMany({
        where: { studentId, examId },
        include: { subject: true, examSubject: true },
        orderBy: { subject: { name: 'asc' } },
      }),
    ]);
    if (!student || !exam) return res.status(404).json({ message: 'Student or exam not found.' });

    const totalMarks = marks.reduce((sum, m) => sum + (parseFloat(m.marksObtained) || 0), 0);
    const totalMaxMarks = marks.reduce((sum, m) => sum + m.examSubject.maxMarks, 0);
    const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
    const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F';

    const settings = await getSettings();
    const logo = getLogoDataUri(settings.school_logo);

    const doc = {
      content: [
        ...buildHeader(settings, logo),
        { text: 'Marksheet', fontSize: 15, bold: true, alignment: 'center', margin: [0, 14, 0, 2], color: '#1e293b' },
        { text: `${exam.name}${exam.term ? ' - ' + exam.term : ''}`, fontSize: 10, alignment: 'center', color: '#334155' },
        { text: `Class: ${exam.class ? exam.class.name + (exam.class.section ? ' - ' + exam.class.section : '') : '-'}`, fontSize: 9, alignment: 'center', color: '#64748b', margin: [0, 2, 0, 4] },
        {
          layout: 'lightHorizontalLines',
          table: {
            headerRows: 1,
            widths: ['8%', '42%', '12%', '14%', '12%', '12%'],
            body: [
              [
                { text: 'Sl. No', bold: true, fontSize: 9 },
                { text: 'Subject', bold: true, fontSize: 9 },
                { text: 'Max Marks', bold: true, fontSize: 9 },
                { text: 'Marks Obtained', bold: true, fontSize: 9 },
                { text: 'Grade', bold: true, fontSize: 9 },
                { text: 'Remarks', bold: true, fontSize: 9 },
              ],
              ...marks.map((m, i) => [
                { text: i + 1, fontSize: 9 },
                { text: m.subject ? m.subject.name : '-', fontSize: 9 },
                { text: m.examSubject.maxMarks, fontSize: 9 },
                { text: m.marksObtained !== null ? parseFloat(m.marksObtained) : 'AB', fontSize: 9 },
                { text: m.grade || '-', fontSize: 9 },
                { text: m.remarks || '-', fontSize: 9 },
              ]),
            ],
          },
        },
        { text: 'Result Summary', fontSize: 11, bold: true, margin: [0, 14, 0, 6], color: '#1e293b' },
        buildInfoTable([
          ['Student', `${student.name} (${student.admissionNo})`],
          ['Total Subjects', marks.length],
          ['Total Marks', `${totalMarks} / ${totalMaxMarks}`],
          ['Percentage', `${percentage.toFixed(2)}%`],
          ['Overall Grade', grade],
        ]),
      ],
    };
    sendPdf(res, doc, `marksheet-${student.admissionNo}.pdf`);
  } catch (error) {
    logger.error('Marksheet PDF error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const feeReceipt = async (req, res) => {
  try {
    const fee = await prisma.fee.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { student: { include: { class: true } } },
    });
    if (!fee) return res.status(404).json({ message: 'Fee record not found.' });

    const settings = await getSettings();
    const logo = getLogoDataUri(settings.school_logo);

    const doc = {
      content: [
        ...buildHeader(settings, logo),
        { text: 'Fee Receipt', fontSize: 15, bold: true, alignment: 'center', margin: [0, 14, 0, 2], color: '#1e293b' },
        { text: `Receipt No: RCP-${String(fee.id).padStart(6, '0')}`, fontSize: 9, alignment: 'center', color: '#64748b' },
        { text: `Date: ${formatDate(new Date())}`, fontSize: 9, alignment: 'center', color: '#64748b', margin: [0, 2, 0, 6] },
        sectionTitle('Student Details'),
        buildInfoTable([
          ['Student Name', fee.student.name],
          ['Admission Number', fee.student.admissionNo],
          ['Class', fee.student.class ? `${fee.student.class.name}${fee.student.class.section ? ' - ' + fee.student.class.section : ''}` : '-'],
        ]),
        sectionTitle('Payment Details'),
        {
          layout: 'lightHorizontalLines',
          table: {
            widths: ['50%', '50%'],
            body: [
              [{ text: 'Fee Type', bold: true, fontSize: 9 }, { text: String(fee.type).toUpperCase(), fontSize: 9 }],
              [{ text: 'Amount', bold: true, fontSize: 9 }, { text: formatMoney(fee.amount), fontSize: 9 }],
              [{ text: 'Paid Amount', bold: true, fontSize: 9 }, { text: formatMoney(fee.paidAmount), fontSize: 9 }],
              [{ text: 'Due Date', bold: true, fontSize: 9 }, { text: formatDate(fee.dueDate), fontSize: 9 }],
              [{ text: 'Status', bold: true, fontSize: 9 }, { text: String(fee.status).toUpperCase(), fontSize: 9 }],
              [{ text: 'Balance', bold: true, fontSize: 9 }, { text: formatMoney(parseFloat(fee.amount) - parseFloat(fee.paidAmount)), fontSize: 9 }],
            ],
          },
        },
        { text: 'This is a computer-generated receipt and does not require a signature.', fontSize: 8, italics: true, color: '#64748b', margin: [0, 16, 0, 0] },
      ],
    };
    sendPdf(res, doc, `fee-receipt-${fee.student.admissionNo}.pdf`);
  } catch (error) {
    logger.error('Fee PDF error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { studentProfile, teacherProfile, attendanceReport, marksheet, feeReceipt };
