import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { fetchModels } from "./api";
import {
  BrandMark,
  Chip,
  DRIFTS,
  EmptyState,
  ErrorState,
  IconDoc,
  IconGrid,
  IconMoon,
  IconSplit,
  IconSun,
  Segmented,
} from "./components";
import { ModelContext, ThemeContext, useModel, useTheme } from "./context";
import { useThemeState } from "./hooks";
import Examples from "./pages/Examples";
import Heatmap from "./pages/Heatmap";
import Report from "./pages/Report";

const NAV = [
  { to: "/", label: "Heatmap", Icon: IconGrid, end: true },
  { to: "/examples", label: "Examples", Icon: IconSplit, end: false },
  { to: "/report", label: "Report", Icon: IconDoc, end: false },
];

const READING_GUIDE = [
  { key: "no_drift", text: "Identical to the FP16 baseline." },
  { key: "benign", text: "Reworded, but meaning and answer are intact." },
  { key: "dangerous", text: "Wrong answer, broken code or lost meaning." },
];

function Shell() {
  const { models, selected, setSelected, status, error, reload } = useModel();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <BrandMark />
          <div>
            <div className="brand-name">QuantDrift</div>
            <div className="brand-sub">drift lab · v0.1</div>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : undefined)}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          <div className="legend-card">
            <h2>How to read</h2>
            <ul>
              {READING_GUIDE.map((g) => (
                <li key={g.key}>
                  <Chip meta={DRIFTS[g.key]} />
                  <p>{g.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={toggle}
            aria-label={`Switch to ${next} theme`}
            title={`Switch to ${next} theme`}
          >
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-model">
            <span className="eyebrow">Model</span>
            {models.length > 0 && (
              <Segmented
                label="Model"
                value={selected}
                options={models.map((m) => ({ value: m, label: m }))}
                onChange={setSelected}
              />
            )}
          </div>
          <span className="baseline">baseline · fp16</span>
        </header>

        <div className="content" key={pathname}>
          {status === "error" ? (
            <ErrorState message={error ?? "Request failed"} onRetry={reload} />
          ) : status === "ready" && models.length === 0 ? (
            <EmptyState
              title="No results yet"
              hint="Run the benchmark, or generate the demo data with scripts/generate_sample_results.py."
            />
          ) : (
            <Routes>
              <Route path="/" element={<Heatmap />} />
              <Route path="/examples" element={<Examples />} />
              <Route path="/report" element={<Report />} />
            </Routes>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [models, setModels] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>();
  const [tick, setTick] = useState(0);
  const [theme, toggle] = useThemeState();

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setError(undefined);
    fetchModels()
      .then((m) => {
        if (!alive) return;
        setModels(m);
        setSelected((s) => (m.includes(s) ? s : m[0] ?? ""));
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Request failed");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <ModelContext.Provider value={{ models, selected, setSelected, status, error, reload }}>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </ModelContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
