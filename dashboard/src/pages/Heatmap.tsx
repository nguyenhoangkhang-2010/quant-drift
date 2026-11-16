import { useEffect, useState } from "react";
import { fetchModels, fetchHeatmap, HeatmapCell } from "../api";

function severityColor(dangerousRate: number): string {
  if (dangerousRate === 0) return "var(--safe)";
  if (dangerousRate < 5) return "var(--caution)";
  return "var(--danger)";
}

export default function Heatmap() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [cells, setCells] = useState<HeatmapCell[]>([]);

  useEffect(() => {
    fetchModels().then((m) => {
      setModels(m);
      if (m.length > 0) setSelectedModel(m[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedModel) {
      fetchHeatmap(selectedModel).then(setCells);
    }
  }, [selectedModel]);

  const configs = [...new Set(cells.map((c) => c.config))];
  const categories = [...new Set(cells.map((c) => c.category))];

  return (
    <div>
      <h2 style={{ marginBottom: "1rem" }}>Drift Heatmap</h2>

      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        style={{
          padding: "0.5rem",
          marginBottom: "1.5rem",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          border: "1px solid var(--text-secondary)",
          borderRadius: 4,
        }}
      >
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      {cells.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          No results yet. Run the benchmark first.
        </p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>Task</th>
              {configs.map((c) => (
                <th key={c} style={{ padding: "0.75rem" }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat}>
                <td style={{ padding: "0.75rem" }}>{cat}</td>
                {configs.map((cfg) => {
                  const cell = cells.find(
                    (c) => c.category === cat && c.config === cfg
                  );
                  return (
                    <td
                      key={cfg}
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        background: cell
                          ? severityColor(cell.dangerous_rate)
                          : "transparent",
                        color: "#000",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      {cell ? `${cell.dangerous_rate}%` : "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
