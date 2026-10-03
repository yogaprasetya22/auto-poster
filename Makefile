.PHONY: help dev stop build preview lint clean clean-gdrive clean-history clean-all migrate-info test test-unit test-e2e test-post-2-platforms

# Default target
help:
	@echo "Available commands for Auto-Poster Engine:"
	@echo "  make dev                   - Run Vite development server"
	@echo "  make stop                  - Stop running dev server (kill ports 5173 & 5174)"
	@echo "  make build                 - Typecheck and build for production"
	@echo "  make preview               - Preview production build"
	@echo "  make lint                  - Run linter (oxlint)"
	@echo "  make test                  - Run unit tests (Vitest)"
	@echo "  make test-unit             - Run unit tests (Vitest)"
	@echo "  make test-e2e              - Run all Playwright e2e tests"
	@echo "  make test-post-2-platforms - Run Playwright e2e 2 posts generate & dispatch on all platforms"
	@echo "  make clean                 - Remove dist and cache artifacts"
	@echo "  make clean-gdrive          - Delete all generated promo videos/images in Google Drive"
	@echo "  make clean-history         - Delete all execution logs and posts in Supabase"
	@echo "  make clean-all             - Clean local build, Google Drive files, and database history"
	@echo "  make migrate-info          - Show instructions for Supabase migration"

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

test:
	bun run test

test-unit:
	bun run test

test-e2e:
	bunx playwright test

test-post-2-platforms:
	bunx playwright test e2e/autoposter-generate.spec.ts

clean:
	rm -rf dist node_modules/.tmp public/generated-promo/*.mp4

clean-gdrive:
	node scripts/clean-gdrive.js

clean-history:
	@node -e '\
		const fs = require("fs");\
		const dotenv = require("dotenv");\
		const env = dotenv.parse(fs.readFileSync(".env"));\
		const { createClient } = require("@supabase/supabase-js");\
		const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);\
		async function run() {\
			console.log("🧹 Membersihkan database posts & post_targets...");\
			await sb.from("post_targets").delete().neq("id", "00000000-0000-0000-0000-000000000000");\
			await sb.from("posts").delete().neq("id", "00000000-0000-0000-0000-000000000000");\
			console.log("✅ Database history berhasil dibersihkan!");\
		}\
		run();'

clean-all: clean clean-gdrive clean-history
	@echo "✅ Semua cache lokal, Google Drive, dan Database telah bersih total!"

migrate-info:
	@echo "Open your Supabase SQL Editor: https://supabase.com/dashboard/project/pknmazjydokjrmctklog/sql"
	@echo "And execute the contents of supabase/migrations/20261003_init_autoposter_schema.sql"


