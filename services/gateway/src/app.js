const Fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const { z } = require('zod');

const identityBase = process.env.IDENTITY_BASE_URL || 'http://identity:3001';
const catalogBase = process.env.CATALOG_BASE_URL || 'http://catalog:8081';
const commentsBase = process.env.COMMENTS_BASE_URL || 'http://comments:8001';
const ordersBase = process.env.ORDERS_BASE_URL || 'http://orders:3003';
const paymentsBase = process.env.PAYMENTS_BASE_URL || 'http://payments-mock:8002';
const searchBase = process.env.SEARCH_BASE_URL || 'http://search-index:3004';

async function proxyJson(method, url, payload, headers = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return {
    statusCode: response.status,
    headers: response.headers,
    body
  };
}

function registerLegacyRoutes(app) {
  const authSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  });

  app.post('/register', async (request, reply) => {
    const parsed = authSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Introduce usuario y contrasena' });
    }

    const result = await proxyJson('POST', `${identityBase}/v1/register`, parsed.data);
    return reply.code(result.statusCode).send(result.body);
  });

  app.post('/auth', async (request, reply) => {
    const parsed = authSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Introduce usuario y contrasena' });
    }

    const result = await proxyJson('POST', `${identityBase}/v1/auth`, parsed.data);
    if (typeof result.body === 'object' && result.body?.token) {
      reply.header('auth-token', result.body.token);
    }
    return reply.code(result.statusCode).send(result.body);
  });

  app.get('/get-user-info', async (request, reply) => {
    const token = request.headers['auth-token'] || request.query?.token;
    const result = await proxyJson('GET', `${identityBase}/v1/get-user-info`, null, {
      'auth-token': token || ''
    });
    return reply.code(result.statusCode).send(result.body);
  });

  app.get('/posts', async (request, reply) => {
    const token = request.headers['auth-token'] || request.query?.token;
    const result = await proxyJson('GET', `${identityBase}/v1/posts`, null, {
      'auth-token': token || ''
    });
    return reply.code(result.statusCode).send(result.body);
  });

  app.get('/api/get_all/:id_user/:token', async (request, reply) => {
    const { id_user, token } = request.params;
    const result = await proxyJson('GET', `${catalogBase}/v1/get_all/${id_user}/${token}`);
    return reply.code(result.statusCode).send(result.body);
  });

  app.get('/api/get/:id/:token', async (request, reply) => {
    const { id, token } = request.params;
    const result = await proxyJson('GET', `${catalogBase}/v1/get/${id}/${token}`);
    return reply.code(result.statusCode).send(result.body);
  });
}

function registerV2Routes(app) {
  app.post('/v2/auth/login', async (request, reply) => {
    const result = await proxyJson('POST', `${identityBase}/v2/auth/login`, request.body || {});
    return reply.code(result.statusCode).send(result.body);
  });

  app.post('/v2/auth/refresh', async (request, reply) => {
    const result = await proxyJson('POST', `${identityBase}/v2/auth/refresh`, request.body || {});
    return reply.code(result.statusCode).send(result.body);
  });

  app.post('/v2/auth/logout', async (request, reply) => {
    const result = await proxyJson('POST', `${identityBase}/v2/auth/logout`, request.body || {});
    return reply.code(result.statusCode).send(result.body);
  });

  app.get('/v2/auth/me', async (request, reply) => {
    const token = request.headers.authorization || '';
    const result = await proxyJson('GET', `${identityBase}/v2/auth/me`, null, {
      authorization: token
    });
    return reply.code(result.statusCode).send(result.body);
  });

  app.get('/v2/catalog/books', async (request, reply) => {
    const result = await proxyJson('GET', `${catalogBase}/v2/catalog/books`);
    return reply.code(result.statusCode).send(result.body);
  });

  app.get('/v2/comments', async (request, reply) => {
    const qs = new URLSearchParams(request.query || {}).toString();
    const suffix = qs ? `?${qs}` : '';
    const result = await proxyJson('GET', `${commentsBase}/v2/comments${suffix}`);
    return reply.code(result.statusCode).send(result.body);
  });

  app.post('/v2/comments', async (request, reply) => {
    const result = await proxyJson('POST', `${commentsBase}/v2/comments`, request.body || {});
    return reply.code(result.statusCode).send(result.body);
  });

  app.post('/v2/orders', async (request, reply) => {
    const result = await proxyJson('POST', `${ordersBase}/v2/orders`, request.body || {});
    return reply.code(result.statusCode).send(result.body);
  });

  app.get('/v2/orders', async (request, reply) => {
    const result = await proxyJson('GET', `${ordersBase}/v2/orders`);
    return reply.code(result.statusCode).send(result.body);
  });

  app.post('/v2/payments', async (request, reply) => {
    const result = await proxyJson('POST', `${paymentsBase}/v2/payments`, request.body || {});
    return reply.code(result.statusCode).send(result.body);
  });

  app.get('/v2/search', async (request, reply) => {
    const qs = new URLSearchParams(request.query || {}).toString();
    const suffix = qs ? `?${qs}` : '';
    const result = await proxyJson('GET', `${searchBase}/v2/search${suffix}`);
    return reply.code(result.statusCode).send(result.body);
  });
}

async function createApp() {
  const app = Fastify({
    logger: true,
    routerOptions: {
      maxParamLength: 4096
    }
  });

  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute'
  });

  app.get('/health', async () => ({
    service: 'gateway',
    status: 'ok',
    version: '1.0.0'
  }));

  app.get('/v2/meta', async () => ({
    name: 'BookFlow Platform Gateway',
    compatibility: 'v1 + v2',
    author: {
      name: process.env.AUTHOR_NAME || 'Jesus David Manzanero',
      role: process.env.AUTHOR_ROLE || 'Systems & Network Engineer'
    }
  }));

  registerLegacyRoutes(app);
  registerV2Routes(app);

  return app;
}

module.exports = { createApp, proxyJson };
