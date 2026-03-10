# CLAUDE.md - Project Feasibility App

## What this project is
A real estate feasibility and cost-tracking application for UAE development projects.

It supports:
- project creation and feasibility modeling
- draft and frozen feasibility versions
- archive history
- monthly team cost tracking
- monthly collections tracking
- separate collections forecast and aging module
- budget vs actual executive reporting

Currency conventions:
- feasibility calculations are stored and displayed in AED millions
- monthly costs, expenses, and collections entry screens store raw AED amounts
- Budget vs Actuals converts tracked AED amounts to AED millions for reporting

## Architecture
- Monorepo with npm workspaces
- `client/`: React 18 + Vite 7 + TypeScript
- `server/`: Express 4 + Node.js ESM + TypeScript
- Frontend dev port: `5173`
- Backend dev port: `4000`
- Database: PostgreSQL 16 today

Core backend layering:

```text
Request -> Routes -> Controllers -> Services -> Repositories -> DB Adapter -> Database
```

Key patterns:
- Repository pattern for data access
- Adapter pattern for database abstraction
- shared domain types across server and client
- no ORM

## Current database position
The project is not fully Oracle-ready yet.

What is true today:
- cost tracking and reporting tables are relational
- feasibility now dual-writes into new relational tables
- legacy feasibility JSON columns still exist and are still part of compatibility flow
- PostgreSQL-specific SQL still exists in several repositories and migrations

The migration audit is here:
- [oracle-migration-readiness.md](C:/Users/ahmeds/researchwork/testproject/CMSTest/docs/oracle-migration-readiness.md)

## File layout

```text
CMSTest/
  package.json
  .env
  start.ps1
  CLAUDE.md
  docs/
    oracle-migration-readiness.md
  server/
    package.json
    src/
      index.ts
      app.ts
      config/
        index.ts
      db/
        index.ts
        adapters/
          base.adapter.ts
          postgres.adapter.ts
      repositories/
        project.repository.ts
        feasibility.repository.ts
        feasibility-relational.repository.ts
        archive.repository.ts
        reporting.repository.ts
        cost-tracking.repository.ts
        revenue.repository.ts
      services/
        project.service.ts
        feasibility.service.ts
        cost-tracking.service.ts
        revenue.service.ts
      controllers/
        project.controller.ts
        feasibility.controller.ts
        cost-tracking.controller.ts
        revenue.controller.ts
      routes/
        index.ts
        collections-forecast.routes.ts
      middleware/
        errorHandler.ts
      errors/
        AppError.ts
      utils/
        calculations.ts
      types/
        index.ts
    sql/
      postgres/
        001_init.sql
        002_cost_tracking.sql
        003_clear_cost_data.sql
        004_cost_tracking_v2.sql
        005_segregation_v3.sql
        006_relational_feasibility.sql
  client/
    package.json
    src/
      App.tsx
      api/
        client.ts
        feasibility.api.ts
        cost-tracking.api.ts
      components/
        CfoCashflowChart.tsx
        CollectionsAgingChart.tsx
        ExecutiveBridgeChart.tsx
        VarianceWaterfallChart.tsx
      pages/
        CollectionsForecastPage.tsx
        ProjectsPage.tsx
        FeasibilityPage.tsx
        PortfolioPage.tsx
        TeamCostPage.tsx
        CommercialTeamPage.tsx
        SalesTeamPage.tsx
        MarketingTeamPage.tsx
        CollectionsTeamPage.tsx
        BudgetVsActualsPage.tsx
      styles/
        commercial-team.css
      utils/
        calculations.ts
        formatters.ts
      types/
        index.ts
```

## Commands

```bash
npm install
npm run dev:server
npm run dev:client
powershell -ExecutionPolicy Bypass -File .\start.ps1
cmd /c npm run build --workspace server
cmd /c npm run build --workspace client
```

Notes:
- `start.ps1` kills ports `4000` and `5173`, then starts server and client
- use `cmd /c npm ...` in PowerShell if execution-policy issues affect npm shims

## Startup sequence
Server startup currently does this:
1. Load env config
2. Create DB adapter from `DB_TYPE`
3. Initialize PostgreSQL and run migrations once using `schema_migrations`
4. Create repositories
5. Backfill reporting tables
6. Backfill relational feasibility tables from legacy JSON-backed runs/archive
7. Create services and controllers
8. Build Express app
9. Listen on `PORT`

## API endpoints

### Health
- `GET /api/health`

### Projects
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `DELETE /api/projects/:id`

