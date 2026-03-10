import { CollectionsForecastRepository } from "../repositories/collections-forecast.repository.js";
import { CollectionsLookupRepository } from "../repositories/collections-lookup.repository.js";
import { CollectionsProbabilityService } from "./collections-probability.service.js";
import type {
  CollectionsAgingBucket,
  CollectionsAgingLookup,
  CollectionsCompletionLookup,
  CollectionsCashflowPoint,
  CollectionsDldTerminationSummary,
  CollectionsDsoMetrics,
  CollectionsExposureDistributionPoint,
  CollectionsForecastDashboard,
  CollectionsInstallment,
  CollectionsInstallmentStatus,
  CollectionsPortfolioDashboard,
  CollectionsPropertyTypeBreakdown,
  CollectionsRiskDistributionPoint,
  CollectionsTopOverdueUnit,
  CollectionsWeeklyTrendPoint,
  SaveCollectionsAgingLookupPayload,
  SaveCollectionsCompletionLookupPayload,
  CollectionsStatusPoint,
  SaveCollectionsInstallmentPayload,
} from "../types/index.js";

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function toMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function clampOutstanding(row: CollectionsInstallment): number {
  return Math.max((row.forecastAmount ?? 0) - (row.collectedAmount ?? 0), 0);
}

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function toUpper(value: string | null | undefined): string {
  return normalizeText(value).toUpperCase();
}

