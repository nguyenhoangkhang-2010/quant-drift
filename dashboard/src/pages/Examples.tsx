import { useEffect, useState } from "react";
import { fetchConfigs, fetchExamples, DriftExample } from "../api";
import { useModel } from "../App";

const DRIFT_TYPES = ["all", "no_drift", "benign", "dangerous"] as const;

const DRIFT_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  no_drift: { color: "var(--safe)", bg: "var(--safe-bg)", label: "NO DRIFT" },
  benign: { color: "var(--caution)", bg: "var(--caution-bg)", label: "BENIGN" },
  dangerous: { color: "var(--danger)", bg: "var(--danger-bg)", label: "DANGEROUS" },
};

export default function Examples() {
  const { selected } = useModel();
  const [configs, setConfigs] = useState<string[]>([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [examples, setExamples] = useState<DriftExample[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) {
      fetchConfigs(selected).then((c) => {
        const nonBaseline = c.filter((x) => x !== "fp16");
        setConfigs(nonBaseline);
        if (nonBaseline.length > 0) setSelectedConfig(nonBaseline[0]);
      }).catch(() => {});
    }
  }, [selected]);

  useEffect(() => {
    if (selected && selectedConfig) {
      setLoading(true);
      fetchExamples(selected, selectedConfig)
        .then(setExamples)
        .catch(() => setExamples([]))
        .finally(() => setLoading(false));
    }
  }, [selected, selectedConfig]);

  const filtered = filter === "all"
    ? examples
    : examples.filter((e) => e.drift_type === filter);

  const counts = {
    all: examples.length,
    no_drift: examples.filter((e) => e.drift_type === "no_drift").length,
    benign: examples.filter((e) => e.drift_type === "benign").length,
    dangerous: examples.filter((e) => e.drift_type === "dangerous").length,
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        Drift Examples
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Side-by-side comparison of baseline vs quantized outputs
      </p>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <select value={selectedConfig} onChange={(e) => setSelectedConfig(e.target.value)}>
          {configs.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: "0.25rem" }}>
          {DRIFT_TYPES.map((dt) => (
            <button
              key={dt}
              onClick={() => setFilter(dt)}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: filter === dt ? "var(--bg-tertiary)" : "transparent",
                color: dt === "all" ? "var(--text-primary)" : DRIFT_STYLE[dt]?.color ?? "var(--text-primary)",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: filter === dt ? 600 : 400,
              }}
            >
              {dt === "all" ? "All" : dt.replace("_", " ")} ({counts[dt]})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Analyzing drift patterns...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No examples found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((ex) => {
            const style = DRIFT_STYLE[ex.drift_type] ?? DRIFT_STYLE.benign;
            return (
              <div
                key={ex.prompt_id}
                className="card"
                style={{ borderLeft: `3px solid ${style.color}` }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{ex.prompt_id}</span>
                    <span className={`badge badge-${ex.drift_type === "no_drift" ? "safe" : ex.drift_type === "benign" ? "caution" : "danger"}`}>
                      {style.label}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{ex.category}</span>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    severity: {(ex.severity * 100).toFixed(0)}%
                  </span>
                </div>

                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  {ex.prompt_text}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 6, padding: "0.75rem" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Baseline (FP16)
                    </span>
                    <pre style={{ marginTop: "0.375rem", whiteSpace: "pre-wrap", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {ex.baseline_output}
                    </pre>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: 6, padding: "0.75rem" }}>
                    <span style={{ fontSize: "0.7rem", color: style.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Quantized ({selectedConfig})
                    </span>
                    <pre style={{ marginTop: "0.375rem", whiteSpace: "pre-wrap", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {ex.quantized_output}
                    </pre>
                  </div>
                </div>

                <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", fontStyle: "italic", color: "var(--text-muted)" }}>
                  {ex.explanation}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
