import type { ClientModel, ClientInputModel, ClientPartner, FeasibilityMetrics, PartnerProfit } from "../types";

export const INPUT_KEYS = [
  "landArea", "landCost", "landPsf", "gfa", "nsaResi", "nsaRetail", "buaResi", "buaRetail",
  "unitsResi", "unitsRetail", "resiPsf", "retailPsf", "carParkIncome", "cofOnSalesPct", "ccPsf",
  "softPct", "statPct", "contPct", "devMgmtPct", "cofPct", "salesExpPct", "mktPct",
] as const;

export type InputKey = (typeof INPUT_KEYS)[number];

export function emptyInputModel(): ClientInputModel {
  return Object.fromEntries(INPUT_KEYS.map((key) => [key, ""]));
}

export function emptyModel(projectName = "", projectId: number | null = null): ClientModel {
  return {
    runId: null,
    projectId,
    projectName,
    input: emptyInputModel(),
    partners: [{ name: "", share: "" }],
    version: 0,
    status: "draft",
  };
}

const toNumber = (value: unknown): number => {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export interface HydrateOptions {
  runId: number;
  projectId: number;
  projectName: string;
  version: number | null;
  status: "draft" | "frozen";
  payload: Record<string, unknown>;
}

export function hydrateModelFromRun(opts: HydrateOptions): ClientModel {
  const payload = opts.payload || {};
  const input = (payload.input as Record<string, unknown>) || {};
  const hydratedInput: ClientInputModel = Object.fromEntries(
    INPUT_KEYS.map((key) => {
      const value = input[key];
      return [key, value === null || value === undefined ? "" : String(value)];
    })
  );

  const rawPartners = Array.isArray(payload.partners) ? payload.partners : [];
  const partners: ClientPartner[] = rawPartners.map(
    (p: Record<string, unknown>) => ({
      name: (p?.name as string) ?? "",
      share: p?.share === null || p?.share === undefined ? "" : String(p.share),
    })
  );

  return {
    runId: opts.runId,
    projectId: opts.projectId,
    projectName: opts.projectName,
    input: hydratedInput,
    partners: partners.length ? partners : [{ name: "", share: "" }],
    version: opts.version,
    status: opts.status,
  };
}

export function serializeModelForSave(model: ClientModel): Record<string, unknown> {
  const cleanInput = Object.fromEntries(
    INPUT_KEYS.map((key) => [key, toNullableNumber(model.input[key])])
  );

  const cleanPartners = model.partners
    .map((partner) => ({
      name: String(partner.name ?? "").trim(),
      share: toNullableNumber(partner.share),
    }))
    .filter((partner) => partner.name.length > 0);

  return {
    projectName: String(model.projectName ?? "").trim(),
    input: cleanInput,
    partners: cleanPartners,
  };
}

export function calculateMetrics(model: ClientModel): FeasibilityMetrics {
  const i = Object.fromEntries(
    INPUT_KEYS.map((key) => [key, toNumber(model?.input?.[key])])
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

  const partnerProfit: PartnerProfit[] = model.partners
    .map((partner) => ({
      name: String(partner.name ?? "").trim(),
      share: toNumber(partner.share),
    }))
    .filter((p) => p.name.length > 0)
    .map((p) => ({ ...p, profitShare: netProfit * (p.share / 100) }));

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
    partnerProfit,
    kpis: { totalRevenue: totalInflows, totalCost: costTotal, netProfit, marginPct, totalUnits: unitsTotal },
  };
}
