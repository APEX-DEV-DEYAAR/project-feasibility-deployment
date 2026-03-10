-- =============================================================
-- Project Feasibility Schema — PostgreSQL
-- NOTE: If migrating from the old schema (single feasibility_runs
-- table with project_name), drop it first:
--   DROP TABLE IF EXISTS feasibility_runs CASCADE;
-- =============================================================

CREATE TABLE IF NOT EXISTS projects (
  id          BIGSERIAL    PRIMARY KEY,
  name        TEXT         NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feasibility_runs (
  id          BIGSERIAL    PRIMARY KEY,
  project_id  BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version     INT,
  status      TEXT         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'frozen')),
  payload     JSONB        NOT NULL,
  metrics     JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  frozen_at   TIMESTAMPTZ,
  UNIQUE (project_id, version)
);

CREATE TABLE IF NOT EXISTS feasibility_archive (
  id              BIGSERIAL    PRIMARY KEY,
  original_run_id BIGINT       NOT NULL,
  project_id      BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version         INT          NOT NULL,
  payload         JSONB        NOT NULL,
  metrics         JSONB        NOT NULL,
  frozen_at       TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feasibility_runs_project_version
  ON feasibility_runs (project_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_feasibility_archive_project
  ON feasibility_archive (project_id, version DESC);

ALTER TABLE feasibility_runs
  ALTER COLUMN version DROP NOT NULL;

ALTER TABLE feasibility_runs
  ALTER COLUMN version DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_feasibility_runs_one_draft_per_project
  ON feasibility_runs (project_id)
  WHERE status = 'draft';

ALTER TABLE IF EXISTS feasibility_reporting_current
  ADD COLUMN IF NOT EXISTS land_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_land_resi NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_land_retail NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_land NUMERIC;

ALTER TABLE IF EXISTS feasibility_reporting_archive
  ADD COLUMN IF NOT EXISTS land_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_land_resi NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_land_retail NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_land NUMERIC;

CREATE TABLE IF NOT EXISTS feasibility_reporting_current (
  run_id               BIGINT PRIMARY KEY REFERENCES feasibility_runs(id) ON DELETE CASCADE,
  project_id           BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version              INT,
  status               TEXT NOT NULL CHECK (status IN ('draft', 'frozen')),
  created_at           TIMESTAMPTZ NOT NULL,
  updated_at           TIMESTAMPTZ NOT NULL,
  frozen_at            TIMESTAMPTZ,
  project_name         TEXT NOT NULL,
  land_area            NUMERIC,
  land_cost            NUMERIC,
  gfa                  NUMERIC,
  nsa_resi             NUMERIC,
  nsa_retail           NUMERIC,
  bua_resi             NUMERIC,
  bua_retail           NUMERIC,
  units_resi           NUMERIC,
  units_retail         NUMERIC,
  resi_psf             NUMERIC,
  retail_psf           NUMERIC,
  cc_psf               NUMERIC,
  soft_pct             NUMERIC,
  stat_pct             NUMERIC,
  cont_pct             NUMERIC,
  dev_mgmt_pct         NUMERIC,
  cof_pct              NUMERIC,
  sales_exp_pct        NUMERIC,
  mkt_pct              NUMERIC,
  area_land_area       NUMERIC NOT NULL,
  area_gfa             NUMERIC NOT NULL,
  area_nsa_resi        NUMERIC NOT NULL,
  area_nsa_retail      NUMERIC NOT NULL,
  area_nsa_total       NUMERIC NOT NULL,
  area_bua_resi        NUMERIC NOT NULL,
  area_bua_retail      NUMERIC NOT NULL,
  area_bua_total       NUMERIC NOT NULL,
  area_units_resi      NUMERIC NOT NULL,
  area_units_retail    NUMERIC NOT NULL,
  area_units_total     NUMERIC NOT NULL,
  area_efficiency_pct  NUMERIC NOT NULL,
  revenue_resi         NUMERIC NOT NULL,
  revenue_retail       NUMERIC NOT NULL,
  revenue_total        NUMERIC NOT NULL,
  cost_land_resi       NUMERIC NOT NULL,
  cost_land_retail     NUMERIC NOT NULL,
  cost_land            NUMERIC NOT NULL,
  cost_cc_resi         NUMERIC NOT NULL,
  cost_cc_retail       NUMERIC NOT NULL,
  cost_construction    NUMERIC NOT NULL,
  cost_soft_resi       NUMERIC NOT NULL,
  cost_soft_retail     NUMERIC NOT NULL,
  cost_soft            NUMERIC NOT NULL,
  cost_stat_resi       NUMERIC NOT NULL,
  cost_stat_retail     NUMERIC NOT NULL,
  cost_statutory       NUMERIC NOT NULL,
  cost_cont_resi       NUMERIC NOT NULL,
  cost_cont_retail     NUMERIC NOT NULL,
  cost_contingency     NUMERIC NOT NULL,
  cost_dev_resi        NUMERIC NOT NULL,
  cost_dev_retail      NUMERIC NOT NULL,
  cost_dev_mgmt        NUMERIC NOT NULL,
  cost_cof_resi        NUMERIC NOT NULL,
  cost_cof_retail      NUMERIC NOT NULL,
  cost_cof             NUMERIC NOT NULL,
  cost_se_resi         NUMERIC NOT NULL,
  cost_se_retail       NUMERIC NOT NULL,
  cost_sales_expense   NUMERIC NOT NULL,
  cost_mk_resi         NUMERIC NOT NULL,
  cost_mk_retail       NUMERIC NOT NULL,
  cost_marketing       NUMERIC NOT NULL,
  cost_resi            NUMERIC NOT NULL,
  cost_retail          NUMERIC NOT NULL,
  cost_total           NUMERIC NOT NULL,
  profit_np_resi       NUMERIC NOT NULL,
  profit_np_retail     NUMERIC NOT NULL,
  profit_net_profit    NUMERIC NOT NULL,
  profit_margin_resi   NUMERIC NOT NULL,
  profit_margin_retail NUMERIC NOT NULL,
  profit_margin_pct    NUMERIC NOT NULL,
  kpi_total_revenue    NUMERIC NOT NULL,
  kpi_total_cost       NUMERIC NOT NULL,
  kpi_net_profit       NUMERIC NOT NULL,
  kpi_margin_pct       NUMERIC NOT NULL,
  kpi_total_units      NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feasibility_reporting_current_project
  ON feasibility_reporting_current (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS feasibility_reporting_current_partners (
  id            BIGSERIAL PRIMARY KEY,
  run_id        BIGINT NOT NULL REFERENCES feasibility_reporting_current(run_id) ON DELETE CASCADE,
  partner_order INT NOT NULL,
  partner_name  TEXT NOT NULL,
  share_pct     NUMERIC NOT NULL,
  profit_share  NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feasibility_reporting_current_partners_run
  ON feasibility_reporting_current_partners (run_id, partner_order);

CREATE TABLE IF NOT EXISTS feasibility_reporting_archive (
  archive_id           BIGINT PRIMARY KEY REFERENCES feasibility_archive(id) ON DELETE CASCADE,
  original_run_id      BIGINT NOT NULL,
  project_id           BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version              INT NOT NULL,
  frozen_at            TIMESTAMPTZ,
  archived_at          TIMESTAMPTZ NOT NULL,
  project_name         TEXT NOT NULL,
  land_area            NUMERIC,
  land_cost            NUMERIC,
  gfa                  NUMERIC,
  nsa_resi             NUMERIC,
  nsa_retail           NUMERIC,
  bua_resi             NUMERIC,
  bua_retail           NUMERIC,
  units_resi           NUMERIC,
  units_retail         NUMERIC,
  resi_psf             NUMERIC,
  retail_psf           NUMERIC,
  cc_psf               NUMERIC,
  soft_pct             NUMERIC,
  stat_pct             NUMERIC,
  cont_pct             NUMERIC,
  dev_mgmt_pct         NUMERIC,
  cof_pct              NUMERIC,
  sales_exp_pct        NUMERIC,
  mkt_pct              NUMERIC,
  area_land_area       NUMERIC NOT NULL,
  area_gfa             NUMERIC NOT NULL,
  area_nsa_resi        NUMERIC NOT NULL,
  area_nsa_retail      NUMERIC NOT NULL,
  area_nsa_total       NUMERIC NOT NULL,
  area_bua_resi        NUMERIC NOT NULL,
  area_bua_retail      NUMERIC NOT NULL,
  area_bua_total       NUMERIC NOT NULL,
  area_units_resi      NUMERIC NOT NULL,
  area_units_retail    NUMERIC NOT NULL,
  area_units_total     NUMERIC NOT NULL,
  area_efficiency_pct  NUMERIC NOT NULL,
  revenue_resi         NUMERIC NOT NULL,
  revenue_retail       NUMERIC NOT NULL,
  revenue_total        NUMERIC NOT NULL,
  cost_land_resi       NUMERIC NOT NULL,
  cost_land_retail     NUMERIC NOT NULL,
  cost_land            NUMERIC NOT NULL,
  cost_cc_resi         NUMERIC NOT NULL,
  cost_cc_retail       NUMERIC NOT NULL,
  cost_construction    NUMERIC NOT NULL,
  cost_soft_resi       NUMERIC NOT NULL,
  cost_soft_retail     NUMERIC NOT NULL,
  cost_soft            NUMERIC NOT NULL,
  cost_stat_resi       NUMERIC NOT NULL,
  cost_stat_retail     NUMERIC NOT NULL,
  cost_statutory       NUMERIC NOT NULL,
  cost_cont_resi       NUMERIC NOT NULL,
  cost_cont_retail     NUMERIC NOT NULL,
  cost_contingency     NUMERIC NOT NULL,
  cost_dev_resi        NUMERIC NOT NULL,
  cost_dev_retail      NUMERIC NOT NULL,
  cost_dev_mgmt        NUMERIC NOT NULL,
  cost_cof_resi        NUMERIC NOT NULL,
  cost_cof_retail      NUMERIC NOT NULL,
  cost_cof             NUMERIC NOT NULL,
  cost_se_resi         NUMERIC NOT NULL,
  cost_se_retail       NUMERIC NOT NULL,
  cost_sales_expense   NUMERIC NOT NULL,
  cost_mk_resi         NUMERIC NOT NULL,
  cost_mk_retail       NUMERIC NOT NULL,
  cost_marketing       NUMERIC NOT NULL,
  cost_resi            NUMERIC NOT NULL,
  cost_retail          NUMERIC NOT NULL,
  cost_total           NUMERIC NOT NULL,
  profit_np_resi       NUMERIC NOT NULL,
  profit_np_retail     NUMERIC NOT NULL,
  profit_net_profit    NUMERIC NOT NULL,
  profit_margin_resi   NUMERIC NOT NULL,
  profit_margin_retail NUMERIC NOT NULL,
  profit_margin_pct    NUMERIC NOT NULL,
  kpi_total_revenue    NUMERIC NOT NULL,
  kpi_total_cost       NUMERIC NOT NULL,
  kpi_net_profit       NUMERIC NOT NULL,
  kpi_margin_pct       NUMERIC NOT NULL,
  kpi_total_units      NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feasibility_reporting_archive_project
  ON feasibility_reporting_archive (project_id, version DESC);

CREATE TABLE IF NOT EXISTS feasibility_reporting_archive_partners (
  id            BIGSERIAL PRIMARY KEY,
  archive_id    BIGINT NOT NULL REFERENCES feasibility_reporting_archive(archive_id) ON DELETE CASCADE,
  partner_order INT NOT NULL,
  partner_name  TEXT NOT NULL,
  share_pct     NUMERIC NOT NULL,
  profit_share  NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feasibility_reporting_archive_partners_archive
  ON feasibility_reporting_archive_partners (archive_id, partner_order);