function toLower(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function normalizePercent(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  if (Math.abs(value) <= 1) {
    return round(value * 100);
  }
  return round(value);
}

function normalizeProgress(value: number | null | undefined): number | null {
  const normalized = normalizePercent(value);
  return normalized == null ? null : Math.max(0, Math.min(100, normalized));
}

function deriveExposureBucket(
  isUnitOverDue: string,
  agingLookup: CollectionsAgingLookup | null,
  fallback: string | null | undefined
): string {
  if (isUnitOverDue !== "Yes") {
    return "Not in Aging";
  }

  if (agingLookup) {
    if ((agingLookup.bucket365Plus ?? 0) > 1000) return "365+";
    if ((agingLookup.bucket180To365 ?? 0) > 1000) return "180-365";
    if ((agingLookup.bucket90To179 ?? 0) > 1000) return "90-179";
    if ((agingLookup.bucket60To89 ?? 0) > 1000) return "60-89";
    if ((agingLookup.bucket30To59 ?? 0) > 1000) return "30-59";
    if ((agingLookup.bucket0To29 ?? 0) > 1000) return "0-29";
    return "Not in Aging";
  }

  return normalizeText(fallback) || "Not in Aging";
}

function deriveInstallmentStatus(
  explicit: CollectionsInstallmentStatus | undefined,
  forecastAmount: number,
  collectedAmount: number,
  sourceStatus: string
): CollectionsInstallmentStatus {
  if (explicit) {
    return explicit;
  }
  if (forecastAmount > 0 && collectedAmount >= forecastAmount) {
    return "collected";
  }
  if (sourceStatus.toLowerCase().includes("collections")) {
    return "overdue";
  }
  if (collectedAmount > 0) {
    return "partially_collected";
  }
  return "forecast";
}

export class CollectionsForecastService {
  constructor(
    private readonly repo: CollectionsForecastRepository,
    private readonly lookupRepo: CollectionsLookupRepository,
    private readonly probabilityService = new CollectionsProbabilityService()
  ) {}

  async getInstallments(projectId: number): Promise<CollectionsInstallment[]> {
    return this.repo.getInstallments(projectId);
  }

  async bulkSaveCompletionLookups(
    payloads: SaveCollectionsCompletionLookupPayload[]
  ): Promise<CollectionsCompletionLookup[]> {
    return this.lookupRepo.bulkSaveCompletionLookups(payloads);
  }

  async bulkSaveAgingLookups(
    payloads: SaveCollectionsAgingLookupPayload[]
  ): Promise<CollectionsAgingLookup[]> {
    return this.lookupRepo.bulkSaveAgingLookups(payloads);
  }

  async bulkSaveInstallments(payloads: SaveCollectionsInstallmentPayload[]): Promise<CollectionsInstallment[]> {
    const completionLookups = await this.lookupRepo.getCompletionLookups(
      payloads.map((payload) => normalizeText(payload.buildingName))
    );
    const agingLookups = await this.lookupRepo.getAgingLookups(
      payloads.map((payload) => normalizeText(payload.locationCode ?? payload.unitRef))
    );

    const normalizedPayloads = payloads.map((payload) =>
      this.applyForecastFormulae(
        payload,
        completionLookups.get(normalizeText(payload.buildingName)) ?? null,
        agingLookups.get(normalizeText(payload.locationCode ?? payload.unitRef)) ?? null
      )
    );

    return this.repo.bulkSaveInstallments(normalizedPayloads);
  }

  async getDashboard(projectId: number, asOf?: string): Promise<CollectionsForecastDashboard> {
    const installments = await this.repo.getInstallments(projectId);
    const asOfDate = asOf ? new Date(`${asOf}T00:00:00Z`) : new Date();
    const asOfUtc = new Date(Date.UTC(asOfDate.getUTCFullYear(), asOfDate.getUTCMonth(), asOfDate.getUTCDate()));

    const summary = {
      totalForecast: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      overdueOutstanding: 0,
      dueNextNinetyDays: 0,
      collectionEfficiencyPct: 0,
    };

    const agingMap = new Map<string, CollectionsAgingBucket>([
      ["Current", { bucket: "Current", amount: 0, count: 0 }],
      ["1-30", { bucket: "1-30", amount: 0, count: 0 }],
      ["31-60", { bucket: "31-60", amount: 0, count: 0 }],
      ["61-90", { bucket: "61-90", amount: 0, count: 0 }],
      ["90+", { bucket: "90+", amount: 0, count: 0 }],
    ]);

    const statusMap = new Map<CollectionsInstallmentStatus, CollectionsStatusPoint>([
      ["forecast", { status: "forecast", count: 0, amount: 0 }],
      ["partially_collected", { status: "partially_collected", count: 0, amount: 0 }],
      ["collected", { status: "collected", count: 0, amount: 0 }],
      ["overdue", { status: "overdue", count: 0, amount: 0 }],
    ]);

    const cashflowMap = new Map<string, CollectionsCashflowPoint>();
    const startMonth = startOfMonth(addMonths(asOfUtc, -2));
    for (let index = 0; index < 10; index += 1) {
      const monthDate = addMonths(startMonth, index);
      cashflowMap.set(toMonthKey(monthDate), {
        month: toMonthLabel(monthDate),
        scheduled: 0,
        weightedForecast: 0,
        actualCollections: 0,
      });
    }

    // New CFO dashboard accumulators
    const riskMap = new Map<"Low" | "Medium" | "High", CollectionsRiskDistributionPoint>([
      ["Low", { risk: "Low", count: 0, amount: 0 }],
      ["Medium", { risk: "Medium", count: 0, amount: 0 }],
      ["High", { risk: "High", count: 0, amount: 0 }],
    ]);

    const exposureMap = new Map<string, CollectionsExposureDistributionPoint>();
    const exposureBucketOrder = ["Not in Aging", "0-29", "30-59", "60-89", "90-179", "180-365", "365+"];
    for (const bucket of exposureBucketOrder) {
      exposureMap.set(bucket, { bucket, count: 0, amount: 0 });
    }

    const overdueUnits: CollectionsTopOverdueUnit[] = [];

    const propertyTypeMap = new Map<string, CollectionsPropertyTypeBreakdown>();

    const dldSummary: CollectionsDldTerminationSummary = {
      eligibleCount: 0, eligibleAmount: 0,
      courtCount: 0, courtAmount: 0,
      notEligibleCount: 0,
    };

    // DSO: track collections in current and previous 30-day windows
    const thirtyDaysAgo = new Date(asOfUtc.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(asOfUtc.getTime() - 60 * 86400000);
    let currentWindowCollected = 0;
    let currentWindowOutstanding = 0;
    let prevWindowCollected = 0;
    let prevWindowOutstanding = 0;

    // Weekly trend: last 12 weeks
    const weeklyMap = new Map<string, CollectionsWeeklyTrendPoint>();
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(asOfUtc.getTime() - w * 7 * 86400000);
      const weekNum = getIsoWeek(weekStart);
      const label = `W${weekNum}`;
      weeklyMap.set(label, { weekLabel: label, collectedAmount: 0, forecastDue: 0, efficiencyPct: 0 });
    }

    for (const row of installments) {
      const dueDate = new Date(`${row.dueDate}T00:00:00Z`);
      const outstanding = clampOutstanding(row);
      const ageDays = Math.floor((asOfUtc.getTime() - dueDate.getTime()) / 86400000);

      summary.totalForecast += row.forecastAmount ?? 0;
      summary.totalCollected += row.collectedAmount ?? 0;
      summary.totalOutstanding += outstanding;

      if (outstanding > 0 && dueDate < asOfUtc) {
        summary.overdueOutstanding += outstanding;
      }

      if (outstanding > 0) {
        const ninetyDaysOut = addMonths(asOfUtc, 3);
        if (dueDate >= asOfUtc && dueDate <= ninetyDaysOut) {
          summary.dueNextNinetyDays += outstanding;
        }
      }

      const agingBucket =
        outstanding <= 0 || ageDays <= 0
          ? "Current"
          : ageDays <= 30
            ? "1-30"
            : ageDays <= 60
              ? "31-60"
              : ageDays <= 90
                ? "61-90"
                : "90+";

      const aging = agingMap.get(agingBucket)!;
      aging.amount += outstanding;
      aging.count += outstanding > 0 ? 1 : 0;

      const normalizedStatus: CollectionsInstallmentStatus =
        outstanding > 0 && dueDate < asOfUtc && row.status === "forecast"
          ? "overdue"
          : row.status;
      const status = statusMap.get(normalizedStatus)!;
      status.count += 1;
      status.amount += outstanding > 0 ? outstanding : row.collectedAmount;

      const dueMonth = cashflowMap.get(toMonthKey(startOfMonth(dueDate)));
      if (dueMonth) {
        dueMonth.scheduled += outstanding;
        dueMonth.weightedForecast += outstanding * ((row.probabilityPct ?? 100) / 100);
      }

      if (row.collectionDate) {
        const collDate = new Date(`${row.collectionDate}T00:00:00Z`);
        const collectionMonth = cashflowMap.get(toMonthKey(startOfMonth(collDate)));
        if (collectionMonth) {
          collectionMonth.actualCollections += row.collectedAmount ?? 0;
        }

        // DSO windows
        if (collDate >= thirtyDaysAgo && collDate <= asOfUtc) {
          currentWindowCollected += row.collectedAmount ?? 0;
        }
        if (collDate >= sixtyDaysAgo && collDate < thirtyDaysAgo) {
          prevWindowCollected += row.collectedAmount ?? 0;
        }

        // Weekly trend
        const weeksAgo = Math.floor((asOfUtc.getTime() - collDate.getTime()) / (7 * 86400000));
        if (weeksAgo >= 0 && weeksAgo < 12) {
          const weekStart = new Date(asOfUtc.getTime() - weeksAgo * 7 * 86400000);
          const weekNum = getIsoWeek(weekStart);
          const label = `W${weekNum}`;
          const weekEntry = weeklyMap.get(label);
          if (weekEntry) {
            weekEntry.collectedAmount += row.collectedAmount ?? 0;
          }
        }
      }

      // DSO outstanding windows
      if (dueDate >= thirtyDaysAgo && dueDate <= asOfUtc) {
        currentWindowOutstanding += outstanding;
      }
      if (dueDate >= sixtyDaysAgo && dueDate < thirtyDaysAgo) {
        prevWindowOutstanding += outstanding;
      }

      // Weekly trend: forecast due
      const dueDaysAgo = Math.floor((asOfUtc.getTime() - dueDate.getTime()) / (7 * 86400000));
      if (dueDaysAgo >= 0 && dueDaysAgo < 12) {
        const weekStart = new Date(asOfUtc.getTime() - dueDaysAgo * 7 * 86400000);
        const weekNum = getIsoWeek(weekStart);
        const label = `W${weekNum}`;
        const weekEntry = weeklyMap.get(label);
        if (weekEntry) {
          weekEntry.forecastDue += row.forecastAmount ?? 0;
        }
      }

      // Risk distribution
      const risk = (row.riskCategory ?? "Low") as "Low" | "Medium" | "High";
      const riskKey = riskMap.has(risk) ? risk : "Low";
      const riskEntry = riskMap.get(riskKey)!;
      riskEntry.count += 1;
      riskEntry.amount += outstanding;

      // Exposure distribution
      const expBucket = normalizeText(row.exposureBucket) || "Not in Aging";
      const expEntry = exposureMap.get(expBucket) ?? exposureMap.get("Not in Aging")!;
      expEntry.count += 1;
      expEntry.amount += outstanding;

      // Top overdue units
      if (outstanding > 0 && (normalizedStatus === "overdue" || dueDate < asOfUtc)) {
        overdueUnits.push({
          customerName: row.customerName,
          unitRef: row.unitRef,
          buildingName: row.buildingName,
          outstandingAmount: outstanding,
          overDuePct: row.overDuePct,
          riskCategory: row.riskCategory,
          dueDate: row.dueDate,
          installmentsOverDue: row.installmentsOverDue,
        });
      }

      // Property type breakdown
      const propType = normalizeText(row.propertyType) || "Unknown";
      let propEntry = propertyTypeMap.get(propType);
      if (!propEntry) {
        propEntry = { type: propType, forecast: 0, collected: 0, outstanding: 0, count: 0 };
        propertyTypeMap.set(propType, propEntry);
      }
      propEntry.forecast += row.forecastAmount ?? 0;
      propEntry.collected += row.collectedAmount ?? 0;
      propEntry.outstanding += outstanding;
      propEntry.count += 1;

      // DLD termination summary
      const dldStatus = normalizeText(row.eligibleForDldTermination).toUpperCase();
      if (dldStatus === "YES") {
        dldSummary.eligibleCount += 1;
        dldSummary.eligibleAmount += outstanding;
      } else if (dldStatus === "COURT") {
        dldSummary.courtCount += 1;
        dldSummary.courtAmount += outstanding;
      } else {
        dldSummary.notEligibleCount += 1;
      }
    }

    summary.collectionEfficiencyPct =
      summary.totalForecast > 0 ? (summary.totalCollected / summary.totalForecast) * 100 : 0;

    // DSO = (outstanding / collected) * 30 days
    const currentDso = currentWindowCollected > 0
      ? round((currentWindowOutstanding / currentWindowCollected) * 30) : 0;
    const previous30Dso = prevWindowCollected > 0
      ? round((prevWindowOutstanding / prevWindowCollected) * 30) : 0;
    const dsoMetrics: CollectionsDsoMetrics = {
      currentDso,
      previous30Dso,
      trend: currentDso < previous30Dso - 1 ? "improving" : currentDso > previous30Dso + 1 ? "worsening" : "stable",
    };

    // Weekly trend efficiency
    for (const entry of weeklyMap.values()) {
      entry.efficiencyPct = entry.forecastDue > 0 ? round((entry.collectedAmount / entry.forecastDue) * 100) : 0;
    }

    // Top overdue: sort by outstanding desc, take top 10
    overdueUnits.sort((a, b) => b.outstandingAmount - a.outstandingAmount);
    const topOverdueUnits = overdueUnits.slice(0, 10);

    return {
      summary,
      aging: Array.from(agingMap.values()),
      cashflow: Array.from(cashflowMap.values()),
      statusBreakdown: Array.from(statusMap.values()),
      riskDistribution: Array.from(riskMap.values()),
      exposureDistribution: Array.from(exposureMap.values()),
      topOverdueUnits,
      dsoMetrics,
      collectionsByPropertyType: Array.from(propertyTypeMap.values())
        .sort((a, b) => b.outstanding - a.outstanding),
      dldTerminationSummary: dldSummary,
      weeklyTrend: Array.from(weeklyMap.values()),
    };
  }

  async getPortfolioDashboard(asOf?: string): Promise<CollectionsPortfolioDashboard> {
    const allRows = await this.repo.getAllInstallments();
    const byProject = new Map<number, typeof allRows>();
    for (const row of allRows) {
      const existing = byProject.get(row.projectId) ?? [];
      existing.push(row);
      byProject.set(row.projectId, existing);
    }

    const projects = Array.from(byProject.entries()).map(([projectId, rows]) => {
      const projectName = rows[0].projectName;
      const totalForecast = rows.reduce((sum, row) => sum + row.forecastAmount, 0);
      const totalCollected = rows.reduce((sum, row) => sum + row.collectedAmount, 0);
      const totalOutstanding = rows.reduce((sum, row) => sum + clampOutstanding(row), 0);
      const weightedOutstanding = rows.reduce(
        (sum, row) => sum + clampOutstanding(row) * ((row.probabilityPct ?? 100) / 100),
        0
      );
      const overdueOutstanding = rows
        .filter((row) => row.status === "overdue")
        .reduce((sum, row) => sum + clampOutstanding(row), 0);
      const averageProbabilityPct =
        rows.length > 0 ? rows.reduce((sum, row) => sum + (row.probabilityPct ?? 0), 0) / rows.length : 0;
      const efficiencyPct = totalForecast > 0 ? round((totalCollected / totalForecast) * 100) : 0;

      // Dominant risk: the risk category with the highest outstanding amount
      const riskTotals = new Map<string, number>();
      for (const row of rows) {
        const risk = normalizeText(row.riskCategory) || "Low";
        riskTotals.set(risk, (riskTotals.get(risk) ?? 0) + clampOutstanding(row));
      }
      let dominantRisk: "Low" | "Medium" | "High" = "Low";
      let maxRiskAmount = 0;
      for (const [risk, amount] of riskTotals) {
        if (amount > maxRiskAmount && (risk === "Low" || risk === "Medium" || risk === "High")) {
          dominantRisk = risk as "Low" | "Medium" | "High";
          maxRiskAmount = amount;
        }
      }

      return {
        projectId,
        projectName,
        totalForecast,
        totalCollected,
        totalOutstanding,
        weightedOutstanding,
        overdueOutstanding,
        averageProbabilityPct,
        dominantRisk,
        efficiencyPct,
        unitCount: rows.length,
      };
    });

    const summary = {
      totalForecast: projects.reduce((sum, row) => sum + row.totalForecast, 0),
      totalCollected: projects.reduce((sum, row) => sum + row.totalCollected, 0),
      totalOutstanding: projects.reduce((sum, row) => sum + row.totalOutstanding, 0),
      overdueOutstanding: projects.reduce((sum, row) => sum + row.overdueOutstanding, 0),
      dueNextNinetyDays: 0,
      collectionEfficiencyPct: 0,
      projects: projects.length,
      weightedOutstanding: projects.reduce((sum, row) => sum + row.weightedOutstanding, 0),
      averageProbabilityPct:
        projects.length > 0 ? projects.reduce((sum, row) => sum + row.averageProbabilityPct, 0) / projects.length : 0,
    };

    summary.collectionEfficiencyPct =
      summary.totalForecast > 0 ? (summary.totalCollected / summary.totalForecast) * 100 : 0;

    return {
      summary,
      projects,
    };
  }

  private applyForecastFormulae(
    payload: SaveCollectionsInstallmentPayload,
    completionLookup: CollectionsCompletionLookup | null,
    agingLookup: CollectionsAgingLookup | null
  ): SaveCollectionsInstallmentPayload {
    const forecastAmount = Number(payload.forecastAmount ?? 0);
    const collectedAmount = Number(payload.collectedAmount ?? 0);
    const waivedAmount = Number(payload.waivedAmount ?? 0);
    const totalCleared = Number(payload.totalCleared ?? collectedAmount);
    const totalOverDue = Number(payload.totalOverDue ?? 0);
    const tsvAmount = Number(
      payload.tsvAmount ?? (forecastAmount > 0 || collectedAmount > 0 || waivedAmount > 0
        ? forecastAmount + collectedAmount + waivedAmount
        : 0)
    );
    const installmentsOverDue = Number(payload.installmentsOverDue ?? 0);

    const projectCompletionDate =
      completionLookup?.projectDldCompletionDate ??
      payload.projectCompletionDate ??
      null;
    const latestConstructionProgress = normalizeProgress(
      completionLookup?.latestConstructionProgress ?? payload.latestConstructionProgress ?? null
    );

    const overDuePct = tsvAmount > 0 ? round((totalOverDue / tsvAmount) * 100) : normalizePercent(payload.overDuePct) ?? 0;
    const isUnitOverDue = totalOverDue > 1000 ? "Yes" : "No";
    const clearedPct = tsvAmount > 0 ? round(((totalCleared + waivedAmount) / tsvAmount) * 100) : null;
    const paidPct = tsvAmount > 0 ? round(((collectedAmount + waivedAmount) / tsvAmount) * 100) : null;
    const sourceStatus =
      clearedPct != null && clearedPct > 99.5
        ? "100% Cleared"
        : paidPct != null && paidPct > 99.5
          ? "100% Paid with PDCs"
          : isUnitOverDue === "No"
            ? "Paying as per due dates"
            : "Collections Follow Up";

    const installmentsOverDueBucket =
      installmentsOverDue <= 0 ? "0" : installmentsOverDue < 4 ? "1 - 3" : installmentsOverDue < 7 ? "4 - 6" : ">6";
    const overDuePctBucket =
      isUnitOverDue === "No"
        ? "0%"
        : overDuePct < 5.5
          ? "1% - 5%"
          : overDuePct < 12.5
            ? "6% - 12%"
            : "Greater than 13%";
    const exposureBucket = deriveExposureBucket(isUnitOverDue, agingLookup, payload.exposureBucket);

    const propertyType = normalizeText(payload.propertyType);
    const spaSignStatus = normalizeText(payload.spaSignStatus);
    const spaSignedDate = parseDate(payload.spaSignedDate ?? null);
    const completionDate = parseDate(projectCompletionDate);
    const registeredSaleType =
      toUpper(spaSignStatus) === "N"
        ? "Unsigned SPA"
        : toUpper(propertyType) === "OFF PLAN"
          ? "DLD"
          : completionDate && spaSignedDate && completionDate > spaSignedDate
            ? "DLD"
            : "COURT";

    const riskCategory =
      installmentsOverDue === 0 || registeredSaleType === "Unsigned SPA"
        ? "Low"
        : exposureBucket === "0-29" || exposureBucket === "30-59"
          ? "Low"
          : overDuePct < 5.5
            ? "Low"
            : overDuePct < 12.5
              ? "Medium"
              : "High";

    const canClaimTotal =
      latestConstructionProgress == null ? null : latestConstructionProgress >= 100 ? 100 : round(latestConstructionProgress + 10);
    const canClaimAdditional =
      canClaimTotal == null || clearedPct == null
        ? null
        : canClaimTotal - clearedPct < 1
          ? 0
          : round(canClaimTotal - clearedPct);
    const eligibleForDldTermination =
      registeredSaleType === "COURT"
        ? "COURT"
        : canClaimAdditional != null && overDuePct > 12.99 && overDuePct <= canClaimAdditional
          ? "YES"
          : "NO";
    const unitForecast =
      toLower(payload.expectedForfeiture) === "yes"
        ? "Expected Forfeiture"
        : sourceStatus.toLowerCase().includes("collections")
          ? "Worst case scenario"
          : "As per due dates";
    const probabilityPct = this.probabilityService.calculate({
      ...payload,
      overDuePct,
      riskCategory,
      exposureBucket,
      unitForecast,
      sourceStatus,
    });

    return {
      ...payload,
      buildingName: normalizeText(payload.buildingName) || undefined,
      locationCode: normalizeText(payload.locationCode ?? payload.unitRef) || undefined,
      forecastAmount,
      collectedAmount,
      status: deriveInstallmentStatus(payload.status, forecastAmount, collectedAmount, sourceStatus),
      probabilityPct,
      riskCategory,
      exposureBucket,
      unitForecast,
      overDuePct,
      installmentsOverDue,
      sourceStatus,
      propertyType: propertyType || undefined,
      spaSignedDate: toIsoDate(spaSignedDate),
      spaSignStatus: spaSignStatus || undefined,
      tsvAmount: tsvAmount || null,
      totalCleared: round(totalCleared),
      waivedAmount: round(waivedAmount),
      totalOverDue: round(totalOverDue),
      clearedPct,
      paidPct,
      isUnitOverDue,
      installmentsOverDueBucket,
      overDuePctBucket,
      registeredSaleType,
      latestConstructionProgress,
      canClaimTotal,
      canClaimAdditional,
      eligibleForDldTermination,
      projectCompletionDate,
    };
  }
}
