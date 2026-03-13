import { describe, it, expect } from "vitest";
import {
  emptyInputModel,
  emptyModel,
  hydrateModelFromRun,
  serializeModelForSave,
  calculateMetrics,
  INPUT_KEYS,
} from "./calculations";

// ── emptyInputModel ──

describe("emptyInputModel", () => {
  it("creates an object with all INPUT_KEYS set to empty string", () => {
    const m = emptyInputModel();
    expect(Object.keys(m)).toHaveLength(INPUT_KEYS.length);
    Object.values(m).forEach((v) => expect(v).toBe(""));
  });
});

// ── emptyModel ──

describe("emptyModel", () => {
  it("returns default draft model", () => {
    const m = emptyModel();
    expect(m.projectName).toBe("");
    expect(m.projectId).toBeNull();
    expect(m.runId).toBeNull();
    expect(m.status).toBe("draft");
    expect(m.partners).toHaveLength(1);
  });

  it("accepts projectName and projectId", () => {
    const m = emptyModel("Tower A", 5);
    expect(m.projectName).toBe("Tower A");
    expect(m.projectId).toBe(5);
  });
});

// ── hydrateModelFromRun ──

describe("hydrateModelFromRun", () => {
  it("hydrates from a run payload", () => {
    const m = hydrateModelFromRun({
      runId: 1,
      projectId: 10,
      projectName: "Tower A",
      version: 2,
      status: "frozen",
      payload: {
        input: { landArea: 50000, gfa: null },
        partners: [{ name: "Deyaar", share: 60 }],
      },
    });

    expect(m.runId).toBe(1);
    expect(m.projectId).toBe(10);
    expect(m.projectName).toBe("Tower A");
    expect(m.version).toBe(2);
    expect(m.status).toBe("frozen");
    expect(m.input.landArea).toBe("50000");
    expect(m.input.gfa).toBe("");
    expect(m.partners[0]).toEqual({ name: "Deyaar", share: "60" });
  });

  it("defaults to one empty partner when none provided", () => {
    const m = hydrateModelFromRun({
      runId: 1,
      projectId: 10,
      projectName: "Test",
      version: null,
      status: "draft",
      payload: {},
    });
    expect(m.partners).toEqual([{ name: "", share: "" }]);
  });
});

// ── serializeModelForSave ──

describe("serializeModelForSave", () => {
  it("serializes model to API payload", () => {
    const model = emptyModel("Tower A", 10);
    model.input.landArea = "50000";
    model.input.gfa = "100000";
    model.partners = [
      { name: "Deyaar", share: "60" },
      { name: "", share: "40" },
    ];

    const result = serializeModelForSave(model);

    expect(result.projectName).toBe("Tower A");
    expect((result.input as Record<string, unknown>).landArea).toBe(50000);
    expect((result.input as Record<string, unknown>).gfa).toBe(100000);
    // Empty-named partners are filtered out
    expect(result.partners).toHaveLength(1);
    expect((result.partners as Array<{ name: string }>)[0].name).toBe("Deyaar");
  });

  it("converts empty string inputs to null", () => {
    const model = emptyModel("Test", 1);
    const result = serializeModelForSave(model);

    Object.values(result.input as Record<string, unknown>).forEach((v) =>
      expect(v).toBeNull()
    );
  });
});

// ── calculateMetrics ──

