COMPOSE = docker compose -f docker/docker-compose.build.yml
COMPOSE_DEV = docker compose -f docker/docker-compose.dev.yml
DB_CONTAINER = gf-postgres-build
DB_USER = user
DB_NAME = ghostfolio-db
DUMP_FILE = ghostfolio-backup-$(shell date +%Y%m%d).dump

.PHONY: start-prod build-prod stop-prod start-dev stop-dev migrate export-db import-db

start-prod:
	$(COMPOSE) up

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

migrate:
	$(COMPOSE_DEV) up -d --wait postgres
	@unset NPM_CONFIG_PREFIX && . $$HOME/.nvm/nvm.sh && nvm use 22 && npm run database:push && npm run database:generate-typings

export-db:
	docker exec $(DB_CONTAINER) pg_dump -U $(DB_USER) -d $(DB_NAME) -F c -f /tmp/ghostfolio.dump
	docker cp $(DB_CONTAINER):/tmp/ghostfolio.dump $(DUMP_FILE)
	docker exec $(DB_CONTAINER) rm /tmp/ghostfolio.dump
	@echo "Exported to $(DUMP_FILE)"

import-db:
	@test -n "$(FILE)" || (echo "Usage: make import-db FILE=ghostfolio-backup-YYYYMMDD.dump" && exit 1)
	docker cp $(FILE) $(DB_CONTAINER):/tmp/ghostfolio.dump
	docker exec $(DB_CONTAINER) pg_restore -U $(DB_USER) -d $(DB_NAME) --clean --if-exists -F c /tmp/ghostfolio.dump
	docker exec $(DB_CONTAINER) rm /tmp/ghostfolio.dump
	@echo "Imported from $(FILE)"
