import { useEffect, useState } from "react";
import { fetchModels, fetchRecommendations } from "../api";

export default function Report() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    fetchModels().then((m) => {
      setModels(m);
      if (m.length > 0) setSelectedModel(m[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedModel) {
      fetchRecommendations(selectedModel).then(setRecommendations);
    }
  }, [selectedModel]);

  return (
    <div>
      <h2 style={{ marginBottom: "1rem" }}>Recommendations</h2>

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

      {recommendations.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          No recommendations yet. Run the benchmark and analyzer first.
        </p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {recommendations.map((rec, i) => (
            <li
              key={i}
              style={{
                padding: "0.75rem 1rem",
                background: "var(--bg-secondary)",
                borderRadius: 6,
                fontSize: "0.95rem",
              }}
            >
              {rec}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
