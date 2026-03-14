# BookFlow Platform

![Status](https://img.shields.io/badge/status-portfolio%20ready-0f766e)
![Architecture](https://img.shields.io/badge/architecture-microservices-1d4ed8)
![Gateway](https://img.shields.io/badge/api-v1%20%2B%20v2-9333ea)
![Observability](https://img.shields.io/badge/observability-prometheus%20%7C%20grafana%20%7C%20loki%20%7C%20tempo-f59e0b)

BookFlow Platform is a professional polyglot microservices portfolio project built to showcase modern backend architecture, compatibility strategy, observability, and delivery discipline.

## ES

BookFlow Platform moderniza el proyecto original y lo convierte en una plataforma de microservicios lista para portfolio tecnico. Mantiene compatibilidad con el legado, introduce una API v2 moderna y demuestra buenas practicas reales de backend, integracion y operacion.

### Valor del proyecto
- Compatibilidad total con endpoints legacy `v1`
- Nueva API `v2` con contratos OpenAPI
- Plataforma local reproducible con Docker Compose
- Observabilidad integrada con Prometheus, Grafana, Loki y Tempo
- CI/CD con validaciones de calidad, seguridad y SBOM
- Branding profesional alineado con GitHub y LinkedIn

### Arquitectura
- `gateway`: Fastify, capa de entrada unificada, seguridad basica y adaptadores legacy
- `identity`: autenticacion JWT + refresh token + roles
- `users-profile`: perfiles publicos y datos no sensibles
- `catalog`: Laravel API sobre PHP 8.4 con compatibilidad `v1` y dominio libros `v2`
- `comments`: FastAPI + MongoDB
- `orders`: Fastify + PostgreSQL + eventos
- `payments-mock`: FastAPI para simulacion de pagos
- `notifications`: worker Node.js + RabbitMQ
- `search-index`: Fastify + Meilisearch
- `web`: React + TypeScript + Vite

### Stack tecnico
- Backend: Node.js 22, Fastify, Python 3.12, FastAPI, PHP 8.4/Laravel
- Data: PostgreSQL, MySQL 8, MongoDB 7, Redis 7
- Messaging/Search: RabbitMQ, Meilisearch
- Observability: OpenTelemetry, Prometheus, Grafana, Loki, Tempo
- Frontend: React 18, TypeScript, Vite

### Rutas principales
- Legacy `v1`: `/register`, `/auth`, `/get-user-info`, `/posts`, `/api/get_all/:id_user/:token`, `/api/get/:id/:token`
- Moderna `v2`: `/v2/auth/*`, `/v2/catalog/books`, `/v2/comments`, `/v2/orders`, `/v2/payments`, `/v2/search`

### Demo local
```bash
cp .env.example .env
docker compose up --build -d
```

Servicios clave:
- Gateway: `http://localhost:8080`
- Frontend: `http://localhost:5173`
- Catalog: `http://localhost:8081`
- Grafana: `http://localhost:3006`
- Prometheus: `http://localhost:9090`
- RabbitMQ UI: `http://localhost:15673`

### Validacion rapida
```powershell
Copy-Item .env.example .env
docker compose config
powershell -ExecutionPolicy Bypass -File scripts/smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/contract-test.ps1
powershell -ExecutionPolicy Bypass -File scripts/e2e-test.ps1
```

### Despliegue publico
- Despliegue productivo preparado en [infra/deploy/production-compose.yml](infra/deploy/production-compose.yml)
- Reverse proxy TLS en [infra/deploy/caddy/Caddyfile](infra/deploy/caddy/Caddyfile)
- Variables de entorno de produccion en [.env.production.example](.env.production.example)
- Guia paso a paso en [docs/deployment.md](docs/deployment.md)

## EN

BookFlow Platform is a portfolio-grade microservices system that upgrades the original demo into a production-style showcase. It preserves legacy behavior, adds modern `v2` contracts, and demonstrates secure integration, observability, and delivery workflows.

### What this repository demonstrates
- Legacy-to-modern migration strategy
- API gateway compatibility layer
- Polyglot service design
- Event-driven integration with RabbitMQ
- Search and observability capabilities
- CI, release documentation, and platform validation

## Repository map
- [apps/web](apps/web)
- [services/gateway](services/gateway)
- [services/identity](services/identity)
- [services/catalog-laravel](services/catalog-laravel)
- [services/catalog](services/catalog)
- [services/comments](services/comments)
- [services/orders](services/orders)
- [infra](infra)
- [docs/contracts](docs/contracts)
- [legacy](legacy)

## Documentation
- [Architecture](docs/architecture.md)
- [Gateway OpenAPI](docs/contracts/openapi-gateway.yaml)
- [Postman Collection](docs/contracts/postman-bookflow.json)
- [Release Notes](docs/releases)
- [Release Roadmap](docs/releases/ROADMAP.md)
- [Deployment Guide](docs/deployment.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md)

## Release workflow
- Validate locally with `npm run smoke`, `npm run contract`, and `npm run e2e`
- Generate local milestone tags with `npm run release:tags`

## About the author
- Jesus David Manzanero
- Systems & Network Engineer
- Valencia, Spain
- GitHub: https://github.com/Jyzzu08
- LinkedIn: https://www.linkedin.com/in/jes%C3%BAs-david-manzanero-marti-995010232/
- Email: jesusmanzanero00@gmail.com

## License
MIT License. See [LICENSE](LICENSE).
