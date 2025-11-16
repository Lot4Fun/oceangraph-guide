SHELL := /bin/bash

.DEFAULT_GOAL := help
.PHONY: help
help:
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
$(eval $(RUN_ARGS):;@:)

up: ## Run Container
	@docker compose up -d --build --force-recreate

down: ## Stop Container
	@docker compose down

clean: ## Clean Container
	@docker compose down --remove-orphans --volumes

ps: ## List Container
	@docker compose ps

stop: ## Stop Container Selected Environment
	@docker compose stop $(RUN_ARGS)

logs: ## Show Container log Selected Environment
	@docker compose logs -f $(RUN_ARGS)

exec: ## Enter Container Selected Environment
	@docker compose exec $(RUN_ARGS) bash

remove_pdf_links: ## Remove links from a PDF
	./remove_link_from_pdf/bin/remove_link_from_pdf $(RUN_ARGS)
