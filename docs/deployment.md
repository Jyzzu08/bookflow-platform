# Deployment

BookFlow Platform includes a production-oriented deployment path for a public demo or portfolio showcase on a VPS or cloud VM.

## Recommended topology

- `Caddy` as public reverse proxy with automatic HTTPS
- `web` served as a production static build
- `gateway` exposed only behind Caddy
- Internal service-to-service communication over the Docker network
- Persistent volumes for PostgreSQL, MySQL, MongoDB, RabbitMQ, and Meilisearch

## Files

- `infra/deploy/production-compose.yml`
- `infra/deploy/caddy/Caddyfile`
- `.env.production.example`
- `apps/web/Dockerfile.prod`

## Quick start

1. Copy `.env.production.example` to `.env.production`
2. Replace all demo secrets with long random values
3. Point `PUBLIC_WEB_HOST` and `PUBLIC_API_HOST` to your real domains
4. Configure DNS `A` records to the target server
5. Deploy with:

```bash
docker compose --env-file .env.production -f infra/deploy/production-compose.yml up --build -d
```

## Validation after deploy

- Open `https://<PUBLIC_WEB_HOST>`
- Check `https://<PUBLIC_API_HOST>/health`
- Run a demo login + catalog + order flow
- Review logs with `docker compose -f infra/deploy/production-compose.yml logs -f gateway`

## Notes

- This repository now includes the deployment assets, but the public deployment itself still requires a server, domain, and credentials.
- For GitHub portfolio usage, a VPS deployment gives the most control and best mirrors the microservices architecture shown in this repository.
