import { formatM } from "../utils/formatters";
import type { CostMetrics } from "../types";

interface CostBreakdownProps {
  costs: CostMetrics;
}

export default function CostBreakdown({ costs }: CostBreakdownProps) {
  const items = [
    { name: "Land Cost", value: costs.land },
    { name: "Hard Cost", value: costs.construction },
    { name: "Sales Expenses", value: costs.salesExpense },
    { name: "Dev. Mgmt Fee", value: costs.devMgmt },
    { name: "Statutory Cost", value: costs.statutory },
    { name: "Contingency", value: costs.contingency },
    { name: "Soft Costs", value: costs.soft },
    { name: "Marketing", value: costs.marketing },
    { name: "COF incl. Guarantee", value: costs.cof },
  ].filter((i) => i.value > 0);

  const total = costs.total;

  return (
    <div>
      {items.map((item, i) => {
        const pct = total ? (item.value / total) * 100 : 0;
        return (
          <div key={i} className="breakdown-row">
            <div className="bd-name">{item.name}</div>
            <div className="bd-track">
              <div className="bd-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="bd-val">{formatM(item.value)}</div>
            <div className="bd-pct">{formatM(pct)}%</div>
          </div>
        );
      })}
    </div>
  );
}
