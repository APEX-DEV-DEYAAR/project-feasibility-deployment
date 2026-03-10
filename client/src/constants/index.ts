import type { FieldGroup } from "../types";

/* Official Deyaar Brand Colors from Logo Agent Pack */
export const DEYAAR_COLORS = {
  orange: "#D26935",
  orangeLight: "#E07B4A",
  orangeDark: "#B85628",
  brown: "#3D2914",
  brownLight: "#5C4033",
  brownMid: "#4A3428",
  beige: "#F5ECD9",
  cream: "#FAF6ED",
  sand: "#E8DCC8",
  terracotta: "#A64B2A",
  rust: "#8B3A22",
} as const;

/* Partner chart colors - harmonized with Deyaar brand */
export const PARTNER_COLORS = [
  DEYAAR_COLORS.orange,      // Primary brand orange
  DEYAAR_COLORS.brown,       // Brand brown
  DEYAAR_COLORS.terracotta,  // Terracotta
  DEYAAR_COLORS.rust,        // Rust
  "#2E7D52",                 // Green (complementary)
  "#2C5F8A",                 // Blue (complementary)
  "#6B3D7A",                 // Purple (complementary)
] as const;

export const FIELD_GROUPS: FieldGroup[] = [
  {
    title: "Land & Area",
    icon: "\u25A3",
    fields: [
      { key: "landArea", label: "Land Area (sq ft)" },
      { key: "landCost", label: "Land Cost (AED M)", prefix: "AED" },
      { key: "landPsf", label: "Land Cost (AED psf of GFA)", prefix: "AED" },
      { key: "gfa", label: "GFA Proposed (sq ft)" },
      { key: "nsaResi", label: "NSA \u2013 Resi" },
      { key: "nsaRetail", label: "NSA \u2013 Retail" },
      { key: "buaResi", label: "BUA \u2013 Resi" },
      { key: "buaRetail", label: "BUA \u2013 Retail" },
      { key: "unitsResi", label: "Units \u2013 Resi" },
      { key: "unitsRetail", label: "Units \u2013 Retail" },
    ],
  },
  {
    title: "Revenue Inputs",
    icon: "\u25C8",
    fields: [
      { key: "resiPsf", label: "Resi Price (AED psf of NSA)", prefix: "AED" },
      { key: "retailPsf", label: "Retail Income (AED psf of NSA)", prefix: "AED" },
      { key: "carParkIncome", label: "Car Parking Income (AED M)", prefix: "AED" },
      { key: "cofOnSalesPct", label: "CoF on Sales", suffix: "%" },
    ],
  },
  {
    title: "Construction",
    icon: "\u25B2",
    fields: [{ key: "ccPsf", label: "Build Cost (AED psf of BUA)", prefix: "AED" }],
  },
  {
    title: "Cost Rates",
    icon: "%",
    fields: [
      { key: "softPct", label: "Soft Costs", suffix: "%" },
      { key: "statPct", label: "Statutory", suffix: "%" },
      { key: "contPct", label: "Contingency", suffix: "%" },
      { key: "devMgmtPct", label: "Dev. Mgmt", suffix: "%" },
      { key: "cofPct", label: "COF / Guarantee", suffix: "%" },
      { key: "salesExpPct", label: "Sales Expense", suffix: "%" },
      { key: "mktPct", label: "Marketing", suffix: "%" },
    ],
  },
];
