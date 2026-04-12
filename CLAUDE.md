# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build (uses Turbopack)
npm run lint         # ESLint
npm run db:seed      # Seed KPI definitions + exercises (tsx prisma/seed.ts)
npx prisma generate  # Regenerate Prisma client after schema changes
```

### Deploy (all on VPS `debian@92.222.247.75`)

```bash
# 1. Apply migration manually on the running Postgres container:
cat prisma/migrations/<name>/migration.sql | ssh debian@92.222.247.75 \
  "docker exec -i hexis-v2-postgres psql -U hexis_v2 -d hexis_v2"

# 2. Pull, build, push, deploy:
ssh debian@92.222.247.75 "cd /srv/projects/web/hexis-v2/build && git pull origin main"
ssh debian@92.222.247.75 "cd /srv/projects/web/hexis-v2 && \
  docker build -f build/Dockerfile -t harbor.ludovic-huguenot.fr/library/hexis-v2:latest build/ && \
  docker push harbor.ludovic-huguenot.fr/library/hexis-v2:latest && \
  docker compose pull && docker compose up -d"
```

VPS project dir: `/srv/projects/web/hexis-v2/` (docker-compose + .env.prod). Code clone: `/srv/projects/web/hexis-v2/build/`.

### Migrations

Prisma migrate is NOT used at runtime. Migrations are hand-written SQL in `prisma/migrations/<timestamp>_<name>/migration.sql` and applied manually via `psql` on the VPS container. After adding a migration, always run `npx prisma generate`.

## Architecture

**Stack**: Next.js 16.2.3, React 19, Prisma 7.7 (with `@prisma/adapter-pg`), PostgreSQL 17, Tailwind CSS v4, NextAuth v5 (Keycloak SSO).

**Language**: All UI text is in **French**.

### Data layer pattern

Every domain follows the same 3-file structure:

1. **`src/lib/<domain>/queries.ts`** — read-only Prisma queries, return typed DTOs
2. **`src/lib/<domain>/mutations.ts`** — write operations with ownership checks (`assertOwnership` or manual `findUnique` + userId check)
3. **`src/app/<route>/actions.ts`** — `"use server"` actions that call mutations, wrap with `getCurrentUserId()`, and call `revalidatePath()`

Types live either in `src/lib/<domain>/types.ts` or are co-located in the query file.

### Key domains

| Domain | Lib path | Route |
|--------|----------|-------|
| Workouts (sessions) | `src/lib/workouts/` | `/sessions/[id]` |
| Templates | `src/lib/templates/` | `/templates/[id]` |
| Programs | `src/lib/programs/` | `/programs/[id]`, `/planning` |
| Exercises | `src/lib/exercises/` | `/exercises/[id]` |
| Stats | `src/lib/stats/` | `/stats` |
| History | `src/lib/history/` | `/history` |
| Wellness | `src/lib/wellness/` | (dashboard check-in) |
| Body weight | `src/lib/bodyweight/` | (profile section) |
| Profile | `src/lib/profile/` | `/profile` |
| AI Mentor | `src/lib/mentor/` | `/mentor` |

### Auth

Keycloak SSO → NextAuth v5 JWT sessions. No Prisma session adapter — User rows are upserted on first access via `getCurrentUserId()` in `src/lib/auth-helpers.ts`. Every server action starts with `await getCurrentUserId()`.

### Prisma

- Client output: `src/generated/prisma/` (gitignored, regenerated on build)
- Connection: lazy singleton via Proxy in `src/lib/prisma.ts` (avoids crash at build time when DATABASE_URL is absent)
- Config: `prisma.config.ts` at project root
- Imports: `import { prisma } from "@/lib/prisma"` and `import type { ... } from "@/generated/prisma/client"`

### Program scheduling

Programs use cursor-based tracking: `(currentWeek, currentDay)` on the Program model. `day` is 0=Monday..6=Sunday (real weekday). Slots can have a `startTime` ("HH:mm"). When a session is launched from a program slot, the cursor auto-advances to the next slot with a template. Progressive overload: +2.5kg for STRENGTH, +1 rep for BODYWEIGHT when all sets were completed in the previous session for the same slot.

### AI Mentor

OpenAI `gpt-4o-mini`, server-side only. `src/lib/mentor/context.ts` builds a full user data snapshot (stats, recent workouts, wellness, body weight, program). Gated by `User.mentorEnabled` flag. Env var: `OPENAI_API_KEY`.

### Styling

Tailwind v4 with CSS custom properties in `globals.css`. Light/dark mode via `prefers-color-scheme`. Semantic tokens: `--accent`, `--surface`, `--border`, `--muted`, `--subtle`, `--done`, `--danger`. Fonts: DM Sans (body), Outfit (display), Geist Mono (monospace).

### KPI system

Exercises have associated KPIs (`ExerciseKpi` join table). KPI values are stored per-entry with both `plannedNumeric`/`plannedText` (from template) and `valueNumeric`/`valueText` (actual). Common slugs: `weight_kg`, `reps`, `rpe`, `duration_secs`, `distance_km`, `pace_min_per_km`.
