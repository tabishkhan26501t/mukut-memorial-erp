const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const OPTIONAL = ['PORT', 'FRONTEND_URL', 'UPLOAD_DIR', 'BACKUP_DIR', 'BACKUP_RETENTION_DAYS', 'MYSQLDUMP_PATH', 'MYSQL_PATH', 'DEMO_MODE', 'DEMO_RESET_TOKEN', 'VITE_API_URL', 'VITE_DEMO_MODE'];

const validateEnv = () => {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  const warnings = OPTIONAL.filter((key) => !process.env[key]);

  const result = {
    valid: missing.length === 0,
    missing,
    warnings,
  };

  if (missing.length > 0) {
    console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
  }
  if (warnings.length > 0) {
    console.warn(`[env] Using defaults for: ${warnings.join(', ')}`);
  }
  return result;
};

module.exports = { validateEnv, REQUIRED };
