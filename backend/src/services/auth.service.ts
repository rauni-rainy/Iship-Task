import pool from '../db/pool';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/errorHandler';
import { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } from '../utils/jwt.util';

// Constants
const SALT_ROUNDS = 12;

export const register = async (username: string, email: string, password: string) => {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  // Validate username format (3-30 chars, alphanumeric + underscore)
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  if (!usernameRegex.test(username)) {
    throw new AppError('Username must be 3-30 characters long and contain only letters, numbers, and underscores', 400);
  }

  // Check if email already exists
  const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (emailCheck.rows.length > 0) {
    throw new AppError('Email already in use', 409);
  }

  // Check if username already exists
  const usernameCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (usernameCheck.rows.length > 0) {
    throw new AppError('Username already taken', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Insert user
  const result = await pool.query(
    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role, avatar_url, created_at, updated_at',
    [username, email, passwordHash]
  );

  return result.rows[0];
};

export const login = async (email: string, password: string) => {
  // Find user by email
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id);

  // Store hashed refresh token in DB
  const hashedRefreshToken = hashToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, hashedRefreshToken, expiresAt]
  );

  // Remove password from user object
  delete user.password_hash;

  return { user, accessToken, refreshToken };
};

export const logout = async (userId: string, refreshToken: string) => {
  if (refreshToken) {
    const hashedRefreshToken = hashToken(refreshToken);
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashedRefreshToken]);
  }
};

export const refreshAccessToken = async (incomingRefreshToken: string) => {
  if (!incomingRefreshToken) {
    throw new AppError('No refresh token provided', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Check if token exists in DB and is not expired
  const hashedToken = hashToken(incomingRefreshToken);
  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
    [hashedToken]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Verify the user still exists
  const userResult = await pool.query('SELECT id, role FROM users WHERE id = $1', [decoded.userId]);
  const user = userResult.rows[0];
  if (!user) {
    throw new AppError('User no longer exists', 401);
  }

  // Generate new access token
  return signAccessToken(user.id, user.role);
};

export const getProfile = async (userId: string) => {
  const result = await pool.query(
    'SELECT id, username, email, role, avatar_url, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );

  const user = result.rows[0];
  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};
