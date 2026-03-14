const Fastify = require('fastify');
const amqp = require('amqplib');

let workerStatus = 'initializing';

async function startWorker(log) {
  if (process.env.SKIP_EXTERNAL_INIT === '1') {
    workerStatus = 'skipped';
    return;
  }

  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672');
    const channel = await connection.createChannel();

    await channel.assertExchange('bookflow.events', 'topic', { durable: true });
    const queue = 'bookflow.notifications';
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, 'bookflow.events', '#');

    channel.consume(queue, (message) => {
      if (!message) {
        return;
      }

      const routingKey = message.fields.routingKey;
      const payload = message.content.toString();

      log.info({ routingKey, payload }, 'notification event consumed');
      channel.ack(message);
    });

    workerStatus = 'connected';
  } catch (error) {
    workerStatus = 'degraded';
    log.warn(`notifications worker degraded: ${error.message}`);
  }
}

async function createApp() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({
    service: 'notifications',
    status: 'ok',
    workerStatus
  }));

  await startWorker(app.log);
  return app;
}

module.exports = { createApp };
