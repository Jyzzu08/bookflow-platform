const { createApp } = require('./app');

const port = Number(process.env.IDENTITY_PORT || 3001);
const host = '0.0.0.0';

async function start() {
  const app = await createApp();
  try {
    await app.listen({ port, host });
    app.log.info(`identity running on ${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