### Feasibility
- `GET /api/portfolio`
- `GET /api/projects/:id/feasibility`
- `PUT /api/projects/:id/feasibility`
- `POST /api/projects/:id/feasibility/freeze`
- `POST /api/projects/:id/feasibility/edit`
- `GET /api/projects/:id/feasibility/archive`

### Cost tracking
- `GET /api/categories?team=`
- `GET /api/projects/:projectId/costs?year=&team=`
- `GET /api/costs?year=`
- `POST /api/costs`
- `POST /api/costs/bulk`
- `DELETE /api/projects/:projectId/costs/:categoryId/:year/:month`
- `GET /api/projects/:projectId/cost-summary?year=`
- `GET /api/projects/:projectId/annual-summary?year=`
- `POST /api/projects/:projectId/costs/initialize`
- `POST /api/projects/:projectId/costs/copy-year`
- `DELETE /api/projects/:projectId/costs/clear?team=`
- `GET /api/projects/:projectId/budget-vs-actuals?year=`

Clear semantics:
- `team=commercial` clears only commercial cost rows
- `team=sales` clears only sales cost rows
- `team=marketing` clears only marketing cost rows
- `team=collections` clears only collections rows
- clearing one screen must not delete other teams' data

### Collections
- `GET /api/projects/:projectId/collections?year=`
- `POST /api/collections`
- `POST /api/collections/bulk`
- `DELETE /api/projects/:projectId/collections/:year/:month`
- `DELETE /api/projects/:projectId/collections/clear`

### Collections Forecast
- `GET /api/collections-forecast/portfolio-dashboard?asOf=`
- `POST /api/collections-forecast/lookups/completion/bulk`
- `POST /api/collections-forecast/lookups/aging/bulk`
- `GET /api/projects/:projectId/collections-forecast/installments`
- `POST /api/collections-forecast/installments/bulk`
- `GET /api/projects/:projectId/collections-forecast/dashboard?asOf=`

## Database tables

### Core workflow tables
- `projects`
- `feasibility_runs`
- `feasibility_archive`

These still contain legacy JSON-backed feasibility payload and metrics columns.

### New relational feasibility tables
- `feasibility_run_inputs`
- `feasibility_run_metrics`
- `feasibility_run_partners`
- `feasibility_archive_inputs`
- `feasibility_archive_metrics`
- `feasibility_archive_partners`

These were added in:
- [006_relational_feasibility.sql](C:/Users/ahmeds/researchwork/testproject/CMSTest/server/sql/postgres/006_relational_feasibility.sql)

Current behavior:
- save, freeze, and archive flows dual-write into relational feasibility tables
- startup backfills relational tables from existing JSON-based records
- JSON is still present for compatibility and has not been fully removed

### Cost tracking tables
- `cost_categories`
- `project_monthly_costs`
- `project_monthly_revenue`

### Separate collections forecast table
- `project_collections_installments`

### Collections forecast lookup tables
- `collections_completion_lookup`
- `collections_aging_lookup`

### Collections forecast formula-input columns
The installment table now also stores raw workbook inputs and recomputed outputs for the forecast engine, including:
- `building_name`
- `location_code`
- `property_type`
- `spa_signed_date`
- `spa_sign_status`
- `tsv_amount`
- `total_cleared`
- `waived_amount`
- `total_over_due`
- `cleared_pct`
- `paid_pct`
- `is_unit_over_due`
- `installments_over_due_bucket`
- `over_due_pct_bucket`
- `registered_sale_type`
- `latest_construction_progress`
- `can_claim_total`
- `can_claim_additional`
- `eligible_for_dld_termination`

This module is separate from the existing monthly Collections tracker and must not overwrite or reuse its rows.

Team/category model:
- Commercial: `hard_cost`, `soft_cost`, `statutory_cost`, `contingency`
- Sales: `staff_discounts`, `broker_cost`, `sales_incentives`, `dld_cost`
- Marketing: `marketing`
- Collections: tracked through `project_monthly_revenue`

### Reporting tables
- `feasibility_reporting_current`
- `feasibility_reporting_current_partners`
- `feasibility_reporting_archive`
- `feasibility_reporting_archive_partners`

### Views
- `project_cost_summary`
- `project_cost_annual_summary`

## Feasibility lifecycle
1. Create project
2. Save draft
3. Freeze current draft into a numbered frozen version
4. Edit frozen version by archiving the frozen run and creating a new draft
5. Delete project to cascade delete related data

