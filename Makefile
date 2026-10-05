COMPOSE = docker compose -f docker/docker-compose.build.yml

.PHONY: start build stop

start:
	$(COMPOSE) up -d

build:
	$(COMPOSE) build

stop:
	$(COMPOSE) down
