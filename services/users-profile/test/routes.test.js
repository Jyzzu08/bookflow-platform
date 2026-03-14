const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SKIP_EXTERNAL_INIT = '1';

const { createApp } = require('../src/app');

function createFakePool() {
  const profiles = new Map();

  return {
    query: async (sql, params = []) => {
      if (sql.startsWith('INSERT INTO profiles')) {
        profiles.set(params[0], {
          user_id: params[0],
          display_name: params[1],
          bio: params[2],
          location: params[3]
        });
        return { rows: [] };
      }

      if (sql.startsWith('SELECT * FROM profiles WHERE user_id = $1 LIMIT 1')) {
        const profile = profiles.get(params[0]);
        return { rows: profile ? [profile] : [] };
      }

      if (sql.startsWith('CREATE TABLE IF NOT EXISTS profiles')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${sql}`);
    }
  };
}

test('users-profile rejects invalid profile payloads', async () => {
  const app = await createApp({
    skipExternalInit: true,
    pool: createFakePool()
  });

  const response = await app.inject({
    method: 'PUT',
    url: '/v2/users/demo-user/profile',
    payload: { displayName: '' }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'invalid_profile_payload');

  await app.close();
});

test('users-profile upserts and returns profile data', async () => {
  const fakePool = createFakePool();
  const app = await createApp({
    skipExternalInit: true,
    pool: fakePool
  });

  const update = await app.inject({
    method: 'PUT',
    url: '/v2/users/demo-user/profile',
    payload: {
      displayName: 'Jesus Manzanero',
      bio: 'Systems & Network Engineer',
      location: 'Valencia, Spain'
    }
  });

  assert.equal(update.statusCode, 200);
  assert.equal(update.json().displayName, 'Jesus Manzanero');

  const fetch = await app.inject({
    method: 'GET',
    url: '/v2/users/demo-user/profile'
  });

  assert.equal(fetch.statusCode, 200);
  assert.equal(fetch.json().location, 'Valencia, Spain');

  await app.close();
});

test('users-profile returns 404 for unknown profiles', async () => {
  const app = await createApp({
    skipExternalInit: true,
    pool: createFakePool()
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v2/users/missing/profile'
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error, 'profile_not_found');

  await app.close();
});
