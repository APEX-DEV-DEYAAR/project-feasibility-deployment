import { CollectionsRepository } from "./revenue.repository.js";
import type {
  ProjectMonthlyCollections,
  MonthlyCollectionsRow,
  SaveMonthlyCollectionsPayload,
} from "../../shared/types/index.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export class CollectionsService {
  constructor(private readonly repo: CollectionsRepository) {}

  async getMonthlyCollections(projectId: number, year?: number): Promise<MonthlyCollectionsRow[]> {
    const data = await this.repo.getMonthlyCollections(projectId, year);

    const monthMap = new Map<string, MonthlyCollectionsRow>();

    for (const row of data) {
      const key = `${row.year}-${row.month}`;
      monthMap.set(key, {
        year: row.year,
        month: row.month,
        monthName: MONTH_NAMES[row.month - 1],
        budgetAmount: row.budgetAmount,
        actualAmount: row.actualAmount,
        projectedAmount: row.projectedAmount,
        notes: row.notes,
      });
    }

    // Fill empty months
    const yearsToFill =
      typeof year === "number"
        ? [year]
        : data.length > 0
          ? Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b)
          : [new Date().getFullYear()];

    for (const fillYear of yearsToFill) {
      for (let month = 1; month <= 12; month++) {
        const key = `${fillYear}-${month}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            year: fillYear,
            month,
            monthName: MONTH_NAMES[month - 1],
            budgetAmount: null,
            actualAmount: null,
            projectedAmount: null,
            notes: null,
          });
        }
      }
    }

    return Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  async saveMonthlyCollections(payload: SaveMonthlyCollectionsPayload): Promise<ProjectMonthlyCollections> {
    return this.repo.saveMonthlyCollections(payload);
  }

  async bulkSaveMonthlyCollections(payloads: SaveMonthlyCollectionsPayload[]): Promise<ProjectMonthlyCollections[]> {
    return this.repo.bulkSaveMonthlyCollections(payloads);
  }

  async deleteMonthlyCollections(projectId: number, year: number, month: number): Promise<boolean> {
    return this.repo.deleteMonthlyCollections(projectId, year, month);
  }

  async clearProjectCollections(projectId: number): Promise<number> {
    return this.repo.clearProjectCollections(projectId);
  }
}
