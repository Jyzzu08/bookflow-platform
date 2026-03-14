const { Pool } = require('pg');
const Redis = require('ioredis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');

const pool = new Pool({
  connectionString: process.env.IDENTITY_DB_URL || 'postgres://bookflow:bookflow@postgres:5432/bookflow'
});

const redisUrl = process.env.IDENTITY_REDIS_URL || 'redis://redis:6379';
const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
let redisReady = false;

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  const passwordHash = await bcrypt.hash('admin123', 10);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO NOTHING`,
    ['admin-seed', 'admin', passwordHash, 'admin']
  );
}

async function initRedis() {
  try {
    await redis.connect();
    redisReady = true;
  } catch (error) {
    redisReady = false;
    console.warn('redis unavailable, fallback memory mode', error.message);
  }
}

const refreshMemory = new Map();

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.IDENTITY_JWT_SECRET || 'dev_access_secret',
    { expiresIn: '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, type: 'refresh' },
    process.env.IDENTITY_REFRESH_SECRET || 'dev_refresh_secret',
    { expiresIn: '7d' }
  );
}

async function persistRefreshToken(token, userId) {
  if (redisReady) {
    await redis.set(`refresh:${token}`, userId, 'EX', 60 * 60 * 24 * 7);
    return;
  }
  refreshMemory.set(token, userId);
}

async function revokeRefreshToken(token) {
  if (redisReady) {
    await redis.del(`refresh:${token}`);
    return;
  }
  refreshMemory.delete(token);
}

async function hasRefreshToken(token) {
  if (redisReady) {
    return Boolean(await redis.get(`refresh:${token}`));
  }
  return refreshMemory.has(token);
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.IDENTITY_JWT_SECRET || 'dev_access_secret');
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.IDENTITY_REFRESH_SECRET || 'dev_refresh_secret');
}

module.exports = {
  pool,
  redis,
  initDatabase,
  initRedis,
  signAccessToken,
  signRefreshToken,
  persistRefreshToken,
  revokeRefreshToken,
  hasRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  randomUUID,
  bcrypt
};