## Budget vs Actuals screen
The Budget vs Actuals page is now an executive reporting screen, not just a raw table.

Current behavior:
- no year dropdown in the UI
- internally it still requests the current year from the backend
- hides rows with zero feasibility budget
- shows inflow first, then operating outflow, then COF, then profitability
- sales detail rows are rolled into a `Sales Expenses` subtotal made up of:
  - `Staff Discounts`
  - `Broker Cost`
  - `Staff Incentives`
  - `DLD Waiver Cost`
- tracked monthly data is blended as:
  - use actual when present
  - otherwise use projected

Current visual sections:
- executive KPI cards
- financial breakdown table
- variance analysis chart
- executive bridge chart

Main components:
- [BudgetVsActualsPage.tsx](C:/Users/ahmeds/researchwork/testproject/CMSTest/client/src/pages/BudgetVsActualsPage.tsx)
- [ExecutiveBridgeChart.tsx](C:/Users/ahmeds/researchwork/testproject/CMSTest/client/src/components/ExecutiveBridgeChart.tsx)
- [VarianceWaterfallChart.tsx](C:/Users/ahmeds/researchwork/testproject/CMSTest/client/src/components/VarianceWaterfallChart.tsx)

## Team cost and collections entry
`TeamCostPage.tsx` is the generic monthly-entry screen used by the team-specific pages.

Important behavior:
- screen-level clear is team-scoped
- collections uses collections rows, not cost-category rows
- when a screen is cleared, the data must disappear from both the UI and the database
- actuals and projections are raw AED values on entry screens
- Collections monthly and grand totals are calculated from collections values, not cost categories
- Collections first-time entry must save correctly even when the project has no pre-existing collections rows
- collections APIs should return a 12-month current-year grid for empty projects so the Collections screen stays editable

## Collections forecast module
This is a separate workflow from the monthly Collections team tracker.

Purpose:
- manage installment-level collections forecast
- produce aging buckets
- produce CFO cashflow views

Current behavior:
- separate screen from the existing Collections page
- separate table: `project_collections_installments`
- installment register stores due date, forecast amount, collected amount, probability, and status
- the frontend is a read-only CFO dashboard — no Excel upload or manual editing from the UI
- data is populated from the backend via bulk save API endpoints
- backend includes a probability calculation service and portfolio aggregation endpoint
- backend supports workbook lookup ingestion for `Completion Date Construction Up` and `buckets`
- backend recomputes forecast-engine outputs from stored raw fields plus lookup tables
- probability scoring runs after the recompute pass so portfolio weighting is based on backend-derived forecast state

CFO dashboard sections (project view):
- executive summary KPIs (9 tiles: forecast, collected, outstanding, overdue, next 90 days, efficiency, DSO, at-risk, DLD eligible)
- risk and exposure analysis (risk distribution donut + exposure bucket horizontal bar)
- collections performance (aging bar chart + cashflow composed chart)
- trend and segmentation (weekly trend + property type breakdown)
- critical exposure (DLD termination strip + top overdue units table)
- read-only installment register with status pills and risk badges

CFO dashboard sections (portfolio view):
- portfolio executive summary KPIs (8 tiles)
- clickable project breakdown table with risk indicators

## Frontend behavior and optimization
Current optimization state:
- `App.tsx` lazy-loads non-default pages with `React.lazy` and `Suspense`
- `xlsx` is dynamically imported from `TeamCostPage.tsx` only when needed
- large screens such as Feasibility and Budget vs Actuals are split into separate chunks

This means:
- initial app load is much smaller than before
- Excel import/export does not affect unrelated screens

## Key conventions
- TypeScript strict mode across client and server
- server imports use `.js` extensions
- client imports are extensionless
- keep server and client calculation logic aligned:
  - `server/src/utils/calculations.ts`
  - `client/src/utils/calculations.ts`
- use repository and adapter layers instead of SQL in services/controllers
- bulk save operations are capped at `500`
- PostgreSQL migrations must be idempotent and tracked in `schema_migrations`

## Oracle migration guidance
Do not assume the app is fully portable yet.

If Oracle migration continues, the next priority is:
1. move feasibility reads fully onto relational tables
2. reduce PostgreSQL-specific SQL in repositories
3. remove JSON as the source of truth
4. introduce an Oracle adapter and Oracle DDL after the relational cutover is complete

The current readiness assessment is documented here:
- [oracle-migration-readiness.md](C:/Users/ahmeds/researchwork/testproject/CMSTest/docs/oracle-migration-readiness.md)
