const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { Pool } = require('pg');
const amqp = require('amqplib');
const { randomUUID } = require('node:crypto');
const { z } = require('zod');

const pool = new Pool({
  connectionString: process.env.ORDERS_DB_URL || 'postgres://bookflow:bookflow@postgres:5432/bookflow'
});

const orderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(z.object({
    id: z.string().min(1),
    quantity: z.number().int().min(1)
  })).min(1),
  total: z.number().positive()
});

let channel;

async function connectBus(logger) {
  if (process.env.SKIP_EXTERNAL_INIT === '1') {
    return;
  }

  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertExchange('bookflow.events', 'topic', { durable: true });
  } catch (error) {
    logger.warn(`rabbitmq not connected: ${error.message}`);
  }
}

async function publish(eventKey, payload) {
  if (!channel) {
    return;
  }
  channel.publish('bookflow.events', eventKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true
  });
}

async function createApp() {
  return createAppWithOptions();
}

async function createAppWithOptions(options = {}) {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  const dbPool = options.pool || pool;
  const publishEvent = options.publish || publish;
  const generateOrderId = options.randomUUID || randomUUID;
  const skipExternalInit = options.skipExternalInit ?? process.env.SKIP_EXTERNAL_INIT === '1';

  if (!skipExternalInit) {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        items JSONB NOT NULL,
        total NUMERIC NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  }

  if (!skipExternalInit) {
    await connectBus(app.log);
  }

  app.get('/health', async () => ({ service: 'orders', status: 'ok' }));

  app.post('/v2/orders', async (request, reply) => {
    const parsed = orderSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_order_payload' });
    }

    const orderId = generateOrderId();
    const payload = parsed.data;

    await dbPool.query(
      'INSERT INTO orders (id, user_id, items, total, status) VALUES ($1, $2, $3, $4, $5)',
      [orderId, payload.userId, JSON.stringify(payload.items), payload.total, 'created']
    );

    const eventPayload = {
      orderId,
      userId: payload.userId,
      total: payload.total,
      items: payload.items
    };

    await publishEvent('order.created', eventPayload);

    return reply.code(201).send({
      id: orderId,
      status: 'created',
      ...eventPayload
    });
  });

  app.get('/v2/orders', async () => {
    const { rows } = await dbPool.query('SELECT id, user_id, items, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 100');
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      items: row.items,
      total: Number(row.total),
      status: row.status,
      createdAt: row.created_at
    }));
  });

  return app;
}

module.exports = {
  createApp,
  createAppWithOptions
};
