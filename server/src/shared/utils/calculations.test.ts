import { describe, it, expect } from "vitest";
import { normalizePayload, calculateMetrics } from "./calculations.js";

// ── normalizePayload ──────────────────────────────────────────────

describe("normalizePayload", () => {
  it("extracts projectName, input, and partners", () => {
    const result = normalizePayload({
      projectName: " Tower A ",
      input: { landArea: 50000, gfa: 120000 },
      partners: [{ name: "Deyaar", share: 60 }],
    });

    expect(result.projectName).toBe("Tower A");
    expect(result.input.landArea).toBe(50000);
    expect(result.input.gfa).toBe(120000);
    expect(result.partners).toHaveLength(1);
    expect(result.partners[0]).toEqual({ name: "Deyaar", share: 60 });
  });

  it("throws when projectName is missing", () => {
    expect(() => normalizePayload({})).toThrow("projectName is required");
  });

  it("throws when projectName is blank", () => {
    expect(() => normalizePayload({ projectName: "   " })).toThrow("projectName is required");
  });

  it("coerces non-numeric input values to null", () => {
    const result = normalizePayload({
      projectName: "Test",
      input: { landArea: "abc", gfa: "" },
    });
    expect(result.input.landArea).toBeNull();
    expect(result.input.gfa).toBeNull();
  });

  it("filters out partners with empty names", () => {
    const result = normalizePayload({
      projectName: "Test",
      partners: [
        { name: "Deyaar", share: 60 },
        { name: "", share: 40 },
        { name: "  ", share: 0 },
      ],
    });
    expect(result.partners).toHaveLength(1);
    expect(result.partners[0].name).toBe("Deyaar");
  });

  it("handles missing partners array", () => {
    const result = normalizePayload({ projectName: "Test" });
    expect(result.partners).toEqual([]);
  });

  it("handles missing input object", () => {
    const result = normalizePayload({ projectName: "Test" });
    // All 22 keys should be present as null
    expect(Object.keys(result.input)).toHaveLength(22);
    Object.values(result.input).forEach((v) => expect(v).toBeNull());
  });
});

// ── calculateMetrics ──────────────────────────────────────────────

describe("calculateMetrics", () => {
  const samplePayload = {
    projectName: "Tower A",
    input: {
      landArea: 50000,
      landCost: 100,
      landPsf: 0,
      gfa: 200000,
      nsaResi: 80000,
      nsaRetail: 20000,
      buaResi: 100000,
      buaRetail: 25000,
      unitsResi: 200,
      unitsRetail: 10,
      resiPsf: 1500,
      retailPsf: 2000,
      carParkIncome: 5,
      cofOnSalesPct: 2,
      ccPsf: 400,
      softPct: 10,
      statPct: 5,
      contPct: 3,
      devMgmtPct: 2,
      cofPct: 3,
      salesExpPct: 4,
      mktPct: 1.5,
    },
    partners: [
      { name: "Deyaar", share: 60 },
      { name: "JV Partner", share: 40 },
    ],
  };

  it("computes revenue correctly", () => {
    const m = calculateMetrics(samplePayload);

    // Gross resi = nsaResi × resiPsf / 1e6 = 80000 × 1500 / 1e6 = 120
    expect(m.revenue.grossResi).toBeCloseTo(120, 4);

    // CoF on sales = 120 × 2% = 2.4
    expect(m.revenue.cofOnSales).toBeCloseTo(2.4, 4);

    // Net resi = 120 - 2.4 = 117.6
    expect(m.revenue.netResi).toBeCloseTo(117.6, 4);

    // Retail = nsaRetail × retailPsf / 1e6 = 20000 × 2000 / 1e6 = 40
    expect(m.revenue.retail).toBeCloseTo(40, 4);

    // Total inflows = 117.6 + 40 + 5 = 162.6
    expect(m.revenue.totalInflows).toBeCloseTo(162.6, 4);
  });

  it("computes costs correctly", () => {
    const m = calculateMetrics(samplePayload);

    // Land cost = direct input (landPsf = 0) = 100
    expect(m.costs.land).toBeCloseTo(100, 4);

    // Construction = buaResi × ccPsf / 1e6 + buaRetail × ccPsf / 1e6
    // = 100000×400/1e6 + 25000×400/1e6 = 40 + 10 = 50
    expect(m.costs.construction).toBeCloseTo(50, 4);

    // Soft = 10% of construction per segment
    expect(m.costs.soft).toBeCloseTo(5, 4);

    // Statutory = 5% of construction
    expect(m.costs.statutory).toBeCloseTo(2.5, 4);
  });

  it("computes land cost from PSF when landPsf > 0", () => {
    const payload = {
      ...samplePayload,
      input: { ...samplePayload.input, landPsf: 50, landCost: 999 },
    };
    const m = calculateMetrics(payload);

    // landPsf × GFA / 1e6 = 50 × 200000 / 1e6 = 10
    expect(m.costs.land).toBeCloseTo(10, 4);
  });

  it("computes net profit and margin", () => {
    const m = calculateMetrics(samplePayload);

    expect(m.profitability.netProfit).toBeCloseTo(
      m.revenue.totalInflows - m.costs.total,
      4
    );
    expect(m.kpis.netProfit).toBe(m.profitability.netProfit);
    expect(m.kpis.marginPct).toBeCloseTo(
      (m.profitability.netProfit / m.revenue.totalInflows) * 100,
      4
    );
  });

  it("computes area metrics", () => {
    const m = calculateMetrics(samplePayload);

    expect(m.area.nsaTotal).toBe(100000);
    expect(m.area.buaTotal).toBe(125000);
    expect(m.area.unitsTotal).toBe(210);
    expect(m.area.efficiencyPct).toBeCloseTo(80, 4); // 100000/125000 * 100
  });

  it("computes JV partner shares", () => {
    const m = calculateMetrics(samplePayload);

    expect(m.jvShares).toHaveLength(2);
    expect(m.jvShares[0].name).toBe("Deyaar");
    expect(m.jvShares[0].share).toBe(60);
    expect(m.jvShares[0].profitShare).toBeCloseTo(
      m.profitability.netProfit * 0.6,
      4
    );
    expect(m.jvShares[1].profitShare).toBeCloseTo(
      m.profitability.netProfit * 0.4,
      4
    );
  });

  it("handles all-zero inputs without NaN", () => {
    const m = calculateMetrics({
      projectName: "Empty",
      input: {},
      partners: [],
    });

    expect(m.revenue.totalInflows).toBe(0);
    expect(m.costs.total).toBe(0);
    expect(m.profitability.netProfit).toBe(0);
    expect(m.profitability.marginPct).toBe(0);
    expect(m.area.efficiencyPct).toBe(0);
    expect(Number.isNaN(m.kpis.marginPct)).toBe(false);
  });

  it("cash profit adds back CoF on sales", () => {
    const m = calculateMetrics(samplePayload);

    expect(m.profitability.cashProfit).toBeCloseTo(
      m.profitability.netProfit + m.revenue.cofOnSales,
      4
    );
  });

  it("KPIs match detailed values", () => {
    const m = calculateMetrics(samplePayload);

    expect(m.kpis.totalRevenue).toBe(m.revenue.totalInflows);
    expect(m.kpis.totalCost).toBe(m.costs.total);
    expect(m.kpis.netProfit).toBe(m.profitability.netProfit);
    expect(m.kpis.totalUnits).toBe(m.area.unitsTotal);
  });
});
