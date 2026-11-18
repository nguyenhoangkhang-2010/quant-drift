import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchHeatmap, HeatmapCell } from "../api";
import { useModel } from "../App";

function heatColor(rate: number): string {
  if (rate === 0) return "var(--safe)";
  if (rate < 10) return "var(--caution)";
  if (rate < 30) return "#f97316";
  return "var(--danger)";
}

export default function Heatmap() {
  const { selected } = useModel();
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) {
      setLoading(true);
      fetchHeatmap(selected)
        .then(setCells)
        .catch(() => setCells([]))
        .finally(() => setLoading(false));
    }
  }, [selected]);

  const configs = [...new Set(cells.map((c) => c.config))];
  const categories = [...new Set(cells.map((c) => c.category))];

  const chartData = categories.map((cat) => {
    const row: Record<string, string | number> = { category: cat };
    configs.forEach((cfg) => {
      const cell = cells.find((c) => c.category === cat && c.config === cfg);
      row[`${cfg}_dangerous`] = cell?.dangerous_rate ?? 0;
      row[`${cfg}_benign`] = cell ? cell.drift_rate - cell.dangerous_rate : 0;
    });
    return row;
  });

  const COLORS = { int8: "#3b82f6", int4: "#f97316" };

  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        Drift Heatmap
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Dangerous drift rate by task type and quantization config
      </p>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Analyzing...</p>
      ) : cells.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No results yet. Run the benchmark first.</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                  }}
                  formatter={(value: number, name: string) => [`${value}%`, name.replace("_", " ")]}
                />
                <Legend />
                {configs.map((cfg) => (
                  <Bar
                    key={cfg}
                    dataKey={`${cfg}_dangerous`}
                    name={`${cfg} dangerous`}
                    fill={COLORS[cfg as keyof typeof COLORS] ?? "var(--accent)"}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <table style={{ borderCollapse: "separate", borderSpacing: "4px", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "0.625rem 0.75rem", textAlign: "left", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Task
                  </th>
                  {configs.map((c) => (
                    <th key={c} style={{ padding: "0.625rem 0.75rem", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat}>
                    <td style={{ padding: "0.625rem 0.75rem", fontWeight: 500, fontSize: "0.875rem" }}>
                      {cat}
                    </td>
                    {configs.map((cfg) => {
                      const cell = cells.find((c) => c.category === cat && c.config === cfg);
                      const rate = cell?.dangerous_rate ?? 0;
                      return (
                        <td
                          key={cfg}
                          style={{
                            padding: "0.625rem 0.75rem",
                            textAlign: "center",
                            background: heatColor(rate),
                            color: "#000",
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: "0.875rem",
                          }}
                        >
                          {cell ? `${rate}%` : "-"}
                          {cell && (
                            <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 400, opacity: 0.7 }}>
                              {cell.drift_rate}% total
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
