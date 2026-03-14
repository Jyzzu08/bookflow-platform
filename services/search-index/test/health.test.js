const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('search health endpoint', async () => {
  const app = await createApp();
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  await app.close();
});
