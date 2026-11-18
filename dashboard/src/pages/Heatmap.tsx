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
import { cap, cssVars, HEAT_MAX, heatBg, heatIsHigh, seriesColor, sortConfigs } from "../lib";

const VERDICT_RULES = { safe: "0% dangerous", caution: "under 5%", unsafe: "5% or more" } as const;

export default function Heatmap() {
  const { selected } = useModel();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => fetchHeatmap(selected), [selected], selected !== "");

  const view = useMemo(() => {
    const cells = data ?? [];
    const configs = sortConfigs([...new Set(cells.map((c) => c.config))]);
    const categories = [...new Set(cells.map((c) => c.category))].sort();
    const at = new Map(cells.map((c) => [`${c.category}|${c.config}`, c] as const));
    const chart = categories.map((cat) => {
      const row: Record<string, string | number> = { category: cap(cat) };
      configs.forEach((cfg) => {
        row[cfg] = at.get(`${cat}|${cfg}`)?.dangerous_rate ?? 0;
      });
      return row;
    });
    return { configs, categories, at, chart };
  }, [data]);

  const open = (config: string, category: string, rate: number) => {
    const q = new URLSearchParams({ config, category });
    if (rate > 0) q.set("type", "dangerous");
    navigate(`/examples?${q.toString()}`);
  };

  return (
    <>
      <ProgressBar active={loading} />
      <PageHeader
        eyebrow="01 · Overview"
        title="Where quantization breaks"
        lede="Share of prompts whose output turned dangerous after quantization, per task type, measured against the FP16 baseline."
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading label="Analyzing drift" />
      ) : data.length === 0 ? (
        <EmptyState title="No results for this model" hint="Run the benchmark first, then reload." />
      ) : (
        <div className={`stack${loading ? " is-refetching" : ""}`}>
          <section className="card reveal">
            <SectionHead
              title="Dangerous drift by task and config"
              sub="Select a cell to read the examples behind it."
            />
            <div className="scroll-x">
              <table className="heat">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    {view.configs.map((cfg) => (
                      <th key={cfg} scope="col">
                        {cfg}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.categories.map((cat, r) => (
                    <tr key={cat}>
                      <th scope="row">
                        {cap(cat)}
                        <span className="row-n">n={view.at.get(`${cat}|${view.configs[0]}`)?.total ?? 0}</span>
                      </th>
                      {view.configs.map((cfg, c) => {
                        const cell = view.at.get(`${cat}|${cfg}`);
                        if (!cell) return <td key={cfg} />;
                        const rate = cell.dangerous_rate;
                        const { Icon, label } = VERDICTS[cell.verdict];
                        return (
                          <td key={cfg}>
                            <button
                              type="button"
                              className="cell"
                              data-hi={heatIsHigh(rate, theme)}
                              style={{ ...cssVars({ "--i": r + c }), background: heatBg(rate) }}
                              onClick={() => open(cfg, cat, rate)}
                              aria-label={`${cap(cat)} at ${cfg.toUpperCase()}: ${rate}% dangerous, ${cell.drift_rate}% any drift, verdict ${label}. Open examples.`}
                            >
                              <span className="cell-icon">
                                <Icon size={15} />
                              </span>
                              <span className="cell-val">
                                {rate}
                                <small>%</small>
                              </span>
                              <span className="cell-sub">{cell.drift_rate}% any drift</span>
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
                  const { Icon, label } = VERDICTS[v];
                  return (
                    <span key={v}>
                      <Icon size={13} />
                      {label}, {VERDICT_RULES[v]}
                    </span>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="card reveal" style={cssVars({ "--i": 1 })}>
            <SectionHead title="Compression level, side by side" sub="Dangerous drift rate per task type.">
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
              <BarChart
                data={view.chart}
                barGap={3}
                barCategoryGap="30%"
                margin={{ top: 8, right: 4, bottom: 0, left: -6 }}
              >
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
                    radius={[4, 4, 0, 0]}
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
