import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatM } from "../utils/formatters";

interface VarianceDatum {
  label: string;
  team: string;
  budget: number;
  actual: number;
  projected: number;
  kind: "inflow" | "outflow" | "profit";
}

interface VarianceWaterfallChartProps {
  title: string;
  subtitle: string;
  data: VarianceDatum[];
}

interface ChartRow {
  label: string;
  team: string;
  budget: number;
  blended: number;
  variance: number;
  variancePct: number;
  kind: "inflow" | "outflow" | "profit";
  isFavorable: boolean;
  section: "revenue" | "cost" | "profit";
}

// Colors
const COLORS = {
  budget: "#D7CCC8",
  budgetLine: "#8D6E63",
  favorable: "#2E7D32",
  favorableLight: "#E8F5E9",
  unfavorable: "#C62828",
  unfavorableLight: "#FFEBEE",
  profit: "#1565C0",
  profitLight: "#E3F2FD",
  grid: "#E8E1D5",
  text: "#3D2914",
  muted: "#7A6A56",
};

function processData(data: VarianceDatum[]): ChartRow[] {
  return data.map((item) => {
    const blended = item.actual + item.projected;
    const variance = blended - item.budget;
    const variancePct = item.budget !== 0 ? (variance / item.budget) * 100 : 0;
    
    // For costs: negative variance is good (under budget)
    // For revenue/profit: positive variance is good (over budget)
    const isFavorable = 
      item.kind === "outflow" 
        ? variance <= 0  // Cost: under budget is good
        : variance >= 0; // Revenue/Profit: over budget is good

    return {
      label: item.label,
      team: item.team,
      budget: item.budget,
      blended,
      variance,
      variancePct,
      kind: item.kind,
      isFavorable,
      section: item.kind === "inflow" ? "revenue" : item.kind === "profit" ? "profit" : "cost",
    };
  });
}

