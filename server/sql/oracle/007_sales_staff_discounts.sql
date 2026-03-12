-- =============================================================
-- Sales team expansion: add Staff Discounts and align sales labels
-- =============================================================

MERGE INTO cost_categories tgt
USING (
  SELECT
    'staff_discounts' AS code,
    'Staff Discounts' AS name,
    'Sales discounts granted to staff purchases' AS description,
    6 AS display_order,
    'sales' AS team
  FROM dual
) src
ON (tgt.code = src.code)
WHEN MATCHED THEN
  UPDATE SET
    tgt.name = src.name,
    tgt.description = src.description,
    tgt.display_order = src.display_order,
    tgt.team = src.team
WHEN NOT MATCHED THEN
  INSERT (code, name, description, display_order, team)
  VALUES (src.code, src.name, src.description, src.display_order, src.team);

UPDATE cost_categories
SET
  name = 'DLD Waiver Cost',
  description = 'Dubai Land Department waiver and transfer fee costs',
  display_order = 7,
  team = 'sales'
WHERE code = 'dld_cost';

UPDATE cost_categories
SET
  name = 'Staff Incentives',
  description = 'Sales staff incentives and bonuses',
  display_order = 8,
  team = 'sales'
WHERE code = 'sales_incentives';
