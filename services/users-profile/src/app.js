const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { Pool } = require('pg');
const { z } = require('zod');

const pool = new Pool({
  connectionString: process.env.USERS_DB_URL || 'postgres://bookflow:bookflow@postgres:5432/bookflow'
});

const profileSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  bio: z.string().optional().default(''),
  location: z.string().optional().default('')
});

async function createApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  const skipExternalInit = process.env.SKIP_EXTERNAL_INIT === '1';
  if (!skipExternalInit) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  }

  app.get('/health', async () => ({ service: 'users-profile', status: 'ok' }));

  app.put('/v2/users/:userId/profile', async (request, reply) => {
    const payload = {
      userId: request.params.userId,
      displayName: request.body?.displayName,
      bio: request.body?.bio,
      location: request.body?.location
    };

    const parsed = profileSchema.safeParse(payload);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_profile_payload' });
    }

    const { userId, displayName, bio, location } = parsed.data;

    await pool.query(
      `INSERT INTO profiles (user_id, display_name, bio, location, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio, location = EXCLUDED.location, updated_at = NOW()`,
      [userId, displayName, bio || '', location || '']
    );

    return reply.send({ userId, displayName, bio: bio || '', location: location || '' });
  });

  app.get('/v2/users/:userId/profile', async (request, reply) => {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE user_id = $1 LIMIT 1', [request.params.userId]);
    if (!rows[0]) {
      return reply.code(404).send({ error: 'profile_not_found' });
    }

    return reply.send({
      userId: rows[0].user_id,
      displayName: rows[0].display_name,
      bio: rows[0].bio,
      location: rows[0].location
    });
  });

  return app;
}

module.exports = { createApp };
