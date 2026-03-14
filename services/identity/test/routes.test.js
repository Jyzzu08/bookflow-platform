const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/app');

function createFakeStore() {
  const usersById = new Map();
  const usersByUsername = new Map();
  const refreshTokens = new Set();
  let userCounter = 1;
  let refreshCounter = 1;

  return {
    pool: {
      query: async (sql, params = []) => {
        if (sql.startsWith('INSERT INTO users')) {
          const [id, username, passwordHash, role] = params;
          const user = { id, username, password_hash: passwordHash, role };
          usersById.set(id, user);
          usersByUsername.set(username, user);
          return { rows: [{ id, username }] };
        }

        if (sql.includes('SELECT * FROM users WHERE username')) {
          const user = usersByUsername.get(params[0]);
          return { rows: user ? [user] : [] };
        }

        if (sql.includes('SELECT * FROM users WHERE id')) {
          const user = usersById.get(params[0]);
          return { rows: user ? [user] : [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
      }
    },
    initDatabase: async () => {},
    initRedis: async () => {},
    signAccessToken: (user) => `access:${user.id}`,
    signRefreshToken: (user) => `refresh:${user.id}:${refreshCounter++}`,
    persistRefreshToken: async (token) => {
      refreshTokens.add(token);
    },
    revokeRefreshToken: async (token) => {
      refreshTokens.delete(token);
    },
    hasRefreshToken: async (token) => refreshTokens.has(token),
    verifyAccessToken: (token) => {
      const [prefix, id] = token.split(':');
      if (prefix !== 'access' || !usersById.has(id)) {
        throw new Error('invalid access token');
      }
      const user = usersById.get(id);
      return { id: user.id, username: user.username, role: user.role };
    },
    verifyRefreshToken: (token) => {
      const [prefix, id] = token.split(':');
      if (prefix !== 'refresh' || !usersById.has(id)) {
        throw new Error('invalid refresh token');
      }
      const user = usersById.get(id);
      return { id: user.id, role: user.role, type: 'refresh' };
    },
    randomUUID: () => `user-${userCounter++}`,
    bcrypt: {
      hash: async (value) => `hash:${value}`,
      compare: async (plain, hashed) => hashed === `hash:${plain}`
    }
  };
}

test('v2 login returns access and refresh tokens for valid credentials', async () => {
  const app = await createApp({
    skipExternalInit: true,
    store: createFakeStore()
  });

  await app.inject({
    method: 'POST',
    url: '/register',
    payload: { username: 'demo', password: 'secret' }
  });

  const response = await app.inject({
    method: 'POST',
    url: '/v2/auth/login',
    payload: { username: 'demo', password: 'secret' }
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.json().accessToken, /^access:user-/);
  assert.match(response.json().refreshToken, /^refresh:user-/);
  assert.equal(response.json().user.username, 'demo');

  await app.close();
});

test('v2 refresh rotates refresh tokens and revokes the previous one', async () => {
  const app = await createApp({
    skipExternalInit: true,
    store: createFakeStore()
  });

  await app.inject({
    method: 'POST',
    url: '/register',
    payload: { username: 'refresh-user', password: 'secret' }
  });

  const login = await app.inject({
    method: 'POST',
    url: '/v2/auth/login',
    payload: { username: 'refresh-user', password: 'secret' }
  });

  const firstRefreshToken = login.json().refreshToken;
  const refreshed = await app.inject({
    method: 'POST',
    url: '/v2/auth/refresh',
    payload: { refreshToken: firstRefreshToken }
  });

  assert.equal(refreshed.statusCode, 200);
  assert.notEqual(refreshed.json().refreshToken, firstRefreshToken);

  const rejected = await app.inject({
    method: 'POST',
    url: '/v2/auth/refresh',
    payload: { refreshToken: firstRefreshToken }
  });

  assert.equal(rejected.statusCode, 401);
  assert.equal(rejected.json().error, 'invalid_refresh_token');

  await app.close();
});

test('v2 me requires a bearer token and returns user details when present', async () => {
  const app = await createApp({
    skipExternalInit: true,
    store: createFakeStore()
  });

  await app.inject({
    method: 'POST',
    url: '/register',
    payload: { username: 'profile-user', password: 'secret' }
  });

  const login = await app.inject({
    method: 'POST',
    url: '/v2/auth/login',
    payload: { username: 'profile-user', password: 'secret' }
  });

  const missingToken = await app.inject({
    method: 'GET',
    url: '/v2/auth/me'
  });
  assert.equal(missingToken.statusCode, 401);

  const response = await app.inject({
    method: 'GET',
    url: '/v2/auth/me',
    headers: {
      authorization: `Bearer ${login.json().accessToken}`
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().username, 'profile-user');

  await app.close();
});
