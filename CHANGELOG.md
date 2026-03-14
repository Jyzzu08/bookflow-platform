# Changelog

All notable changes to this project are documented here.

## [2.0.0] - 2026-03-14
### Changed
- Hardened CI so Docker Compose validation now provisions `.env` from `.env.example` on clean checkouts
- Fixed the web build by adding Vite environment typing for `import.meta.env`
- Upgraded legacy maintained services to safer dependency baselines, including Node 22 and Flask 2.3.x runtime support
- Made Trivy enforcement explicit for `HIGH` and `CRITICAL` findings and refreshed vulnerable legacy lockfiles
- Aligned release and local setup documentation with the stricter validation flow

## [1.0.0] - 2026-03-14
### Added
- BookFlow Platform monorepo structure with `apps`, `services`, `infra`, `docs`, and `scripts`
- New API gateway with legacy compatibility and modern `v2` routes
- Identity, users-profile, orders, comments, payments, notifications, search and catalog services
- React + TypeScript + Vite frontend
- Docker Compose stack with PostgreSQL, MySQL, MongoDB, Redis, RabbitMQ, Meilisearch, and observability tooling
- OpenAPI specs, Postman collection, smoke tests, contract tests, and E2E scripts
- GitHub Actions CI, Dependabot configuration, repository standards, and release documentation
- Laravel feature tests, expanded Node route coverage, and production deployment assets for public demo publication

## [0.4.0] - 2026-03-14
### Added
- Hardening stage with observability, security workflow, validation scripts, and release preparation

## [0.3.0] - 2026-03-14
### Added
- Orders, payments-mock, notifications, search-index, and unified web app

## [0.2.0] - 2026-03-14
### Added
- Gateway-based legacy compatibility and initial `v2` contracts

## [0.1.0] - 2026-03-14
### Added
- Foundation restructure and modernization baseline
