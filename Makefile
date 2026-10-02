.PHONY: help dev stop build preview lint clean migrate-info

# Default target
help:
	@echo "Available commands for Auto-Poster Engine:"
	@echo "  make dev          - Run Vite development server with Bun"
	@echo "  make stop         - Stop running dev server (kill ports 5173 & 5174)"
	@echo "  make build        - Typecheck and build for production"
	@echo "  make preview      - Preview production build"
	@echo "  make lint         - Run linter (oxlint)"
	@echo "  make clean        - Remove dist and cache artifacts"
	@echo "  make migrate-info - Show instructions for Supabase migration"

dev:
	bun dev --host

stop:
	@echo "Stopping dev servers on port 5173 & 5174..."
	@-sh -c 'fuser -k 5173/tcp 5174/tcp 2>/dev/null || true'
	@echo "Dev server stopped."

build:
	bun run build

preview:
	bun run preview

lint:
	bunx oxlint

clean:
	rm -rf dist node_modules/.tmp

migrate-info:
	@echo "Open your Supabase SQL Editor: https://supabase.com/dashboard/project/pknmazjydokjrmctklog/sql"
	@echo "And execute the contents of supabase/migrations/20261003_init_autoposter_schema.sql"
