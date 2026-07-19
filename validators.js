const USERNAME_RE = /^[a-zA-Z0-9 &.'-]{2,100}$/; // allows "Acme Corp.", "Jane's Shop", etc.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateUsername(username) {
  if (typeof username !== 'string') return 'Company name is required';
  const trimmed = username.trim();
  if (trimmed.length < 2) return 'Company name must be at least 2 characters';
  if (trimmed.length > 100) return 'Company name is too long';
  if (!USERNAME_RE.test(trimmed)) return 'Company name contains invalid characters';
  return null;
}

function validateEmail(email) {
  if (email === undefined || email === null || email === '') return null; // optional field
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return 'Invalid email address';
  return null;
}

// Reasonable strength requirement without being unusable for a small business app:
// 8+ chars, at least one letter and one number.
function validatePasswordStrength(password) {
  if (typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password is too long';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
}

module.exports = { validateUsername, validateEmail, validatePasswordStrength };
