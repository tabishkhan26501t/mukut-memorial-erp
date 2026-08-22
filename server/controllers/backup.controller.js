const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const logger = require('../utils/logger');
const { logActivity } = require('../utils/audit');

const getDbConfig = () => {
  const url = new URL(process.env.DATABASE_URL);
  return {
    host: url.hostname,
    port: url.port || '3306',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  };
};

const getBackupDir = () => process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');

const findBinary = (names) => {
  for (const name of names) {
    try {
      const result = require('child_process').spawnSync(name, ['--version'], { stdio: 'ignore' });
      if (result.error === undefined && result.status !== null) return name;
    } catch (e) { /* continue */ }
  }
  return null;
};

const getMysqldumpPath = () => {
  if (process.env.MYSQLDUMP_PATH) return process.env.MYSQLDUMP_PATH;
  const candidates = [
    'mysqldump',
    'C:\\Program Files\\MySQL\\MySQL Server 9.7\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 9.0\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
    'C:\\xampp\\mysql\\bin\\mysqldump.exe',
    'C:\\wamp64\\bin\\mysql\\mysql8.0.30\\bin\\mysqldump.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) || findBinary([c])) return c;
  }
  return 'mysqldump';
};

const getMysqlPath = () => {
  if (process.env.MYSQL_PATH) return process.env.MYSQL_PATH;
  const candidates = [
    'mysql',
    'C:\\Program Files\\MySQL\\MySQL Server 9.7\\bin\\mysql.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 9.0\\bin\\mysql.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
    'C:\\xampp\\mysql\\bin\\mysql.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) || findBinary([c])) return c;
  }
  return 'mysql';
};

const writeCredentialFile = () => {
  const { user, password } = getDbConfig();
  const cnf = path.join(require('os').tmpdir(), `my_${process.pid}_${Date.now()}.cnf`);
  fs.writeFileSync(cnf, `[client]\nuser=${user}\npassword=${password}\n`, { mode: 0o600 });
  return cnf;
};

const runDump = (targetFile) => {
  const { host, port, database } = getDbConfig();
  const cnf = writeCredentialFile();
  return new Promise((resolve, reject) => {
    execFile(
      getMysqldumpPath(),
      ['--defaults-extra-file=' + cnf, '-h', host, '-P', port, '--single-transaction', '--routines', '--triggers', '--set-gtid-purged=OFF', database],
      { maxBuffer: 1024 * 1024 * 512, windowsHide: true },
      (error, stdout, stderr) => {
        fs.unlinkSync(cnf);
        if (error) return reject(new Error(stderr || error.message));
        fs.writeFileSync(targetFile, stdout);
        resolve(targetFile);
      }
    );
  });
};

const runRestore = (file) => {
  const { host, port, database } = getDbConfig();
  const cnf = writeCredentialFile();
  return new Promise((resolve, reject) => {
    const mysql = execFile(
      getMysqlPath(),
      ['--defaults-extra-file=' + cnf, '-h', host, '-P', port, database],
      { maxBuffer: 1024 * 1024 * 512, windowsHide: true },
      (error, stdout, stderr) => {
        fs.unlinkSync(cnf);
        if (error) return reject(new Error(stderr || error.message));
        resolve(stdout);
      }
    );
    fs.createReadStream(file).pipe(mysql.stdin);
  });
};

const isSafeBackupName = (name) => {
  const base = path.basename(name);
  return base === name && /^school_erp_\d{8}_\d{6}\.sql$/.test(name);
};

const verifyBackup = (file) => {
  try {
    const stat = fs.statSync(file);
    if (stat.size === 0) return false;
    const fd = fs.openSync(file, 'r');
    const buffer = Buffer.alloc(512);
    fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);
    const head = buffer.toString('utf8', 0, 512);
    return head.includes('-- MySQL dump') || head.includes('CREATE TABLE');
  } catch (e) {
    return false;
  }
};

const pruneOldBackups = () => {
  try {
    const retention = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    const dir = getBackupDir();
    if (!fs.existsSync(dir)) return;
    const cutoff = Date.now() - retention * 24 * 60 * 60 * 1000;
    for (const entry of fs.readdirSync(dir)) {
      if (!isSafeBackupName(entry)) continue;
      const file = path.join(dir, entry);
      const stat = fs.statSync(file);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(file);
        logger.info(`Pruned old backup: ${entry}`);
      }
    }
  } catch (error) {
    logger.error('Prune backups error:', error);
  }
};

const getBackups = async (req, res) => {
  try {
    const dir = getBackupDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const files = fs
      .readdirSync(dir)
      .filter((f) => isSafeBackupName(f))
      .map((f) => {
        const file = path.join(dir, f);
        const stat = fs.statSync(file);
        return {
          filename: f,
          size: stat.size,
          sizeMB: parseFloat((stat.size / (1024 * 1024)).toFixed(2)),
          createdAt: stat.mtime.toISOString(),
          verified: verifyBackup(file),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ backups: files });
  } catch (error) {
    logger.error('List backups error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createBackup = async (req, res) => {
  try {
    const dir = getBackupDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ts = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const filename = `school_erp_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.sql`;
    const targetFile = path.join(dir, filename);

    await runDump(targetFile);
    pruneOldBackups();

    const stat = fs.statSync(targetFile);
    const result = {
      filename,
      size: stat.size,
      sizeMB: parseFloat((stat.size / (1024 * 1024)).toFixed(2)),
      createdAt: stat.mtime.toISOString(),
      verified: verifyBackup(targetFile),
    };
    logActivity({ req, action: 'BACKUP', entity: 'Backup', entityId: filename, description: `Manual backup created (${result.sizeMB} MB)` });
    res.status(201).json(result);
  } catch (error) {
    logger.error('Create backup error:', error);
    res.status(500).json({ message: 'Backup failed. Check mysqldump availability.' });
  }
};

const restoreBackup = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename || !isSafeBackupName(filename)) {
      return res.status(400).json({ message: 'Invalid backup filename.' });
    }
    const file = path.join(getBackupDir(), filename);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ message: 'Backup file not found.' });
    }
    if (!verifyBackup(file)) {
      return res.status(400).json({ message: 'Backup file is corrupted or invalid.' });
    }
    await runRestore(file);
    logActivity({ req, action: 'RESTORE', entity: 'Backup', entityId: filename, description: 'Database restored from backup' });
    res.json({ message: 'Database restored successfully.' });
  } catch (error) {
    logger.error('Restore backup error:', error);
    res.status(500).json({ message: 'Restore failed: ' + (error.message || 'Unknown error') });
  }
};

const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!isSafeBackupName(filename)) {
      return res.status(400).json({ message: 'Invalid backup filename.' });
    }
    const file = path.join(getBackupDir(), filename);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ message: 'Backup file not found.' });
    }
    fs.unlinkSync(file);
    logActivity({ req, action: 'DELETE', entity: 'Backup', entityId: filename, description: 'Backup deleted' });
    res.json({ message: 'Backup deleted.' });
  } catch (error) {
    logger.error('Delete backup error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!isSafeBackupName(filename)) {
      return res.status(400).json({ message: 'Invalid backup filename.' });
    }
    const file = path.join(getBackupDir(), filename);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ message: 'Backup file not found.' });
    }
    res.download(file, filename);
  } catch (error) {
    logger.error('Download backup error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { getBackups, createBackup, restoreBackup, deleteBackup, downloadBackup };
