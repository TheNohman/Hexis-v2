# Hexis v2 — Deployment Makefile
# VPS: debian@92.222.247.75
# Project: /srv/projects/web/hexis-v2/
# Code:    /srv/projects/web/hexis-v2/build/

VPS         := debian@92.222.247.75
VPS_PROJECT := /srv/projects/web/hexis-v2
VPS_BUILD   := $(VPS_PROJECT)/build
IMAGE       := harbor.ludovic-huguenot.fr/library/hexis-v2:latest
DB_USER     := hexis_v2
DB_NAME     := hexis_v2
DB_CONTAINER := hexis-v2-postgres

# ─── Dev local ──────────────────────────────────────────────

.PHONY: dev dev-db dev-db-stop seed generate

dev: dev-db ## Lancer le dev server + Postgres
	npm run dev

dev-db: ## Démarrer Postgres local (Docker)
	docker compose -f docker-compose.dev.yml up -d

dev-db-stop: ## Arrêter Postgres local
	docker compose -f docker-compose.dev.yml down

seed: ## Seeder la base locale (exercices + KPIs)
	. .env && npm run db:seed

generate: ## Régénérer le client Prisma
	npx prisma generate

# ─── Deploy ─────────────────────────────────────────────────

.PHONY: deploy deploy-quick migrate pull build push restart logs

deploy: pull build push restart ## Deploy complet (pull → build → push → restart)

deploy-quick: push restart ## Deploy rapide (image déjà buildée)

pull: ## Git pull sur le VPS
	ssh $(VPS) "cd $(VPS_BUILD) && git pull origin main"

build: ## Build l'image Docker sur le VPS
	ssh $(VPS) "cd $(VPS_PROJECT) && docker build -f build/Dockerfile -t $(IMAGE) build/"

push: ## Push l'image vers Harbor
	ssh $(VPS) "cd $(VPS_PROJECT) && docker push $(IMAGE)"

restart: ## Pull l'image + redémarrer les containers
	ssh $(VPS) "cd $(VPS_PROJECT) && docker compose pull && docker compose up -d"

logs: ## Voir les logs du container app
	ssh $(VPS) "cd $(VPS_PROJECT) && docker compose logs -f --tail=100 hexis-v2-app"

# ─── Migrations ─────────────────────────────────────────────

.PHONY: migrate migrate-file

migrate: ## Appliquer TOUTES les migrations non appliquées
	@for f in prisma/migrations/*/migration.sql; do \
		echo "--- Applying $$f ---"; \
		cat "$$f" | ssh $(VPS) "docker exec -i $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME)"; \
	done

migrate-file: ## Appliquer UNE migration: make migrate-file F=prisma/migrations/xxx/migration.sql
	@test -n "$(F)" || (echo "Usage: make migrate-file F=prisma/migrations/xxx/migration.sql" && exit 1)
	cat $(F) | ssh $(VPS) "docker exec -i $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME)"

# ─── Database ───────────────────────────────────────────────

.PHONY: db-shell db-dump

db-shell: ## Ouvrir un psql sur la DB du VPS
	ssh -t $(VPS) "docker exec -it $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME)"

db-dump: ## Dump la DB du VPS dans hexis_v2.sql
	ssh $(VPS) "docker exec $(DB_CONTAINER) pg_dump -U $(DB_USER) -d $(DB_NAME)" > hexis_v2.sql
	@echo "Dump saved to hexis_v2.sql"

# ─── Status ─────────────────────────────────────────────────

.PHONY: status

status: ## État des containers sur le VPS
	ssh $(VPS) "cd $(VPS_PROJECT) && docker compose ps"

# ─── Help ───────────────────────────────────────────────────

.PHONY: help
help: ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
