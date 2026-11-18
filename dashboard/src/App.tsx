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
import { I18nProvider, type Lang, useI18n } from "./i18n";
import Examples from "./pages/Examples";
import Heatmap from "./pages/Heatmap";
import Report from "./pages/Report";

const NAV = [
  { to: "/", key: "nav.heatmap", Icon: IconGrid, end: true },
  { to: "/examples", key: "nav.examples", Icon: IconSplit, end: false },
  { to: "/report", key: "nav.report", Icon: IconDoc, end: false },
] as const;

const READING_GUIDE = [
  { drift: "no_drift", key: "guide.no_drift" },
  { drift: "benign", key: "guide.benign" },
  { drift: "dangerous", key: "guide.dangerous" },
] as const;

const LANGS = [
  { value: "en", label: "EN" },
  { value: "vi", label: "VI" },
] as const;

function Shell() {
  const { models, selected, setSelected, status, error, reload } = useModel();
  const { theme, toggle } = useTheme();
  const { t, lang, setLang } = useI18n();
  const { pathname } = useLocation();
  const toggleLabel = t(theme === "dark" ? "theme.toLight" : "theme.toDark");

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
          {NAV.map(({ to, key, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : undefined)}>
              <Icon size={17} />
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          <div className="legend-card">
            <h2>{t("guide.title")}</h2>
            <ul>
              {READING_GUIDE.map((g) => (
                <li key={g.drift}>
                  <Chip meta={DRIFTS[g.drift]} />
                  <p>{t(g.key)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-model">
            <span className="eyebrow">{t("top.model")}</span>
            {models.length > 0 && (
              <Segmented
                label={t("top.model")}
                value={selected}
                options={models.map((m) => ({ value: m, label: m }))}
                onChange={setSelected}
              />
            )}
          </div>
          <div className="topbar-tools">
            <span className="baseline">baseline · fp16</span>
            <Segmented<Lang>
              label={t("lang.label")}
              value={lang}
              options={LANGS.map((l) => ({ value: l.value, label: l.label }))}
              onChange={setLang}
            />
            <button type="button" className="icon-btn" onClick={toggle} aria-label={toggleLabel} title={toggleLabel}>
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </header>

        <div className="content" key={pathname}>
          {status === "error" ? (
            <ErrorState message={error ?? "Request failed"} onRetry={reload} />
          ) : status === "ready" && models.length === 0 ? (
            <EmptyState title={t("app.emptyTitle")} hint={t("app.emptyHint")} />
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
    <I18nProvider>
      <ThemeContext.Provider value={{ theme, toggle }}>
        <ModelContext.Provider value={{ models, selected, setSelected, status, error, reload }}>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </ModelContext.Provider>
      </ThemeContext.Provider>
    </I18nProvider>
  );
}

export default App;
