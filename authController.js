const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('./userModel');
const { pool } = require('./db');
const {
  validateUsername,
  validateEmail,
  validatePasswordStrength,
} = require('./validators');

const BCRYPT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email || null };
}

async function register(req, res) {
  try {
    const { username, password, email } = req.body || {};

    const usernameErr = validateUsername(username);
    if (usernameErr) return res.status(400).json({ ok: false, msg: usernameErr });

    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ ok: false, msg: emailErr });

    const passwordErr = validatePasswordStrength(password);
    if (passwordErr) return res.status(400).json({ ok: false, msg: passwordErr });

    const trimmedUsername = username.trim();

    const existingUsername = await userModel.findByUsername(trimmedUsername);
    if (existingUsername) {
      return res.status(409).json({ ok: false, msg: 'Company name already taken' });
    }

    if (email) {
      const existingEmail = await userModel.findByEmail(email.trim());
      if (existingEmail) {
        return res.status(409).json({ ok: false, msg: 'Email already registered' });
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await userModel.createUser({
      username: trimmedUsername,
      email: email ? email.trim() : null,
      passwordHash,
    });

    const token = signToken(user);
    return res.status(201).json({ ok: true, token, user: publicUser(user) });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ ok: false, msg: 'Something went wrong. Please try again.' });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ ok: false, msg: 'Enter company name and password' });
    }

    const user = await userModel.findByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ ok: false, msg: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ ok: false, msg: 'Invalid username or password' });
    }

    const token = signToken(user);
    return res.json({ ok: true, token, user: publicUser(user) });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ ok: false, msg: 'Something went wrong. Please try again.' });
  }
}

async function logout(req, res) {
  return res.json({ ok: true });
}

async function profile(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found' });
    return res.json({ ok: true, user: publicUser(user) });
  } catch (err) {
    console.error('profile error:', err);
    return res.status(500).json({ ok: false, msg: 'Something went wrong.' });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, msg: 'Email is required' });

    const user = await userModel.findByEmail(email.trim());
    if (!user) {
      return res.json({ ok: true, msg: 'If that email is registered, a reset link has been sent.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    return res.json({ ok: true, msg: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ ok: false, msg: 'Something went wrong.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ ok: false, msg: 'Token and new password are required' });
    }

    const passwordErr = validatePasswordStrength(newPassword);
    if (passwordErr) return res.status(400).json({ ok: false, msg: passwordErr });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND used = false AND expires_at > now()`,
      [tokenHash]
    );
    const resetRecord = rows[0];
    if (!resetRecord) {
      return res.status(400).json({ ok: false, msg: 'Invalid or expired reset link' });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await userModel.updatePasswordHash(resetRecord.user_id, passwordHash);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetRecord.id]);

    return res.json({ ok: true, msg: 'Password updated. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ ok: false, msg: 'Something went wrong.' });
  }
}

module.exports = { register, login, logout, profile, forgotPassword, resetPassword };
