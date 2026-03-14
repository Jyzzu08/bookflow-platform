const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { z } = require('zod');

const meiliUrl = process.env.MEILI_URL || 'http://meilisearch:7700';
const meiliMasterKey = process.env.MEILI_MASTER_KEY || 'bookflow-master-key';

const payloadSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().default('')
});

const localIndex = [];

async function pushToMeili(document) {
  const indexName = 'books';

  await fetch(`${meiliUrl}/indexes/${indexName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${meiliMasterKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uid: indexName, primaryKey: 'id' })
  }).catch(() => null);

  await fetch(`${meiliUrl}/indexes/${indexName}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${meiliMasterKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([document])
  }).catch(() => null);
}

async function searchMeili(query) {
  const response = await fetch(`${meiliUrl}/indexes/books/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${meiliMasterKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: query })
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.hits || [];
}

async function createApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({ service: 'search-index', status: 'ok' }));

  app.post('/v2/search/index', async (request, reply) => {
    const parsed = payloadSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_payload' });
    }

    localIndex.push(parsed.data);
    await pushToMeili(parsed.data);

    return reply.code(202).send({ status: 'queued', document: parsed.data });
  });

  app.get('/v2/search', async (request) => {
    const q = String(request.query?.q || '').trim();
    if (!q) {
      return { hits: [] };
    }

    const meiliHits = await searchMeili(q).catch(() => []);
    if (meiliHits.length > 0) {
      return { hits: meiliHits, source: 'meilisearch' };
    }

    const fallbackHits = localIndex.filter((doc) => {
      return doc.title.toLowerCase().includes(q.toLowerCase()) || doc.description.toLowerCase().includes(q.toLowerCase());
    });

    return { hits: fallbackHits, source: 'fallback' };
  });

  return app;
}

module.exports = { createApp };
