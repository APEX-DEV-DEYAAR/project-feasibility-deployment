-- Metric overrides for feasibility runs (draft/frozen)
BEGIN
  EXECUTE IMMEDIATE q'[
    CREATE TABLE feasibility_run_overrides (
      id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      run_id          NUMBER NOT NULL REFERENCES feasibility_runs(id) ON DELETE CASCADE,
      metric_key      VARCHAR2(200) NOT NULL,
      original_value  NUMBER NOT NULL,
      override_value  NUMBER NOT NULL,
      justification   CLOB DEFAULT '',
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_run_override UNIQUE (run_id, metric_key)
    )]';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE q'[
    CREATE TABLE feasibility_archive_overrides (
      id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      archive_id      NUMBER NOT NULL REFERENCES feasibility_archive(id) ON DELETE CASCADE,
      metric_key      VARCHAR2(200) NOT NULL,
      original_value  NUMBER NOT NULL,
      override_value  NUMBER NOT NULL,
      justification   CLOB DEFAULT '',
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_archive_override UNIQUE (archive_id, metric_key)
    )]';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -955 THEN RAISE; END IF;
END;
/
