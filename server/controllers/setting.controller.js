const prisma = require('../config/db');
const pick = require('../utils/pick');
const { logActivity } = require('../utils/audit');

const getSettings = async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const ALLOWED_SETTING_KEYS = ['school_name', 'school_principal', 'school_address', 'school_phone', 'school_email', 'school_website', 'school_logo', 'academic_year', 'grading_system'];

const updateSettings = async (req, res) => {
  try {
    const settings = pick(req.body, ALLOWED_SETTING_KEYS);
    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    logActivity({ req, action: 'UPDATE', entity: 'Setting', description: `Updated settings: ${Object.keys(settings).join(', ')}` });
    res.json({ message: 'Settings updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const logoPath = `/uploads/${req.file.filename}`;
    await prisma.setting.upsert({
      where: { key: 'school_logo' },
      update: { value: logoPath },
      create: { key: 'school_logo', value: logoPath },
    });
    logActivity({ req, action: 'UPDATE', entity: 'Setting', description: 'Uploaded school logo' });
    res.json({ message: 'Logo uploaded successfully.', school_logo: logoPath });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getPublicSettings = async (req, res) => {
  try {
    const keys = ['school_name', 'school_logo', 'school_address', 'school_phone', 'school_email'];
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const result = {};
    rows.forEach((s) => { result[s.key] = s.value; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getSettings, getPublicSettings, updateSettings, uploadLogo };
