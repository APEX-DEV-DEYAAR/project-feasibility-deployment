ALTER TABLE project_collections_installments
  ADD (
    building_name                  VARCHAR2(255 CHAR),
    location_code                  VARCHAR2(255 CHAR),
    property_type                  VARCHAR2(100 CHAR),
    spa_signed_date                DATE,
    spa_sign_status                VARCHAR2(100 CHAR),
    tsv_amount                     NUMBER(15,2),
    total_cleared                  NUMBER(15,2),
    waived_amount                  NUMBER(15,2),
    total_over_due                 NUMBER(15,2),
    cleared_pct                    NUMBER(9,4),
    paid_pct                       NUMBER(9,4),
    is_unit_over_due               VARCHAR2(20 CHAR),
    installments_over_due_bucket   VARCHAR2(100 CHAR),
    over_due_pct_bucket            VARCHAR2(100 CHAR),
    registered_sale_type           VARCHAR2(100 CHAR),
    latest_construction_progress   NUMBER(7,4),
    can_claim_total                NUMBER(9,4),
    can_claim_additional           NUMBER(9,4),
    eligible_for_dld_termination   VARCHAR2(20 CHAR)
  );
