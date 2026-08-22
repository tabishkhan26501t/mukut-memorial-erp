const MIN_PASSWORD_LENGTH = 8;

const PASSWORD_RULES = {
  minLength: MIN_PASSWORD_LENGTH,
  requireLetter: true,
  requireNumber: true,
};

const validatePasswordStrength = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required.' };
  }
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password must be a string.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter.' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true, message: '' };
};

module.exports = { validatePasswordStrength, PASSWORD_RULES };