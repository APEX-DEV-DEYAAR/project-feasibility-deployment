-- =============================================================
-- Sales team expansion: add Staff Discounts and align sales labels
-- Idempotent for existing databases
-- =============================================================

INSERT INTO cost_categories (code, name, description, display_order, team)
VALUES (
  'staff_discounts',
  'Staff Discounts',
  'Sales discounts granted to staff purchases',
  6,
  'sales'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  team = EXCLUDED.team;

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
