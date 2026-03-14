const { createApp } = require('./app');

const port = Number(process.env.SEARCH_PORT || 3004);
const host = '0.0.0.0';

async function start() {
  const app = await createApp();
  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
