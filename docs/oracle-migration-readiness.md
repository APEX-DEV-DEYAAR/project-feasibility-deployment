# Oracle Migration Readiness Audit

## Current status

The project is **not fully relational** today and is **not Oracle-ready** without a schema/application refactor.

The largest blockers are:

1. `feasibility_runs.payload` and `feasibility_runs.metrics` are stored as `JSONB`
2. `feasibility_archive.payload` and `feasibility_archive.metrics` are stored as `JSONB`
3. repositories use PostgreSQL-only SQL features such as:
   - `::jsonb`
   - `::int`, `::float`
   - `BIGSERIAL`
   - `TIMESTAMPTZ`
   - `ON CONFLICT`
   - `RETURNING`
   - `DISTINCT ON`
   - `FILTER (...)`

## Files that block Oracle migration

### JSON / semi-structured persistence

- `server/sql/postgres/001_init.sql`
- `server/src/repositories/feasibility.repository.ts`
- `server/src/repositories/archive.repository.ts`

These are the highest-risk portability blockers because the application treats JSON columns as the source of truth for feasibility drafts, frozen versions, and archives.

### PostgreSQL-specific DDL / DML

- `server/sql/postgres/001_init.sql`
- `server/sql/postgres/002_cost_tracking.sql`
- `server/sql/postgres/004_cost_tracking_v2.sql`
- `server/sql/postgres/005_segregation_v3.sql`
- `server/src/repositories/project.repository.ts`
- `server/src/repositories/feasibility.repository.ts`
- `server/src/repositories/archive.repository.ts`
- `server/src/repositories/reporting.repository.ts`
- `server/src/repositories/cost-tracking.repository.ts`
- `server/src/repositories/revenue.repository.ts`
- `server/src/db/adapters/postgres.adapter.ts`
- `server/src/db/index.ts`

## What is already relational

The reporting layer is already close to the right target shape:

- `feasibility_reporting_current`
- `feasibility_reporting_current_partners`
- `feasibility_reporting_archive`
- `feasibility_reporting_archive_partners`
- `projects`
- `project_monthly_costs`
- `project_monthly_revenue`
- `cost_categories`

Those tables can be used as the foundation for an Oracle-friendly model.

## Recommended target design

Replace JSON source-of-truth storage with relational tables:

1. `feasibility_runs`
   - keep only workflow/version metadata:
   - `id`, `project_id`, `version`, `status`, `created_at`, `updated_at`, `frozen_at`

2. `feasibility_run_inputs`
   - one row per run
   - columns for every input currently inside `payload.input`

3. `feasibility_run_partners`
   - one row per partner per run
   - `run_id`, `partner_order`, `partner_name`, `share_pct`

4. `feasibility_run_metrics`
   - one row per run
   - columns for the currently calculated KPI / revenue / cost / profitability outputs

5. archive equivalents
   - `feasibility_archive_inputs`
   - `feasibility_archive_partners`
   - `feasibility_archive_metrics`

## Migration sequence

### Phase 1

Introduce adapter-level SQL helpers so repositories stop embedding PostgreSQL casting and conflict syntax directly.

### Phase 2

Create relational source-of-truth tables for run inputs, partners, and metrics while keeping current JSON columns temporarily.

### Phase 3

Dual-write:

- write relational tables
- continue writing JSON only as compatibility fallback

### Phase 4

Read from relational tables only.

### Phase 5

Drop `JSONB` source-of-truth columns and remove PostgreSQL-only repository SQL.

## Practical recommendation

If Oracle migration is a real roadmap item, do **not** invest further in `JSONB`-based feasibility persistence.

The next engineering task should be:

`Refactor feasibility draft/freeze/archive persistence from JSONB to relational run_input/run_partner/run_metric tables, then adapt repositories to read/write those tables as the canonical model.`
