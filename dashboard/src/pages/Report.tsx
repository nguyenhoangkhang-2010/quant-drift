import { useEffect, useState } from "react";
import { fetchHeatmap, fetchRecommendations, HeatmapCell } from "../api";
import { useModel } from "../App";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function recBorder(rec: string): string {
  if (rec.includes("UNSAFE")) return "var(--danger)";
  if (rec.includes("CAUTION")) return "var(--caution)";
  if (rec.includes("SAFE")) return "var(--safe)";
  return "var(--border)";
}

export default function Report() {
  const { selected } = useModel();
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) {
      setLoading(true);
      Promise.all([
        fetchRecommendations(selected).catch(() => [] as string[]),
        fetchHeatmap(selected).catch(() => [] as HeatmapCell[]),
      ]).then(([recs, hm]) => {
        setRecommendations(recs);
        setCells(hm);
      }).finally(() => setLoading(false));
    }
  }, [selected]);

  const totalPrompts = cells.reduce((sum, c) => sum + c.total, 0);
  const avgDangerous = cells.length > 0
    ? (cells.reduce((sum, c) => sum + c.dangerous_rate, 0) / cells.length).toFixed(1)
    : "0";
  const safeCells = cells.filter((c) => c.dangerous_rate === 0).length;

  const chartData = cells
    .filter((c) => c.dangerous_rate > 0)
    .sort((a, b) => b.dangerous_rate - a.dangerous_rate)
    .map((c) => ({
      name: `${c.config} / ${c.category}`,
      dangerous: c.dangerous_rate,
    }));

  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        Report
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Summary and recommendations for {selected}
      </p>

      {loading && <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>Analyzing drift patterns...</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Comparisons", value: `${cells.length}`, sub: `${totalPrompts} prompts` },
          { label: "Avg Dangerous Rate", value: `${avgDangerous}%`, sub: "across all combos" },
          { label: "Safe Combinations", value: `${safeCells}/${cells.length}`, sub: "0% dangerous" },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {stat.label}
            </p>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0" }}>
              {stat.value}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Dangerous drift by combination
          </p>
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={12} width={110} />
              <Tooltip
                contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }}
                formatter={(value: number) => [`${value}%`, "Dangerous rate"]}
              />
              <Bar dataKey="dangerous" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.dangerous >= 30 ? "var(--danger)" : entry.dangerous >= 10 ? "#f97316" : "var(--caution)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Recommendations
        </p>
        {recommendations.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>No recommendations yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {recommendations.map((rec, i) => (
              <div
                key={i}
                style={{
                  padding: "0.625rem 0.875rem",
                  borderRadius: 6,
                  background: "var(--bg-primary)",
                  borderLeft: `3px solid ${recBorder(rec)}`,
                  fontSize: "0.875rem",
                }}
              >
                {rec}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
