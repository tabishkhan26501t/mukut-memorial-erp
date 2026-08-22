const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');

const printer = new PdfPrinter({
  Roboto: {
    normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
    bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
    italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
  },
});

const getSettings = async () => {
  const rows = await prisma.setting.findMany();
  const settings = {};
  rows.forEach((row) => { settings[row.key] = row.value; });
  return settings;
};

const getLogoDataUri = (logoPath) => {
  if (!logoPath) return null;
  let absolute = logoPath;
  if (logoPath.startsWith('/uploads/')) {
    absolute = path.join(__dirname, '..', 'uploads', path.basename(logoPath));
  }
  try {
    if (!fs.existsSync(absolute)) return null;
    const ext = path.extname(absolute).toLowerCase().replace('.', '');
    const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext;
    const data = fs.readFileSync(absolute).toString('base64');
    return `data:image/${mime};base64,${data}`;
  } catch (e) {
    return null;
  }
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatMoney = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
};

const buildHeader = (settings, logo) => {
  const headerLines = [];
  if (logo) {
    headerLines.push({ image: logo, width: 64, height: 64, alignment: 'center' });
  }
  headerLines.push(
    { text: settings.school_name || 'School', fontSize: 18, bold: true, alignment: 'center', color: '#1e293b' },
  );
  if (settings.school_address) {
    headerLines.push({ text: settings.school_address, fontSize: 9, alignment: 'center', color: '#475569', margin: [0, 2, 0, 0] });
  }
  const contact = [settings.school_phone, settings.school_email, settings.school_website].filter(Boolean).join(' | ');
  if (contact) {
    headerLines.push({ text: contact, fontSize: 9, alignment: 'center', color: '#475569', margin: [0, 1, 0, 0] });
  }
  const meta = [settings.academic_year ? `Academic Year: ${settings.academic_year}` : '', settings.principal_name ? `Principal: ${settings.principal_name}` : ''].filter(Boolean).join('    ');
  if (meta) {
    headerLines.push({ text: meta, fontSize: 9, alignment: 'center', color: '#334155', margin: [0, 3, 0, 0] });
  }
  headerLines.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#2563eb' }], margin: [0, 6, 0, 0] });
  return headerLines;
};

const buildFooter = () => ({
  margin: [40, 20, 40, 10],
  columns: [
    { text: formatDate(new Date()), alignment: 'left', fontSize: 8, color: '#64748b' },
    { text: 'Page {{page}} of {{pages}}', alignment: 'right', fontSize: 8, color: '#64748b' },
  ],
});

const makePdf = (docDefinition) => {
  const options = {
    ...docDefinition,
    footer: docDefinition.footer || buildFooter(),
    pageMargins: docDefinition.pageMargins || [40, 40, 40, 60],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
  };
  return printer.createPdfKitDocument(options);
};

const sectionTitle = (text) => ({
  text,
  fontSize: 11,
  bold: true,
  color: '#1e293b',
  margin: [0, 14, 0, 6],
  decoration: 'underline',
  decorationColor: '#2563eb',
});

module.exports = { getSettings, getLogoDataUri, formatDate, formatMoney, buildHeader, makePdf, sectionTitle };
