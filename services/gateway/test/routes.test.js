const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  });
}

test('legacy register proxies payload to identity service', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.match(url, /\/v1\/register$/);
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {
      username: 'demo',
      password: 'secret'
    });
    return jsonResponse({ message: 'Usuario creado con exito...' }, 200);
  };

  const app = await createApp();
  const response = await app.inject({
    method: 'POST',
    url: '/register',
    payload: { username: 'demo', password: 'secret' }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().message, 'Usuario creado con exito...');

  await app.close();
  global.fetch = originalFetch;
});

test('legacy auth forwards auth-token header from downstream response', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    assert.match(url, /\/v1\/auth$/);
    return jsonResponse({ token: 'legacy-token' }, 200);
  };

  const app = await createApp();
  const response = await app.inject({
    method: 'POST',
    url: '/auth',
    payload: { username: 'demo', password: 'secret' }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['auth-token'], 'legacy-token');

  await app.close();
  global.fetch = originalFetch;
});

test('legacy books route supports long token path params', async () => {
  const originalFetch = global.fetch;
  const longToken = 'a'.repeat(512);

  global.fetch = async (url) => {
    assert.match(url, new RegExp(`/v1/get_all/demo-user/${longToken}$`));
    return jsonResponse([{ id: 1, title: 'Book' }], 200);
  };

  const app = await createApp();
  const response = await app.inject({
    method: 'GET',
    url: `/api/get_all/demo-user/${longToken}`
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json()[0].title, 'Book');

  await app.close();
  global.fetch = originalFetch;
});

test('v2 search proxies query string', async () => {
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    assert.match(url, /\/v2\/search\?q=distributed$/);
    return jsonResponse({ hits: [{ id: '1', title: 'Distributed Systems 101' }] }, 200);
  };

  const app = await createApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v2/search?q=distributed'
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().hits[0].title, 'Distributed Systems 101');

  await app.close();
  global.fetch = originalFetch;
});
