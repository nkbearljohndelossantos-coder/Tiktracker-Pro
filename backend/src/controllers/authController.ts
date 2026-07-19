import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_token_for_tiktracker_pro_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_for_tiktracker_pro_2026';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '15m';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

/**
 * Generate Access and Refresh tokens
 */
const generateTokens = (user: { id: number; username: string; role: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE as any }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRE as any }
  );

  return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter username and password.' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE username = ?', [username]) as any[];
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to db
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [
      user.id,
      refreshToken,
      expiresAt.toISOString().slice(0, 19).replace('T', ' ')
    ]);

    // Audit Log
    await query('INSERT INTO audit_logs (user_id, action, module, details, ip_address) VALUES (?, ?, ?, ?, ?)', [
      user.id,
      'LOGIN',
      'AUTH',
      `User ${username} successfully authenticated.`,
      req.ip || '127.0.0.1'
    ]);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const register = async (req: Request, res: Response) => {
  const { username, password, email, role } = req.body;

  if (!username || !password || !email || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]) as any[];
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await query(
      'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
      [username, passwordHash, email, role]
    );

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const tokens = await query('SELECT * FROM refresh_tokens WHERE token = ?', [token]) as any[];
    if (tokens.length === 0) {
      return res.status(403).json({ error: 'Invalid refresh token.' });
    }

    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as { id: number };
    const users = await query('SELECT id, username, role, email FROM users WHERE id = ?', [payload.id]) as any[];
    
    if (users.length === 0) {
      return res.status(403).json({ error: 'User does not exist.' });
    }

    const user = users[0];
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Swap token in database
    await query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [
      user.id,
      newRefreshToken,
      expiresAt.toISOString().slice(0, 19).replace('T', ' ')
    ]);

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    res.status(403).json({ error: 'Token validation failed.' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const { token } = req.body;
  if (token) {
    try {
      await query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
    } catch (err) {}
  }
  res.json({ message: 'Logged out successfully.' });
};
