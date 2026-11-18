import { useCallback, useEffect, useState } from "react";
import type { Theme } from "./context";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fetch with stale-while-loading: previous data stays until the new request settles. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(enabled);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    setError(undefined);
    fn()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Request failed");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

export function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const t0 = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [active]);
  return seconds;
}

export function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min((now - t0) / ms, 1);
      setValue(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export function useThemeState(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Until the viewer picks a theme by hand, follow the operating system.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem("qd-theme");
      } catch {
        /* storage unavailable */
      }
      if (stored === "light" || stored === "dark") return;
      setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("qd-theme", next);
      } catch {
        /* storage unavailable: the choice just won't persist */
      }
      return next;
    });
  }, []);

  return [theme, toggle];
}
