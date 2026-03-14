const test = require('node:test');
const assert = require('node:assert/strict');

const { createAppWithOptions } = require('../src/app');

function createFakePool() {
  const orders = [];

  return {
    orders,
    query: async (sql, params = []) => {
      if (sql.startsWith('INSERT INTO orders')) {
        orders.unshift({
          id: params[0],
          user_id: params[1],
          items: JSON.parse(params[2]),
          total: String(params[3]),
          status: params[4],
          created_at: '2026-03-14T00:00:00.000Z'
        });
        return { rows: [] };
      }

      if (sql.startsWith('SELECT id, user_id, items, total, status, created_at FROM orders')) {
        return { rows: orders };
      }

      if (sql.startsWith('CREATE TABLE IF NOT EXISTS orders')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${sql}`);
    }
  };
}

test('orders rejects invalid payloads', async () => {
  const app = await createAppWithOptions({
    skipExternalInit: true,
    pool: createFakePool()
  });

  const response = await app.inject({
    method: 'POST',
    url: '/v2/orders',
    payload: { userId: '', items: [], total: 0 }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'invalid_order_payload');

  await app.close();
});

test('orders persists and publishes created events', async () => {
  const fakePool = createFakePool();
  const published = [];
  const app = await createAppWithOptions({
    skipExternalInit: true,
    pool: fakePool,
    publish: async (eventKey, payload) => {
      published.push({ eventKey, payload });
    },
    randomUUID: () => 'order-123'
  });

  const response = await app.inject({
    method: 'POST',
    url: '/v2/orders',
    payload: {
      userId: 'demo-user',
      items: [{ id: 'book-1', quantity: 2 }],
      total: 99.5
    }
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.json().id, 'order-123');
  assert.equal(published.length, 1);
  assert.equal(published[0].eventKey, 'order.created');
  assert.equal(fakePool.orders.length, 1);

  await app.close();
});

test('orders lists normalized order responses', async () => {
  const fakePool = createFakePool();
  fakePool.orders.push({
    id: 'order-existing',
    user_id: 'demo-user',
    items: [{ id: 'book-9', quantity: 1 }],
    total: '120',
    status: 'created',
    created_at: '2026-03-14T08:30:00.000Z'
  });

  const app = await createAppWithOptions({
    skipExternalInit: true,
    pool: fakePool
  });

  const response = await app.inject({
    method: 'GET',
    url: '/v2/orders'
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json()[0].id, 'order-existing');
  assert.equal(response.json()[0].total, 120);
  assert.equal(response.json()[0].items[0].id, 'book-9');

  await app.close();
});
