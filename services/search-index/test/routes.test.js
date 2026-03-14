const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('search-index falls back to local documents when meilisearch is unavailable', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('meilisearch unavailable');
  };

  const app = await createApp();

  const indexResponse = await app.inject({
    method: 'POST',
    url: '/v2/search/index',
    payload: {
      id: 'book-1',
      title: 'Zero Trust Networks',
      description: 'Security and network hardening'
    }
  });

  assert.equal(indexResponse.statusCode, 202);

  const searchResponse = await app.inject({
    method: 'GET',
    url: '/v2/search?q=trust'
  });

  assert.equal(searchResponse.statusCode, 200);
  assert.equal(searchResponse.json().source, 'fallback');
  assert.equal(searchResponse.json().hits[0].title, 'Zero Trust Networks');

  await app.close();
  global.fetch = originalFetch;
});
