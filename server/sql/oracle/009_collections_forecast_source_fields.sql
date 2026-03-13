ALTER TABLE project_collections_installments
  ADD (
    risk_category           VARCHAR2(100 CHAR),
    exposure_bucket         VARCHAR2(100 CHAR),
    expected_forfeiture     VARCHAR2(100 CHAR),
    unit_forecast           VARCHAR2(255 CHAR),
    over_due_pct            NUMBER(9,4),
    installments_over_due   NUMBER,
    source_status           VARCHAR2(100 CHAR),
    payment_plan_name       VARCHAR2(255 CHAR),
    project_completion_date DATE
  );