describe("calculateMetrics", () => {
  function makeModel(input: Record<string, string> = {}) {
    const m = emptyModel("Test", 1);
    Object.entries(input).forEach(([k, v]) => {
      m.input[k] = v;
    });
    return m;
  }

  it("returns zeros for empty model", () => {
    const m = calculateMetrics(emptyModel());
    expect(m.kpis.totalRevenue).toBe(0);
    expect(m.kpis.totalCost).toBe(0);
    expect(m.kpis.netProfit).toBe(0);
    expect(m.kpis.marginPct).toBe(0);
    expect(m.kpis.totalUnits).toBe(0);
    expect(Number.isNaN(m.kpis.marginPct)).toBe(false);
  });

  it("calculates residential revenue", () => {
    const model = makeModel({ nsaResi: "80000", resiPsf: "1500" });
    const m = calculateMetrics(model);
    // 80000 × 1500 / 1e6 = 120
    expect(m.revenue.grossResi).toBeCloseTo(120, 4);
  });

  it("deducts CoF on sales from gross resi", () => {
    const model = makeModel({
      nsaResi: "100000",
      resiPsf: "1000",
      cofOnSalesPct: "5",
    });
    const m = calculateMetrics(model);
    // Gross = 100, CoF = 5, Net = 95
    expect(m.revenue.grossResi).toBeCloseTo(100, 4);
    expect(m.revenue.cofOnSales).toBeCloseTo(5, 4);
    expect(m.revenue.netResi).toBeCloseTo(95, 4);
  });

  it("uses landPsf × GFA when landPsf > 0", () => {
    const model = makeModel({
      landPsf: "50",
      gfa: "200000",
      landCost: "999",
    });
    const m = calculateMetrics(model);
    // 50 × 200000 / 1e6 = 10
    expect(m.costs.land).toBeCloseTo(10, 4);
  });

  it("uses flat landCost when landPsf is 0", () => {
    const model = makeModel({ landCost: "100", landPsf: "0" });
    const m = calculateMetrics(model);
    expect(m.costs.land).toBeCloseTo(100, 4);
  });

  it("calculates area efficiency", () => {
    const model = makeModel({
      nsaResi: "80000",
      nsaRetail: "20000",
      buaResi: "100000",
      buaRetail: "25000",
    });
    const m = calculateMetrics(model);
    expect(m.area.nsaTotal).toBe(100000);
    expect(m.area.buaTotal).toBe(125000);
    expect(m.area.efficiencyPct).toBeCloseTo(80, 4);
  });

  it("computes partner profit splits", () => {
    const model = makeModel({
      nsaResi: "100000",
      resiPsf: "1000",
      buaResi: "120000",
      ccPsf: "200",
    });
    model.partners = [
      { name: "Deyaar", share: "60" },
      { name: "Partner B", share: "40" },
    ];
    const m = calculateMetrics(model);

    expect(m.partnerProfit).toHaveLength(2);
    expect(m.partnerProfit[0].share).toBe(60);
    expect(m.partnerProfit[1].share).toBe(40);
    expect(m.partnerProfit[0].profitShare + m.partnerProfit[1].profitShare).toBeCloseTo(
      m.kpis.netProfit,
      4
    );
  });

  it("filters out unnamed partners from partnerProfit", () => {
    const model = makeModel({ nsaResi: "100000", resiPsf: "1000" });
    model.partners = [
      { name: "Deyaar", share: "100" },
      { name: "", share: "0" },
    ];
    const m = calculateMetrics(model);
    expect(m.partnerProfit).toHaveLength(1);
  });

  it("cash profit = net profit + cof on sales", () => {
    const model = makeModel({
      nsaResi: "100000",
      resiPsf: "1000",
      cofOnSalesPct: "3",
    });
    const m = calculateMetrics(model);
    expect(m.profitability.cashProfit).toBeCloseTo(
      m.profitability.netProfit + m.revenue.cofOnSales,
      4
    );
  });

  it("KPIs are consistent with detailed sections", () => {
    const model = makeModel({
      nsaResi: "80000",
      resiPsf: "1500",
      buaResi: "100000",
      ccPsf: "400",
      unitsResi: "200",
    });
    const m = calculateMetrics(model);
    expect(m.kpis.totalRevenue).toBe(m.revenue.totalInflows);
    expect(m.kpis.totalCost).toBe(m.costs.total);
    expect(m.kpis.netProfit).toBe(m.profitability.netProfit);
    expect(m.kpis.totalUnits).toBe(m.area.unitsTotal);
  });
});
