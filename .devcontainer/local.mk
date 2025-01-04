default_target: env

env:
	docker compose -f .devcontainer/docker-compose.yml $(shell if [ -f ./docker-compose.yml ]; then echo -f docker-compose.yml; fi) up
.PHONY: env