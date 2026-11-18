import type { ReactElement, ReactNode } from "react";
import type { Verdict } from "./api";
import { useCountUp, useElapsed } from "./hooks";
import { type Key, useI18n } from "./i18n";
import { cssVars } from "./lib";

/* ---------- icons ---------- */

interface IconProps {
  size?: number;
}

const svgProps = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconGrid = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="2" y="2" width="5" height="5" rx="1.3" />
    <rect x="9" y="2" width="5" height="5" rx="1.3" />
    <rect x="2" y="9" width="5" height="5" rx="1.3" />
    <rect x="9" y="9" width="5" height="5" rx="1.3" />
  </svg>
);

export const IconSplit = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="2" y="2.5" width="12" height="11" rx="2" />
    <path d="M8 2.5v11" />
  </svg>
);

export const IconDoc = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M4 2h5l3 3v9H4z" />
    <path d="M9 2v3h3M6.5 8.5h3M6.5 11h3" />
  </svg>
);

export const IconCheck = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M3 8.5l3.2 3L13 4.5" />
  </svg>
);

export const IconAlert = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M8 2.5l6 10.5H2z" />
    <path d="M8 6.8v2.8M8 11.4v.01" />
  </svg>
);

export const IconX = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export const IconSun = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="8" cy="8" r="2.8" />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
  </svg>
);

export const IconMoon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M13 9.6A5.5 5.5 0 016.4 3a5.5 5.5 0 106.6 6.6z" />
  </svg>
);

export const IconChevron = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);

export const IconArrow = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export const IconInfo = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.3v3.4M8 5v.01" />
  </svg>
);

export function BrandMark({ size = 30 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="5" fill="var(--ink)" />
      <path d="M6 11h20" stroke="var(--surface)" strokeOpacity=".55" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6 11c8 0 10 10 20 10" stroke="var(--series-2)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ---------- verdicts and drift types ---------- */

export interface Meta {
  labelKey: Key;
  color: string;
  wash: string;
  Icon: (p: IconProps) => ReactElement;
}

export const VERDICTS: Record<Verdict, Meta> = {
  safe: { labelKey: "verdict.safe", color: "var(--good)", wash: "var(--good-wash)", Icon: IconCheck },
  caution: { labelKey: "verdict.caution", color: "var(--warn)", wash: "var(--warn-wash)", Icon: IconAlert },
  unsafe: { labelKey: "verdict.unsafe", color: "var(--crit)", wash: "var(--crit-wash)", Icon: IconX },
};

export const DRIFTS: Record<string, Meta> = {
  no_drift: { labelKey: "drift.no_drift", color: "var(--good)", wash: "var(--good-wash)", Icon: IconCheck },
  benign: { labelKey: "drift.benign", color: "var(--warn)", wash: "var(--warn-wash)", Icon: IconAlert },
  dangerous: { labelKey: "drift.dangerous", color: "var(--crit)", wash: "var(--crit-wash)", Icon: IconX },
};

export const driftMeta = (type: string): Meta => DRIFTS[type] ?? DRIFTS.benign;

// A status colour never carries meaning alone: every chip pairs it with an icon and a label.
export function Chip({ meta }: { meta: Meta }) {
  const { t } = useI18n();
  const { Icon } = meta;
  return (
    <span className="chip" style={cssVars({ "--c": meta.color, "--w": meta.wash })}>
      <Icon size={13} />
      {t(meta.labelKey)}
    </span>
  );
}

export const VerdictChip = ({ v }: { v: Verdict }) => <Chip meta={VERDICTS[v]} />;
export const DriftChip = ({ type }: { type: string }) => <Chip meta={driftMeta(type)} />;

/* ---------- controls ---------- */

export interface SegOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  color?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.color && <i className="seg-dot" style={{ background: o.color }} />}
          {o.label}
          {o.count !== undefined && <span className="seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- layout pieces ---------- */

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <header className="page-h">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{lede}</p>
    </header>
  );
}

export function SectionHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="sec-h">
      <div>
        <h2 className="sec-t">{title}</h2>
        {sub && <p className="sec-s">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  index = 0,
}: {
  label: string;
  value: ReactNode;
  sub: string;
  index?: number;
}) {
  return (
    <div className="card tile reveal" style={cssVars({ "--i": index })}>
      <div className="tile-l">{label}</div>
      <div className="tile-v">{value}</div>
      <div className="tile-s">{sub}</div>
    </div>
  );
}

export function Meter({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="meter" aria-hidden="true">
      <i style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, background: color }} />
    </div>
  );
}

export interface SplitPart {
  label: string;
  value: number;
  color: string;
}

export function SplitBar({ parts }: { parts: SplitPart[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const summary = parts.map((p) => `${p.label}: ${p.value}`).join(", ");
  return (
    <div>
      <div className="splitbar" role="img" aria-label={summary}>
        {parts
          .filter((p) => p.value > 0)
          .map((p, i) => (
            <i
              key={p.label}
              style={{ flex: p.value, background: p.color, animationDelay: `${i * 90}ms` }}
              title={`${p.label}: ${p.value} of ${total}`}
            />
          ))}
      </div>
      <ul className="legend">
        {parts.map((p) => (
          <li key={p.label}>
            <i style={{ background: p.color }} />
            {p.label}
            <b>{p.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const { fmt } = useI18n();
  const v = useCountUp(value);
  return <>{fmt(v, decimals, decimals)}</>;
}

/* ---------- states ---------- */

export const ProgressBar = ({ active }: { active: boolean }) => (
  <div className="progress" data-on={active} aria-hidden="true">
    <i />
  </div>
);

export function Loading({ label }: { label: string }) {
  const seconds = useElapsed(true);
  const { t } = useI18n();
  return (
    <div className="card loading" role="status" aria-live="polite">
      <svg viewBox="0 0 140 44" aria-hidden="true">
        <path className="base" d="M4 12H136" />
        <path className="track" d="M4 12C44 12 62 34 136 34" />
        <path className="pulse" d="M4 12C44 12 62 34 136 34" />
      </svg>
      <div className="loading-t">
        {label}
        <span className="loading-s">{seconds}s</span>
      </div>
      <p className="loading-p">
        {seconds >= 6 ? t("load.warm") : t("load.compare")}
      </p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card empty" role="alert">
      <IconAlert size={22} />
      <h2>{t("err.title")}</h2>
      <p>{message}</p>
      <button type="button" className="btn" onClick={onRetry}>
        {t("err.retry")}
      </button>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="card empty">
      <IconInfo size={22} />
      <h2>{title}</h2>
      <p>{hint}</p>
    </div>
  );
}

/* ---------- chart tooltip ---------- */

interface TipItem {
  name?: string;
  value?: number | string;
  color?: string;
}

export function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipItem[];
  label?: string | number;
}) {
  const { fmt } = useI18n();
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <div className="tip-h">{label}</div>
      {payload.map((p, i) => (
        <div className="tip-row" key={i}>
          <i style={{ background: p.color }} />
          <strong>{fmt(Number(p.value))}%</strong>
          <span>{p.name}</span>
        </div>
      ))}
    </div>
  );
}
