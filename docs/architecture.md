# Architecture

BookFlow Platform uses a gateway-first polyglot architecture with synchronous APIs for core reads/writes and asynchronous events for cross-service workflows.

## Request flow
- `web` calls `gateway`
- `gateway` routes requests to `identity`, `catalog`, `comments`, `orders`, `payments-mock`, and `search-index`
- `orders` emits domain events to RabbitMQ
- `notifications` consumes events for operational workflows

## Core events
- `order.created`
- `payment.succeeded`
- `payment.failed`
- `user.registered`
- `notification.requested`

## Services
- `gateway`: compatibility layer, security middleware, single public API entrypoint
- `identity`: legacy auth + v2 token lifecycle
- `users-profile`: user-facing profile data
- `catalog`: active Laravel catalog service with `v1` compatibility routes and modern `v2` endpoints
- `comments`: FastAPI comment service backed by MongoDB
- `orders`: order creation and event publishing
- `payments-mock`: payment simulation service
- `notifications`: RabbitMQ consumer / worker
- `search-index`: search adapter with Meilisearch fallback behavior
- `services/catalog`: previous lightweight PHP implementation kept as reference during modernization

## Observability
- OpenTelemetry Collector
- Prometheus
- Grafana
- Loki
- Tempo