function CustomTooltip({ 
  active, 
  payload 
}: { 
  active?: boolean; 
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  
  const item = payload[0].payload;
  const isCost = item.kind === "outflow";
  
  return (
    <div className="variance-tooltip">
      <div className="variance-tooltip-header">
        <span className="variance-tooltip-label">{item.label}</span>
        <span className={`variance-tooltip-team team-${item.team.toLowerCase()}`}>
          {item.team}
        </span>
      </div>
      <div className="variance-tooltip-body">
        <div className="tooltip-row">
          <span className="tooltip-label">Budget:</span>
          <span className="tooltip-value">AED {formatM(item.budget)}M</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Blended:</span>
          <span className="tooltip-value">AED {formatM(item.blended)}M</span>
        </div>
        <div className="tooltip-row variance-row">
          <span className="tooltip-label">Variance:</span>
          <span className={`tooltip-value variance-${item.isFavorable ? 'favorable' : 'unfavorable'}`}>
            {item.variance >= 0 ? '+' : ''}{formatM(item.variance)}M
          </span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Variance %:</span>
          <span className={`tooltip-value variance-${item.isFavorable ? 'favorable' : 'unfavorable'}`}>
            {item.variance >= 0 ? '+' : ''}{item.variancePct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className={`variance-indicator ${item.isFavorable ? 'favorable' : 'unfavorable'}`}>
        {item.isFavorable ? '✓ Favorable' : '⚠ Unfavorable'} for {isCost ? 'Cost' : 'Revenue'}
      </div>
    </div>
  );
}

export default function VarianceWaterfallChart({
  title,
  subtitle,
  data
}: VarianceWaterfallChartProps) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const processedData = useMemo(() => processData(data), [data]);
  
  // Separate by section for visual grouping
  const revenueRows = processedData.filter(d => d.section === "revenue");
  const costRows = processedData.filter(d => d.section === "cost");
  const profitRows = processedData.filter(d => d.section === "profit");
  
  // Calculate max absolute value for consistent x-axis
  const maxAbsValue = Math.max(
    ...processedData.map(d => Math.abs(d.variance)),
    1 // Minimum to avoid zero
  );
  
  // Add padding to domain for labels
  const xDomain = [-maxAbsValue * 1.3, maxAbsValue * 1.3];

  // Calculate chart height - fill the container with minimum height
  const chartHeight = Math.max(500, processedData.length * 55);

  // Custom bar shape for variance bars - BIGGER BARS
  const VarianceBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    const isNegative = payload.variance < 0;
    const color = payload.isFavorable ? COLORS.favorable : COLORS.unfavorable;
    const lightColor = payload.isFavorable ? COLORS.favorableLight : COLORS.unfavorableLight;
    
    // Calculate label position - outside bar if too small
    const barWidth = Math.abs(width);
    const labelInside = barWidth > 50;
    
    return (
      <g>
        {/* Background glow effect */}
        <rect
          x={isNegative ? x + width - 2 : x - 2}
          y={y - 2}
          width={barWidth + 4}
          height={height + 4}
          fill={lightColor}
          rx={6}
          opacity={0.4}
        />
        {/* Main variance bar - THICKER */}
        <rect
          x={isNegative ? x + width : x}
          y={y + 3}
          width={barWidth}
          height={height - 6}
          fill={color}
          rx={4}
        />
        {/* Variance label */}
        <text
          x={labelInside 
            ? (isNegative ? x + width + 6 : x - 6)
            : (isNegative ? x + width - 8 : x + 8)
          }
          y={y + height / 2 + 1}
          textAnchor={labelInside 
            ? (isNegative ? "start" : "end")
            : (isNegative ? "end" : "start")
          }
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="700"
          fill={labelInside ? "#FFFFFF" : color}
          style={{ textShadow: labelInside ? '0 1px 2px rgba(0,0,0,0.3)' : 'none' }}
        >
          {payload.variance >= 0 ? '+' : ''}{formatM(payload.variance)}
        </text>
      </g>
    );
  };

  return (
    <section className="variance-waterfall-panel">
      <div className="variance-waterfall-header">
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
        <div className="variance-legend">
          <div className="legend-item">
            <span className="legend-dot favorable"></span>
            <span>Favorable</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot unfavorable"></span>
            <span>Unfavorable</span>
          </div>
          <div className="legend-item">
            <span className="legend-line"></span>
            <span>Budget</span>
          </div>
        </div>
      </div>

      <div className="variance-chart-container" style={{ minHeight: '500px' }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={processedData}
            layout="vertical"
            margin={isMobile ? { top: 20, right: 60, bottom: 20, left: 120 } : { top: 30, right: 80, bottom: 30, left: 180 }}
            barCategoryGap="25%"
          >
            <CartesianGrid 
              strokeDasharray="4 4" 
              stroke={COLORS.grid} 
              horizontal={false}
            />
            
            {/* Zero line (budget reference) - THICKER */}
            <ReferenceLine 
              x={0} 
              stroke={COLORS.budgetLine} 
              strokeWidth={3}
              strokeDasharray="0"
            />
            
            <XAxis
              type="number"
              domain={xDomain}
              tickFormatter={(value) => `${value >= 0 ? '+' : ''}${formatM(value)}M`}
              axisLine={{ stroke: COLORS.muted, strokeWidth: 1 }}
              tickLine={{ stroke: COLORS.muted }}
              stroke={COLORS.muted}
              fontSize={12}
              fontWeight={500}
              tick={{ fill: COLORS.muted }}
              height={40}
            />
            
            <YAxis
              type="category"
              dataKey="label"
              width={isMobile ? 110 : 170}
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: COLORS.text, 
                fontSize: 13, 
                fontWeight: 600 
              }}
            />
            
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: "rgba(61, 41, 20, 0.05)" }}
              wrapperStyle={{ outline: 'none' }}
            />
            
            <Bar
              dataKey="variance"
              name="Variance"
              shape={<VarianceBar />}
              radius={[5, 5, 5, 5]}
              maxBarSize={45}
              minPointSize={5}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isFavorable ? COLORS.favorable : COLORS.unfavorable}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Section Summary Cards */}
      <div className="variance-summary-row">
        <div className="variance-summary-card revenue">
          <span className="summary-icon">💰</span>
          <div>
            <span className="summary-label">Revenue Variance</span>
            <span className={`summary-value ${revenueRows.reduce((s, r) => s + r.variance, 0) >= 0 ? 'favorable' : 'unfavorable'}`}>
              {revenueRows.reduce((s, r) => s + r.variance, 0) >= 0 ? '+' : ''}
              {formatM(revenueRows.reduce((s, r) => s + r.variance, 0))}M
            </span>
          </div>
        </div>
        
        <div className="variance-summary-card cost">
          <span className="summary-icon">📉</span>
          <div>
            <span className="summary-label">Cost Variance</span>
            <span className={`summary-value ${costRows.reduce((s, r) => s + r.variance, 0) <= 0 ? 'favorable' : 'unfavorable'}`}>
              {costRows.reduce((s, r) => s + r.variance, 0) >= 0 ? '+' : ''}
              {formatM(costRows.reduce((s, r) => s + r.variance, 0))}M
            </span>
          </div>
        </div>
        
        <div className="variance-summary-card profit">
          <span className="summary-icon">📈</span>
          <div>
            <span className="summary-label">Profit Impact</span>
            <span className={`summary-value ${profitRows.reduce((s, r) => s + r.variance, 0) >= 0 ? 'favorable' : 'unfavorable'}`}>
              {profitRows.reduce((s, r) => s + r.variance, 0) >= 0 ? '+' : ''}
              {formatM(profitRows.reduce((s, r) => s + r.variance, 0))}M
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
