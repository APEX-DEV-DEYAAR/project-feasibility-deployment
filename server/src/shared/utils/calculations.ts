import type { NormalizedPayload, FeasibilityMetrics, JvShare, MetricOverride } from "../types/index.js";

export const INPUT_KEYS = [
  "landArea", "landCost", "landPsf", "gfa", "nsaResi", "nsaRetail", "buaResi", "buaRetail",
  "unitsResi", "unitsRetail", "resiPsf", "retailPsf", "carParkIncome", "cofOnSalesPct", "ccPsf",
  "softPct", "statPct", "contPct", "devMgmtPct", "cofPct", "salesExpPct", "mktPct",
] as const;

export type InputKey = (typeof INPUT_KEYS)[number];

const toNullableNumber = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function normalizePayload(payload: Record<string, unknown> = {}): NormalizedPayload {
  const projectName = String(payload.projectName || "").trim();
  if (!projectName) {
    throw new Error("projectName is required");
  }

  const sourceInput = (payload.input as Record<string, unknown>) || {};
  const input = Object.fromEntries(
    INPUT_KEYS.map((key) => [key, toNullableNumber(sourceInput[key])])
  ) as Record<InputKey, number | null>;

  const rawPartners = Array.isArray(payload.partners) ? payload.partners : [];
  const partners = rawPartners
    .map((p: Record<string, unknown>) => ({
      name: String(p?.name ?? "").trim(),
      share: toNullableNumber(p?.share),
    }))
    .filter((p) => p.name.length > 0);

  return { projectName, input, partners };
}

