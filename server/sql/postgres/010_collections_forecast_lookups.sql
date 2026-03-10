CREATE TABLE IF NOT EXISTS collections_completion_lookup (
  id                            BIGSERIAL PRIMARY KEY,
  building_name                 TEXT NOT NULL UNIQUE,
  project_dld_completion_date   DATE,
  latest_construction_progress  NUMERIC(7,4),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collections_aging_lookup (
  id                  BIGSERIAL PRIMARY KEY,
  location_code       TEXT NOT NULL UNIQUE,
  bucket_0_29         NUMERIC(15,2) NOT NULL DEFAULT 0,
  bucket_30_59        NUMERIC(15,2) NOT NULL DEFAULT 0,
  bucket_60_89        NUMERIC(15,2) NOT NULL DEFAULT 0,
  bucket_90_179       NUMERIC(15,2) NOT NULL DEFAULT 0,
  bucket_180_365      NUMERIC(15,2) NOT NULL DEFAULT 0,
  bucket_365_plus     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
