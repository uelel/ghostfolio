COMPOSE = docker compose -f docker/docker-compose.build.yml
COMPOSE_DEV = docker compose -f docker/docker-compose.dev.yml

.PHONY: start-prod build-prod stop-prod start-dev stop-dev

start-prod:
	$(COMPOSE) up -d

build-prod:
	$(COMPOSE) build

stop-prod:
	$(COMPOSE) down

start-dev:
	$(COMPOSE_DEV) up -d
	@trap 'kill 0' INT TERM; \
	npm run start:server & \
	npm run start:client & \
	wait

stop-dev:
	$(COMPOSE_DEV) down
