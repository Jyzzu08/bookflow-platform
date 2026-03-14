const test = require('node:test');
const assert = require('node:assert/strict');
process.env.SKIP_EXTERNAL_INIT = '1';
const { createApp } = require('../src/app');

test('users-profile health', async () => {
  const app = await createApp();
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  await app.close();
});
