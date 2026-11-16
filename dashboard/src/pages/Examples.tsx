import { useEffect, useState } from "react";
import { fetchModels, fetchConfigs, fetchExamples, DriftExample } from "../api";

export default function Examples() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [configs, setConfigs] = useState<string[]>([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [examples, setExamples] = useState<DriftExample[]>([]);

  useEffect(() => {
    fetchModels().then((m) => {
      setModels(m);
      if (m.length > 0) setSelectedModel(m[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedModel) {
      fetchConfigs(selectedModel).then((c) => {
        const nonBaseline = c.filter((x) => x !== "fp16");
        setConfigs(nonBaseline);
        if (nonBaseline.length > 0) setSelectedConfig(nonBaseline[0]);
      });
    }
  }, [selectedModel]);

  useEffect(() => {
    if (selectedModel && selectedConfig) {
      fetchExamples(selectedModel, selectedConfig).then(setExamples);
    }
  }, [selectedModel, selectedConfig]);

  const driftColor: Record<string, string> = {
    NO_DRIFT: "var(--safe)",
    BENIGN: "var(--caution)",
    DANGEROUS: "var(--danger)",
  };

  return (
    <div>
      <h2 style={{ marginBottom: "1rem" }}>Drift Examples</h2>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{
            padding: "0.5rem",
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

        <select
          value={selectedConfig}
          onChange={(e) => setSelectedConfig(e.target.value)}
          style={{
            padding: "0.5rem",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--text-secondary)",
            borderRadius: 4,
          }}
        >
          {configs.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {examples.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No examples found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {examples.map((ex) => (
            <div
              key={ex.prompt_id}
              style={{
                padding: "1rem",
                background: "var(--bg-secondary)",
                borderRadius: 8,
                borderLeft: `4px solid ${driftColor[ex.drift_type] ?? "var(--text-secondary)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  [{ex.category}] {ex.prompt_id}
                </span>
                <span
                  style={{
                    color: driftColor[ex.drift_type],
                    fontWeight: 600,
                  }}
                >
                  {ex.drift_type} ({(ex.severity * 100).toFixed(0)}%)
                </span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                {ex.prompt_text}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginTop: "0.75rem",
                }}
              >
                <div>
                  <strong>Baseline (FP16)</strong>
                  <pre
                    style={{
                      marginTop: "0.25rem",
                      whiteSpace: "pre-wrap",
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {ex.baseline_output}
                  </pre>
                </div>
                <div>
                  <strong>Quantized</strong>
                  <pre
                    style={{
                      marginTop: "0.25rem",
                      whiteSpace: "pre-wrap",
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {ex.quantized_output}
                  </pre>
                </div>
              </div>
              <p
                style={{
                  marginTop: "0.5rem",
                  fontStyle: "italic",
                  fontSize: "0.85rem",
                }}
              >
                {ex.explanation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
