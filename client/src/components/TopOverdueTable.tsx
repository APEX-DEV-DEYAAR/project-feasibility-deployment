import type { CollectionsTopOverdueUnit } from "../types";
import { formatNumber } from "../utils/formatters";

const RISK_COLORS: Record<string, { bg: string; color: string }> = {
  Low: { bg: "#E8F5E9", color: "#2E7D32" },
  Medium: { bg: "#FFF3E0", color: "#E65100" },
  High: { bg: "#FDECEA", color: "#B71C1C" },
};

export default function TopOverdueTable({ data }: { data: CollectionsTopOverdueUnit[] }) {
  return (
    <div className="collections-chart-card">
      <div className="collections-chart-header">
        <h3>Top Overdue Exposure</h3>
        <span>Highest outstanding units requiring attention</span>
      </div>
      {data.length === 0 ? (
        <div className="chart-empty-state" style={{ padding: "24px 0" }}>No overdue units</div>
      ) : (
        <div className="cfo-overdue-table-wrapper">
          <table className="cfo-overdue-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Unit</th>
                <th>Building</th>
                <th className="text-right">Outstanding (AED)</th>
                <th className="text-right">Overdue %</th>
                <th className="text-right">Inst. Overdue</th>
                <th>Risk</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => {
                const riskStyle = RISK_COLORS[row.riskCategory ?? "Low"] ?? RISK_COLORS.Low;
                return (
                  <tr key={`${row.unitRef}-${index}`}>
                    <td className="cfo-cell-customer">{row.customerName || "-"}</td>
                    <td className="cfo-cell-unit">{row.unitRef}</td>
                    <td>{row.buildingName || "-"}</td>
                    <td className="text-right cfo-cell-amount">{formatNumber(row.outstandingAmount)}</td>
                    <td className="text-right">{row.overDuePct != null ? `${row.overDuePct.toFixed(1)}%` : "-"}</td>
                    <td className="text-right">{row.installmentsOverDue ?? "-"}</td>
                    <td>
                      <span
                        className="cfo-risk-badge"
                        style={{ background: riskStyle.bg, color: riskStyle.color }}
                      >
                        {row.riskCategory ?? "Low"}
                      </span>
                    </td>
                    <td>{row.dueDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
