import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchHeatmap } from "../api";
import {
  ChartTip,
  EmptyState,
  ErrorState,
  IconArrow,
  Loading,
  PageHeader,
  ProgressBar,
  SectionHead,
  VERDICTS,
} from "../components";
import { useModel, useTheme } from "../context";
import { useAsync } from "../hooks";
import { type Key, useI18n } from "../i18n";
import { cssVars, HEAT_MAX, heatBg, heatIsHigh, seriesColor, sortConfigs } from "../lib";

const VERDICT_RULES = { safe: "heat.ruleSafe", caution: "heat.ruleCaution", unsafe: "heat.ruleUnsafe" } as const satisfies Record<
  string,
  Key
>;

export default function Heatmap() {
  const { selected } = useModel();
  const { theme } = useTheme();
  const { t, cat, fmt } = useI18n();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => fetchHeatmap(selected), [selected], selected !== "");

  const view = useMemo(() => {
    const cells = data ?? [];
    const configs = sortConfigs([...new Set(cells.map((c) => c.config))]);
    const categories = [...new Set(cells.map((c) => c.category))].sort();
    const at = new Map(cells.map((c) => [`${c.category}|${c.config}`, c] as const));
    return { configs, categories, at };
  }, [data]);

  const chart = view.categories.map((c) => {
    const row: Record<string, string | number> = { category: cat(c) };
    view.configs.forEach((cfg) => {
      row[cfg] = view.at.get(`${c}|${cfg}`)?.dangerous_rate ?? 0;
    });
    return row;
  });

  const open = (config: string, category: string, rate: number) => {
    const q = new URLSearchParams({ config, category });
    if (rate > 0) q.set("type", "dangerous");
    navigate(`/examples?${q.toString()}`);
  };

  return (
    <>
      <ProgressBar active={loading} />
      <PageHeader eyebrow={t("heat.eyebrow")} title={t("heat.title")} lede={t("heat.lede")} />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading label={t("heat.loading")} />
      ) : data.length === 0 ? (
        <EmptyState title={t("heat.emptyTitle")} hint={t("heat.emptyHint")} />
      ) : (
        <div className={`stack${loading ? " is-refetching" : ""}`}>
          <section className="card reveal">
            <SectionHead title={t("heat.secTitle")} sub={t("heat.secSub")} />
            <div className="scroll-x">
              <table className="heat">
                <thead>
                  <tr>
                    <th scope="col">{t("common.task")}</th>
                    {view.configs.map((cfg) => (
                      <th key={cfg} scope="col">
                        {cfg}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.categories.map((c, r) => (
                    <tr key={c}>
                      <th scope="row">
                        {cat(c)}
                        <span className="row-n">n={view.at.get(`${c}|${view.configs[0]}`)?.total ?? 0}</span>
                      </th>
                      {view.configs.map((cfg, col) => {
                        const cell = view.at.get(`${c}|${cfg}`);
                        if (!cell) return <td key={cfg} />;
                        const rate = cell.dangerous_rate;
                        const { Icon, labelKey } = VERDICTS[cell.verdict];
                        return (
                          <td key={cfg}>
                            <button
                              type="button"
                              className="cell"
                              data-hi={heatIsHigh(rate, theme)}
                              style={{ ...cssVars({ "--i": r + col }), background: heatBg(rate) }}
                              onClick={() => open(cfg, c, rate)}
                              aria-label={t("heat.cellAria", {
                                task: cat(c),
                                cfg: cfg.toUpperCase(),
                                rate: fmt(rate),
                                drift: fmt(cell.drift_rate),
                                verdict: t(labelKey),
                              })}
                            >
                              <span className="cell-icon">
                                <Icon size={15} />
                              </span>
                              <span className="cell-val">
                                {fmt(rate)}
                                <small>%</small>
                              </span>
                              <span className="cell-sub">{t("heat.anyDrift", { n: fmt(cell.drift_rate) })}</span>
                              <span className="cell-go">
                                <IconArrow size={15} />
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="scale">
              <div className="scale-bar">
                <span>0%</span>
                <i />
                <span>{HEAT_MAX}%+</span>
              </div>
              <div className="scale-key">
                {(["safe", "caution", "unsafe"] as const).map((v) => {
                  const { Icon, labelKey } = VERDICTS[v];
                  return (
                    <span key={v}>
                      <Icon size={13} />
                      {t(labelKey)}, {t(VERDICT_RULES[v])}
                    </span>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="card reveal" style={cssVars({ "--i": 1 })}>
            <SectionHead title={t("heat.chartTitle")} sub={t("heat.chartSub")}>
              <div className="key">
                {view.configs.map((cfg) => (
                  <span key={cfg}>
                    <i style={{ background: seriesColor(cfg, view.configs) }} />
                    {cfg.toUpperCase()}
                  </span>
                ))}
              </div>
            </SectionHead>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={chart} barGap={3} barCategoryGap="30%" margin={{ top: 8, right: 4, bottom: 0, left: -6 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={{ stroke: "var(--axis)" }}
                  tick={{ fill: "var(--ink-2)", fontSize: 12.5 }}
                />
                <YAxis
                  width={44}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: "var(--ink-3)", fontSize: 12 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<ChartTip />} cursor={{ fill: "var(--wash)" }} />
                {view.configs.map((cfg) => (
                  <Bar
                    key={cfg}
                    dataKey={cfg}
                    name={cfg.toUpperCase()}
                    fill={seriesColor(cfg, view.configs)}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={24}
                    animationDuration={800}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>
      )}
    </>
  );
}
