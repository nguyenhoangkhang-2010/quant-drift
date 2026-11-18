import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DriftExample, fetchConfigs, fetchExamples } from "../api";
import {
  DRIFTS,
  DriftChip,
  driftMeta,
  EmptyState,
  ErrorState,
  IconChevron,
  IconInfo,
  Loading,
  Meter,
  PageHeader,
  ProgressBar,
  Segmented,
  SplitBar,
} from "../components";
import { useModel } from "../context";
import { diffTokens, Tok } from "../diff";
import { useAsync } from "../hooks";
import { cap, cssVars, seriesColor, sortConfigs } from "../lib";

const RANK: Record<string, number> = { dangerous: 0, benign: 1, no_drift: 2 };
const TYPES = ["all", "dangerous", "benign", "no_drift"] as const;

function Tokens({ toks }: { toks: Tok[] }) {
  const marked = toks.map((k) => ({ ...k }));
  // Whitespace between two changed words belongs to the same highlight.
  for (let i = 1; i < marked.length - 1; i++) {
    if (!/\S/.test(marked[i].t) && marked[i - 1].changed && marked[i + 1].changed) marked[i].changed = true;
  }
  const runs: Tok[] = [];
  for (const k of marked) {
    const last = runs[runs.length - 1];
    if (last && last.changed === k.changed) last.t += k.t;
    else runs.push(k);
  }
  return (
    <>
      {runs.map((r, i) =>
        r.changed ? <mark key={i}>{r.t}</mark> : <Fragment key={i}>{r.t}</Fragment>
      )}
    </>
  );
}