export function calculateMetrics(payload: Record<string, unknown> | NormalizedPayload): FeasibilityMetrics {
  const clean = normalizePayload(payload as Record<string, unknown>);
  const i = Object.fromEntries(
    INPUT_KEYS.map((key) => [key, toNumber(clean.input[key])])
  ) as Record<InputKey, number>;

  const nsaTotal = i.nsaResi + i.nsaRetail;
  const buaTotal = i.buaResi + i.buaRetail;
  const unitsTotal = i.unitsResi + i.unitsRetail;
  const allocationBase = nsaTotal || buaTotal;
  const resiAllocation = allocationBase ? (nsaTotal ? i.nsaResi / nsaTotal : i.buaResi / buaTotal) : 0.5;
  const retailAllocation = 1 - resiAllocation;

  // Revenue / Inflows
  const grossResi = (i.nsaResi * i.resiPsf) / 1e6;
  const cofOnSales = grossResi * (i.cofOnSalesPct / 100);
  const netResi = grossResi - cofOnSales;
  const retailInc = (i.nsaRetail * i.retailPsf) / 1e6;
  const carParkIncome = i.carParkIncome;
  const totalInflows = netResi + retailInc + carParkIncome;

  // Land cost: use landPsf × GFA when provided, otherwise flat landCost
  const landCostTotal = i.landPsf > 0 ? (i.landPsf * i.gfa) / 1e6 : i.landCost;
  const landResi = landCostTotal * resiAllocation;
  const landRetail = landCostTotal * retailAllocation;
  const landTotal = landResi + landRetail;

  const ccResi = (i.buaResi * i.ccPsf) / 1e6;
  const ccRetail = (i.buaRetail * i.ccPsf) / 1e6;
  const ccTotal = ccResi + ccRetail;

  const softResi = ccResi * (i.softPct / 100);
  const softRetail = ccRetail * (i.softPct / 100);
  const softTotal = softResi + softRetail;

  const statResi = ccResi * (i.statPct / 100);
  const statRetail = ccRetail * (i.statPct / 100);
  const statTotal = statResi + statRetail;

  // Contingency = % of (CC + Soft)
  const contResi = (ccResi + softResi) * (i.contPct / 100);
  const contRetail = (ccRetail + softRetail) * (i.contPct / 100);
  const contTotal = contResi + contRetail;

  const devResi = grossResi * (i.devMgmtPct / 100);
  const devRetail = 0;
  const devTotal = devResi + devRetail;

  // COF in costs (% of total inflows), split by allocation
  const cofTotal = totalInflows * (i.cofPct / 100);
  const cofResi = cofTotal * resiAllocation;
  const cofRetail = cofTotal * retailAllocation;

  const seResi = grossResi * (i.salesExpPct / 100);
  const seRetail = 0;
  const seTotal = seResi + seRetail;

  const mkResi = grossResi * (i.mktPct / 100);
  const mkRetail = 0;
  const mkTotal = mkResi + mkRetail;

  const costResi = landResi + ccResi + softResi + statResi + contResi + devResi + cofResi + seResi + mkResi;
  const costRetail = landRetail + ccRetail + softRetail + statRetail + contRetail + devRetail + cofRetail + seRetail + mkRetail;
  const costTotal = costResi + costRetail;

  const npResi = (netResi + carParkIncome) - costResi;
  const npRetail = retailInc - costRetail;
  const netProfit = totalInflows - costTotal;

  const marginResi = (netResi + carParkIncome) ? (npResi / (netResi + carParkIncome)) * 100 : 0;
  const marginRetail = retailInc ? (npRetail / retailInc) * 100 : 0;
  const marginPct = totalInflows ? (netProfit / totalInflows) * 100 : 0;

  // Cash profit = Net Profit + CoF on Sales (recovered post-handover)
  const cashProfit = netProfit + cofOnSales;
  const cashMarginPct = totalInflows ? (cashProfit / totalInflows) * 100 : 0;

  const jvShares: JvShare[] = clean.partners.map((partner) => ({
    name: partner.name,
    share: toNumber(partner.share),
    profitShare: netProfit * (toNumber(partner.share) / 100),
  }));

  return {
    area: {
      landArea: i.landArea, gfa: i.gfa,
      nsaResi: i.nsaResi, nsaRetail: i.nsaRetail, nsaTotal,
      buaResi: i.buaResi, buaRetail: i.buaRetail, buaTotal,
      unitsResi: i.unitsResi, unitsRetail: i.unitsRetail, unitsTotal,
      efficiencyPct: buaTotal ? (nsaTotal / buaTotal) * 100 : 0,
    },
    revenue: {
      grossResi, cofOnSales, netResi, retail: retailInc, carParkIncome, totalInflows,
      resi: netResi, total: totalInflows,
    },
    costs: {
      landResi, landRetail, land: landTotal,
      ccResi, ccRetail, construction: ccTotal,
      softResi, softRetail, soft: softTotal,
      statResi, statRetail, statutory: statTotal,
      contResi, contRetail, contingency: contTotal,
      devResi, devRetail, devMgmt: devTotal,
      cofResi, cofRetail, cof: cofTotal,
      seResi, seRetail, salesExpense: seTotal,
      mkResi, mkRetail, marketing: mkTotal,
      costResi, costRetail, total: costTotal,
    },
    profitability: { npResi, npRetail, netProfit, marginResi, marginRetail, marginPct, cashProfit, cashMarginPct },
    jvShares,
    kpis: { totalRevenue: totalInflows, totalCost: costTotal, netProfit, marginPct, totalUnits: unitsTotal },
  };
}

export function applyOverrides(
  metrics: FeasibilityMetrics,
  overrides: MetricOverride[]
): FeasibilityMetrics {
  if (!overrides || overrides.length === 0) return metrics;
  const result = JSON.parse(JSON.stringify(metrics)) as FeasibilityMetrics;
  for (const ov of overrides) {
    const parts = ov.metricKey.split(".");
    let target: Record<string, unknown> = result as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const next = target[parts[i]];
      if (next && typeof next === "object") {
        target = next as Record<string, unknown>;
      } else {
        target = {};
        break;
      }
    }
    const lastKey = parts[parts.length - 1];
    if (lastKey in target) {
      target[lastKey] = ov.overrideValue;
    }
  }
  return result;
}
