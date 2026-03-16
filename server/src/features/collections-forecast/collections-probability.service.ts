import type { SaveCollectionsInstallmentPayload } from "../../shared/types/index.js";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export class CollectionsProbabilityService {
  calculate(payload: SaveCollectionsInstallmentPayload): number {
    let score = 100;
    const overduePct = Number(payload.overDuePct ?? 0);
    const installmentsOverDue = Number(payload.installmentsOverDue ?? 0);
    const riskCategory = normalizeText(payload.riskCategory);
    const exposureBucket = normalizeText(payload.exposureBucket);
    const expectedForfeiture = normalizeText(payload.expectedForfeiture);
    const unitForecast = normalizeText(payload.unitForecast);
    const sourceStatus = normalizeText(payload.sourceStatus);

    if (overduePct >= 20) score -= 50;
    else if (overduePct >= 13) score -= 35;
    else if (overduePct >= 8) score -= 22;
    else if (overduePct >= 5) score -= 12;
    else if (overduePct > 0) score -= 5;

    if (installmentsOverDue >= 4) score -= 18;
    else if (installmentsOverDue >= 2) score -= 10;
    else if (installmentsOverDue >= 1) score -= 5;

    if (riskCategory === "high") score -= 22;
    else if (riskCategory === "medium") score -= 12;
    else if (riskCategory === "low") score -= 4;

    if (exposureBucket.includes("365") || exposureBucket.includes("180")) score -= 18;
    else if (exposureBucket.includes("90")) score -= 10;
    else if (exposureBucket.includes("60")) score -= 6;
    else if (exposureBucket.includes("30")) score -= 4;

    if (expectedForfeiture === "yes") score -= 35;
    if (unitForecast.includes("worst")) score -= 22;
    else if (unitForecast.includes("due")) score -= 4;

    if (sourceStatus.includes("follow up")) score -= 10;
    else if (sourceStatus.includes("paying as per due dates")) score -= 2;

    return Math.max(5, Math.min(100, score));
  }
}