function ExampleCard({
  ex,
  open,
  index,
  onToggle,
}: {
  ex: DriftExample;
  open: boolean;
  index: number;
  onToggle: () => void;
}) {
  const meta = driftMeta(ex.drift_type);
  const diff = useMemo(() => diffTokens(ex.baseline_output, ex.quantized_output), [ex]);
  const severity = Math.round(ex.severity * 100);
  const bodyId = `ex-${ex.config_name}-${ex.prompt_id}`;

  return (
    <article className="ex" data-open={open} style={cssVars({ "--i": Math.min(index, 12) })}>
      <button type="button" className="ex-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="ex-id">{ex.prompt_id}</span>
        <span className="tag">{cap(ex.category)}</span>
        <DriftChip type={ex.drift_type} />
        <span className="ex-prompt">{ex.prompt_text}</span>
        <span className="ex-sev">
          <Meter percent={severity} color={meta.color} />
          {severity}%
        </span>
        <span className="ex-chev">
          <IconChevron />
        </span>
      </button>

      <div className="ex-body" id={bodyId}>
        <div>
          <div className="ex-inner">
            <p className="ex-q">{ex.prompt_text}</p>
            <div className="panels" style={cssVars({ "--mark": meta.wash })}>
              <div className="panel">
                <div className="panel-h">Baseline · FP16</div>
                <pre>
                  <Tokens toks={diff.a} />
                </pre>
              </div>
              <div className="panel">
                <div className="panel-h">Quantized · {ex.config_name.toUpperCase()}</div>
                <pre>
                  <Tokens toks={diff.b} />
                </pre>
              </div>
            </div>
            <p className="ex-note">
              <IconInfo size={14} />
              {ex.explanation}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Examples() {
  const { selected } = useModel();
  const [params, setParams] = useSearchParams();

  const cfgQ = useAsync(() => fetchConfigs(selected), [selected], selected !== "");
  const configs = useMemo(() => sortConfigs((cfgQ.data ?? []).filter((c) => c !== "fp16")), [cfgQ.data]);

  const requested = params.get("config");
  const config = requested && configs.includes(requested) ? requested : configs[configs.length - 1] ?? "";
  const category = params.get("category") ?? "all";
  const type = params.get("type") ?? "all";

  const exQ = useAsync(() => fetchExamples(selected, config), [selected, config], selected !== "" && config !== "");

  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );

  const all = useMemo(() => exQ.data ?? [], [exQ.data]);
  const categories = useMemo(() => [...new Set(all.map((e) => e.category))].sort(), [all]);
  const inCategory = useMemo(
    () => (category === "all" ? all : all.filter((e) => e.category === category)),
    [all, category]
  );
  const shown = useMemo(
    () =>
      (type === "all" ? inCategory : inCategory.filter((e) => e.drift_type === type))
        .slice()
        .sort(
          (a, b) =>
            (RANK[a.drift_type] ?? 1) - (RANK[b.drift_type] ?? 1) ||
            b.severity - a.severity ||
            a.prompt_id.localeCompare(b.prompt_id)
        ),
    [inCategory, type]
  );

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const firstId = shown[0]?.prompt_id;
  useEffect(() => {
    setOpenIds(firstId ? new Set([firstId]) : new Set());
  }, [firstId, config, category, type, selected]);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const countType = (t: string) => inCategory.filter((e) => e.drift_type === t).length;
  const busy = cfgQ.loading || exQ.loading;
  const error = cfgQ.error ?? exQ.error;

  return (
    <>
      <ProgressBar active={busy} />
      <PageHeader
        eyebrow="02 · Examples"
        title="Baseline versus quantized"
        lede="Every prompt, side by side. Highlighted words are what the quantized model changed."
      />

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            cfgQ.reload();
            exQ.reload();
          }}
        />
      ) : cfgQ.data && configs.length === 0 ? (
        <EmptyState title="Nothing to compare" hint="This model only has FP16 results. Run another quantization config." />
      ) : !exQ.data ? (
        <Loading label="Loading examples" />
      ) : (
        <div className={exQ.loading ? "is-refetching" : undefined}>
          <div className="filters">
            <div className="field">
              <span className="eyebrow">Config</span>
              <Segmented
                label="Quantization config"
                value={config}
                options={configs.map((c) => ({ value: c, label: c.toUpperCase(), color: seriesColor(c, configs) }))}
                onChange={(v) => setParam("config", v)}
              />
            </div>
            <div className="field">
              <span className="eyebrow">Task</span>
              <Segmented
                label="Task type"
                value={category}
                options={[
                  { value: "all", label: "All", count: all.length },
                  ...categories.map((c) => ({
                    value: c,
                    label: cap(c),
                    count: all.filter((e) => e.category === c).length,
                  })),
                ]}
                onChange={(v) => setParam("category", v)}
              />
            </div>
            <div className="field">
              <span className="eyebrow">Result</span>
              <Segmented
                label="Drift type"
                value={type}
                options={TYPES.map((t) =>
                  t === "all"
                    ? { value: t, label: "All", count: inCategory.length }
                    : { value: t, label: DRIFTS[t].label, count: countType(t), color: DRIFTS[t].color }
                )}
                onChange={(v) => setParam("type", v)}
              />
            </div>
          </div>

          <section className="card reveal" style={{ padding: "16px 20px" }}>
            <SplitBar
              parts={[
                { label: "No drift", value: countType("no_drift"), color: DRIFTS.no_drift.color },
                { label: "Benign", value: countType("benign"), color: DRIFTS.benign.color },
                { label: "Dangerous", value: countType("dangerous"), color: DRIFTS.dangerous.color },
              ]}
            />
          </section>

          <div className="toolbar">
            <span>
              Showing {shown.length} of {inCategory.length} prompts
            </span>
            <div>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setOpenIds(new Set(shown.map((e) => e.prompt_id)))}
              >
                Expand all
              </button>{" "}
              <button type="button" className="btn btn-quiet" onClick={() => setOpenIds(new Set())}>
                Collapse all
              </button>
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="ex-list">
              <EmptyState title="No examples match" hint="Try another task type or result filter." />
            </div>
          ) : (
            <div className="ex-list">
              {shown.map((ex, i) => (
                <ExampleCard
                  key={`${ex.config_name}-${ex.prompt_id}`}
                  ex={ex}
                  index={i}
                  open={openIds.has(ex.prompt_id)}
                  onToggle={() => toggle(ex.prompt_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
