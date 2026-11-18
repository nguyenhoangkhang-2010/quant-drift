import { useMemo } from "react";
import { fetchHeatmap, HeatmapCell } from "../api";
import {
  CountUp,
  DRIFTS,
  EmptyState,
  ErrorState,
  Loading,
  Meter,
  PageHeader,
  ProgressBar,
  SectionHead,
  SplitBar,
  StatTile,
  VerdictChip,
  VERDICTS,
} from "../components";
import { useModel } from "../context";
import { useAsync } from "../hooks";
import { cap, cssVars, heatBg, round1, seriesColor, sortConfigs, splitOf } from "../lib";

function TaskTag({ cell, withRate }: { cell: HeatmapCell; withRate: boolean }) {
  const { Icon, color } = VERDICTS[cell.verdict];
  return (
    <span className="tag" style={{ gap: 6 }}>
      <span style={{ display: "inline-flex", color }}>
        <Icon size={12} />
      </span>
      {cap(cell.category)}
      {withRate && <span style={{ color: "var(--ink-2)" }}>{cell.dangerous_rate}%</span>}
    </span>
  );
}

const names = (cells: HeatmapCell[]) => cells.map((c) => c.category).join(", ");

export default function Report() {
  const { selected } = useModel();
  const { data, loading, error, reload } = useAsync(() => fetchHeatmap(selected), [selected], selected !== "");

  const view = useMemo(() => {
    const cells = data ?? [];
    const configs = sortConfigs([...new Set(cells.map((c) => c.config))]);
    const split = splitOf(cells);
    const byConfig = configs.map((cfg) => {
      const cs = cells.filter((c) => c.config === cfg).sort((a, b) => a.category.localeCompare(b.category));
      const s = splitOf(cs);
      return { cfg, cells: cs, rate: s.total ? (s.dangerous / s.total) * 100 : 0 };
    });
    const ranked = [...cells].sort(
      (a, b) =>
        b.dangerous_rate - a.dangerous_rate ||
        a.config.localeCompare(b.config) ||
        a.category.localeCompare(b.category)
    );
    return {
      cells,
      configs,
      split,
      byConfig,
      ranked,
      safe: cells.filter((c) => c.verdict === "safe").length,
      rate: split.total ? (split.dangerous / split.total) * 100 : 0,
    };
  }, [data]);

  const worst = view.ranked[0];

  return (
    <>
      <ProgressBar active={loading} />
      <PageHeader
        eyebrow="03 · Report"
        title="What is safe to quantize"
        lede="The verdict per config and task type, from every prompt compared against the FP16 baseline."
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading label="Building the report" />
      ) : data.length === 0 ? (
        <EmptyState title="No results for this model" hint="Run the benchmark first, then reload." />
      ) : (
        <div className={`stack${loading ? " is-refetching" : ""}`}>
          <section className="card hero reveal">
            <div>
              <div className="eyebrow">Dangerous drift, all comparisons</div>
              <div className="hero-fig" style={{ marginTop: 10 }}>
                <CountUp value={round1(view.rate)} decimals={1} />
                <small>%</small>
              </div>
              <p className="hero-cap">
                {view.split.dangerous} of {view.split.total} prompt comparisons gave a wrong answer, broken code or
                lost meaning.
              </p>
            </div>
            <SplitBar
              parts={[
                { label: "No drift", value: view.split.identical, color: DRIFTS.no_drift.color },
                { label: "Benign", value: view.split.benign, color: DRIFTS.benign.color },
                { label: "Dangerous", value: view.split.dangerous, color: DRIFTS.dangerous.color },
              ]}
            />
          </section>

          <div className="tiles">
            <StatTile
              index={1}
              label="Safe combinations"
              value={`${view.safe} / ${view.cells.length}`}
              sub="task and config pairs with no dangerous drift"
            />
            <StatTile
              index={2}
              label="Worst combination"
              value={worst.dangerous_rate > 0 ? `${worst.config.toUpperCase()} · ${cap(worst.category)}` : "None"}
              sub={`${worst.dangerous_rate}% dangerous drift`}
            />
            <StatTile
              index={3}
              label="Prompts compared"
              value={view.split.total}
              sub={`${view.configs.length} configs against FP16`}
            />
          </div>

          <section>
            <SectionHead title="Deployment guide" sub="Which task types each config can take." />
            <div className="guide">
              {view.byConfig.map((b, i) => {
                const safe = b.cells.filter((c) => c.verdict === "safe");
                const risky = b.cells.filter((c) => c.verdict !== "safe");
                const line =
                  risky.length === 0
                    ? "Safe for every task type tested."
                    : safe.length === 0
                      ? "Unsafe for every task type tested. Keep FP16."
                      : `Use for ${names(safe)}. Keep FP16 for ${names(risky)}.`;
                return (
                  <article
                    key={b.cfg}
                    className="card guide-card reveal"
                    style={cssVars({ "--i": i + 4 })}
                  >
                    <div className="guide-h">
                      <h3>
                        <i style={{ background: seriesColor(b.cfg, view.configs) }} />
                        {b.cfg.toUpperCase()}
                      </h3>
                      <span className="guide-rate">{round1(b.rate)}% dangerous overall</span>
                    </div>
                    <p className="guide-line">{line}</p>
                    <dl className="guide-sets">
                      <dt>Safe for</dt>
                      <dd>
                        {safe.length ? (
                          safe.map((c) => <TaskTag key={c.category} cell={c} withRate={false} />)
                        ) : (
                          <span className="guide-line">None</span>
                        )}
                      </dd>
                      <dt>Avoid for</dt>
                      <dd>
                        {risky.length ? (
                          risky.map((c) => <TaskTag key={c.category} cell={c} withRate />)
                        ) : (
                          <span className="guide-line">None</span>
                        )}
                      </dd>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="card reveal" style={cssVars({ "--i": 6 })}>
            <SectionHead title="Risk ranking" sub="Every task and config pair, worst first." />
            <ol>
              {view.ranked.map((c, i) => (
                <li className="rank-row" key={`${c.config}-${c.category}`}>
                  <span className="rank-i">{String(i + 1).padStart(2, "0")}</span>
                  <span className="rank-n">
                    {cap(c.category)}
                    <span>{c.config.toUpperCase()}</span>
                  </span>
                  <Meter percent={c.dangerous_rate} color={heatBg(c.dangerous_rate)} />
                  <span className="rank-v">{c.dangerous_rate}%</span>
                  <VerdictChip v={c.verdict} />
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
