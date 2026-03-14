const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { z } = require('zod');
const baseStore = require('./store');

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

async function createApp(options = {}) {
  const store = {
    ...baseStore,
    ...(options.store || {})
  };
  const {
    pool,
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
  } = store;
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  const skipExternalInit = options.skipExternalInit ?? process.env.SKIP_EXTERNAL_INIT === '1';
  if (!skipExternalInit) {
    await initDatabase();
    await initRedis();
  }

  app.get('/health', async () => ({ service: 'identity', status: 'ok' }));

  const registerHandler = async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Introduce usuario y contrasena' });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    try {
      const result = await pool.query(
        'INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username',
        [randomUUID(), parsed.data.username, passwordHash, 'user']
      );
      return reply.code(200).send({
        message: 'Usuario creado con exito...',
        id: result.rows[0].id,
        username: result.rows[0].username
      });
    } catch (error) {
      return reply.code(500).send({ message: 'Error al registrar usuario...' });
    }
  };

  const authHandler = async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Introduce usuario y contrasena' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 LIMIT 1', [parsed.data.username]);
    const user = rows[0];

    if (!user) {
      return reply.code(401).send({ message: 'User not found' });
    }

    const valid = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ message: 'Error al comparar passwords' });
    }

    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await persistRefreshToken(refreshToken, user.id);

    reply.header('auth-token', token);
    return reply.code(200).send({ message: 'Usuario autenticado', token, refreshToken });
  };

  const userInfoHandler = async (request, reply) => {
    const token = request.headers['auth-token'] || request.query?.token;
    if (!token) {
      return reply.code(401).send({ message: 'Access denied' });
    }

    try {
      const payload = verifyAccessToken(token);
      return reply.send({ id: payload.id, username: payload.username, role: payload.role });
    } catch {
      return reply.code(401).send({ message: 'Access denied' });
    }
  };

  const postsHandler = async (request, reply) => {
    const token = request.headers['auth-token'] || request.query?.token;
    if (!token) {
      return reply.code(401).send({ message: 'Access denied' });
    }

    try {
      verifyAccessToken(token);
      return reply.send([
        { id: 0, title: 'post 1' },
        { id: 1, title: 'post 2' }
      ]);
    } catch {
      return reply.code(401).send({ message: 'Access denied' });
    }
  };

  app.post('/register', registerHandler);
  app.post('/v1/register', registerHandler);
  app.post('/auth', authHandler);
  app.post('/v1/auth', authHandler);
  app.get('/get-user-info', userInfoHandler);
  app.get('/v1/get-user-info', userInfoHandler);
  app.get('/posts', postsHandler);
  app.get('/v1/posts', postsHandler);

  app.post('/v2/auth/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_credentials' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 LIMIT 1', [parsed.data.username]);
    const user = rows[0];
    if (!user) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    const valid = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await persistRefreshToken(refreshToken, user.id);

    return reply.send({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });

  app.post('/v2/auth/refresh', async (request, reply) => {
    const refreshToken = request.body?.refreshToken;
    if (!refreshToken) {
      return reply.code(400).send({ error: 'missing_refresh_token' });
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      const exists = await hasRefreshToken(refreshToken);
      if (!exists) {
        return reply.code(401).send({ error: 'invalid_refresh_token' });
      }

      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [payload.id]);
      const user = rows[0];
      if (!user) {
        return reply.code(401).send({ error: 'invalid_refresh_token' });
      }

      await revokeRefreshToken(refreshToken);
      const nextRefreshToken = signRefreshToken(user);
      await persistRefreshToken(nextRefreshToken, user.id);

      return reply.send({
        accessToken: signAccessToken(user),
        refreshToken: nextRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 900
      });
    } catch {
      return reply.code(401).send({ error: 'invalid_refresh_token' });
    }
  });

  app.post('/v2/auth/logout', async (request, reply) => {
    const refreshToken = request.body?.refreshToken;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    return reply.code(204).send();
  });

  app.get('/v2/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return reply.code(401).send({ error: 'missing_token' });
    }

    try {
      const payload = verifyAccessToken(token);
      return reply.send({
        id: payload.id,
        username: payload.username,
        role: payload.role
      });
    } catch {
      return reply.code(401).send({ error: 'invalid_token' });
    }
  });

  return app;
}

module.exports = { createApp };
