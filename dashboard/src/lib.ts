import type { CSSProperties } from "react";
import type { HeatmapCell } from "./api";
import type { Theme } from "./context";

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const cssVars = (o: Record<string, string | number>) => o as CSSProperties;

export const round1 = (n: number) => Number(n.toFixed(1));

/** FP16 first, then INT8, INT4: the order of increasing compression. */
export function sortConfigs(configs: string[]): string[] {
  const bits = (c: string) => Number(/\d+/.exec(c)?.[0] ?? 0);
  return [...configs].sort((a, b) => bits(b) - bits(a) || a.localeCompare(b));
}

// A config keeps its series colour on every chart and filter (colour follows the entity, never its rank).
const PINNED_SLOTS: Record<string, number> = { int8: 1, int4: 2 };

export function seriesSlot(config: string, configs: string[]): number {
  const pinned = PINNED_SLOTS[config];
  if (pinned) return pinned;
  const others = configs.filter((c) => !PINNED_SLOTS[c]);
  return Math.min(3 + others.indexOf(config), 8);
}

export const seriesColor = (config: string, configs: string[]) =>
  `var(--series-${seriesSlot(config, configs)})`;

// The heat scale is fixed (0 to HEAT_MAX %) so a colour means the same thing on every model.
export const HEAT_MAX = 50;

export function heatBg(rate: number): string {
  const p = Math.round(Math.min(Math.max(rate / HEAT_MAX, 0), 1) * 100);
  return `color-mix(in oklab, var(--heat-lo) ${100 - p}%, var(--heat-hi) ${p}%)`;
}

export function heatIsHigh(rate: number, theme: Theme): boolean {
  return rate / HEAT_MAX >= (theme === "dark" ? 0.75 : 0.9);
}

export interface Split {
  identical: number;
  benign: number;
  dangerous: number;
  total: number;
}

export function splitOf(cells: HeatmapCell[]): Split {
  const s: Split = { identical: 0, benign: 0, dangerous: 0, total: 0 };
  for (const c of cells) {
    const dangerous = Math.round((c.dangerous_rate * c.total) / 100);
    const drifted = Math.round((c.drift_rate * c.total) / 100);
    s.dangerous += dangerous;
    s.benign += drifted - dangerous;
    s.identical += c.total - drifted;
    s.total += c.total;
  }
  return s;
}
