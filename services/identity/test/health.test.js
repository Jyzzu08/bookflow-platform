const test = require('node:test');
const assert = require('node:assert/strict');

process.env.IDENTITY_DB_URL = process.env.IDENTITY_DB_URL || 'postgres://bookflow:bookflow@localhost:5432/bookflow';
process.env.SKIP_EXTERNAL_INIT = '1';

const { createApp } = require('../src/app');

test('health endpoint is available', async () => {
  const app = await createApp();
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  await app.close();
});
