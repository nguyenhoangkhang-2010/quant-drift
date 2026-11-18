import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { fetchModels } from "./api";
import Heatmap from "./pages/Heatmap";
import Examples from "./pages/Examples";
import Report from "./pages/Report";

interface ModelCtx {
  models: string[];
  selected: string;
  setSelected: (m: string) => void;
}

export const ModelContext = createContext<ModelCtx>({
  models: [],
  selected: "",
  setSelected: () => {},
});

export function useModel() {
  return useContext(ModelContext);
}

function App() {
  const [models, setModels] = useState<string[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetchModels().then((m) => {
      setModels(m);
      if (m.length > 0) setSelected(m[0]);
    });
  }, []);

  return (
    <ModelContext.Provider value={{ models, selected, setSelected }}>
      <BrowserRouter>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <nav
            style={{
              width: 240,
              padding: "1.5rem 1rem",
              background: "var(--bg-secondary)",
              borderRight: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h1
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                marginBottom: "0.5rem",
              }}
            >
              QuantDrift
            </h1>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "1.5rem",
              }}
            >
              Quantization drift analyzer
            </p>

            <label
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "0.375rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Model
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{ marginBottom: "1.5rem" }}
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {[
                { to: "/", label: "Heatmap" },
                { to: "/examples", label: "Examples" },
                { to: "/report", label: "Report" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === "/"}
                    style={({ isActive }) => ({
                      display: "block",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius)",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      background: isActive ? "var(--bg-tertiary)" : "transparent",
                      fontWeight: isActive ? 600 : 400,
                      fontSize: "0.875rem",
                    })}
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <main style={{ flex: 1, padding: "2rem", maxWidth: 1200, overflow: "auto" }}>
            <Routes>
              <Route path="/" element={<Heatmap />} />
              <Route path="/examples" element={<Examples />} />
              <Route path="/report" element={<Report />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ModelContext.Provider>
  );
}

export default App;
