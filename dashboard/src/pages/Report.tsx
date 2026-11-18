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
import { useI18n } from "../i18n";
import { cssVars, heatBg, round1, seriesColor, sortConfigs, splitOf } from "../lib";

function TaskTag({ cell, withRate }: { cell: HeatmapCell; withRate: boolean }) {
  const { cat, fmt } = useI18n();
  const { Icon, color } = VERDICTS[cell.verdict];
  return (
    <span className="tag" style={{ gap: 6 }}>
      <span style={{ display: "inline-flex", color }}>
        <Icon size={12} />
      </span>
      {cat(cell.category)}
      {withRate && <span style={{ color: "var(--ink-2)" }}>{fmt(cell.dangerous_rate)}%</span>}
    </span>
  );
}

export default function Report() {
  const { selected } = useModel();
  const { t, cat, fmt } = useI18n();
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
  const names = (cells: HeatmapCell[]) => cells.map((c) => cat(c.category)).join(", ");

  return (
    <>
      <ProgressBar active={loading} />
      <PageHeader eyebrow={t("rep.eyebrow")} title={t("rep.title")} lede={t("rep.lede")} />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading label={t("rep.loading")} />
      ) : data.length === 0 ? (
        <EmptyState title={t("heat.emptyTitle")} hint={t("heat.emptyHint")} />
      ) : (
        <div className={`stack${loading ? " is-refetching" : ""}`}>
          <section className="card hero reveal">
            <div>
              <div className="eyebrow">{t("rep.heroLabel")}</div>
              <div className="hero-fig" style={{ marginTop: 10 }}>
                <CountUp value={round1(view.rate)} decimals={1} />
                <small>%</small>
              </div>
              <p className="hero-cap">
                {t("rep.heroCap", { d: view.split.dangerous, t: view.split.total })}
              </p>
            </div>
            <SplitBar
              parts={[
                { label: t("drift.no_drift"), value: view.split.identical, color: DRIFTS.no_drift.color },
                { label: t("drift.benign"), value: view.split.benign, color: DRIFTS.benign.color },
                { label: t("drift.dangerous"), value: view.split.dangerous, color: DRIFTS.dangerous.color },
              ]}
            />
          </section>

          <div className="tiles">
            <StatTile
              index={1}
              label={t("rep.safeCombos")}
              value={`${view.safe} / ${view.cells.length}`}
              sub={t("rep.safeCombosSub")}
            />
            <StatTile
              index={2}
              label={t("rep.worst")}
              value={worst.dangerous_rate > 0 ? `${worst.config.toUpperCase()} · ${cat(worst.category)}` : t("common.none")}
              sub={t("rep.worstSub", { n: fmt(worst.dangerous_rate) })}
            />
            <StatTile
              index={3}
              label={t("rep.compared")}
              value={view.split.total}
              sub={t("rep.comparedSub", { n: view.configs.length })}
            />
          </div>

          <section>
            <SectionHead title={t("rep.guideTitle")} sub={t("rep.guideSub")} />
            <div className="guide">
              {view.byConfig.map((b, i) => {
                const safe = b.cells.filter((c) => c.verdict === "safe");
                const risky = b.cells.filter((c) => c.verdict !== "safe");
                const line =
                  risky.length === 0
                    ? t("rep.lineAllSafe")
                    : safe.length === 0
                      ? t("rep.lineNoneSafe")
                      : t("rep.lineMixed", { a: names(safe), b: names(risky) });
                return (
                  <article key={b.cfg} className="card guide-card reveal" style={cssVars({ "--i": i + 4 })}>
                    <div className="guide-h">
                      <h3>
                        <i style={{ background: seriesColor(b.cfg, view.configs) }} />
                        {b.cfg.toUpperCase()}
                      </h3>
                      <span className="guide-rate">{t("rep.overall", { n: fmt(b.rate) })}</span>
                    </div>
                    <p className="guide-line">{line}</p>
                    <dl className="guide-sets">
                      <dt>{t("rep.safeFor")}</dt>
                      <dd>
                        {safe.length ? (
                          safe.map((c) => <TaskTag key={c.category} cell={c} withRate={false} />)
                        ) : (
                          <span className="guide-line">{t("common.none")}</span>
                        )}
                      </dd>
                      <dt>{t("rep.avoidFor")}</dt>
                      <dd>
                        {risky.length ? (
                          risky.map((c) => <TaskTag key={c.category} cell={c} withRate />)
                        ) : (
                          <span className="guide-line">{t("common.none")}</span>
                        )}
                      </dd>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="card reveal" style={cssVars({ "--i": 6 })}>
            <SectionHead title={t("rep.rankTitle")} sub={t("rep.rankSub")} />
            <ol>
              {view.ranked.map((c, i) => (
                <li className="rank-row" key={`${c.config}-${c.category}`}>
                  <span className="rank-i">{String(i + 1).padStart(2, "0")}</span>
                  <span className="rank-n">
                    {cat(c.category)}
                    <span>{c.config.toUpperCase()}</span>
                  </span>
                  <Meter percent={c.dangerous_rate} color={heatBg(c.dangerous_rate)} />
                  <span className="rank-v">{fmt(c.dangerous_rate)}%</span>
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
