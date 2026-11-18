import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export type Verdict = "safe" | "caution" | "unsafe";

export async function fetchModels(): Promise<string[]> {
  const res = await api.get("/models");
  return res.data.models;
}

export async function fetchConfigs(model: string): Promise<string[]> {
  const res = await api.get(`/models/${model}/configs`);
  return res.data.configs;
}

export interface HeatmapCell {
  config: string;
  category: string;
  drift_rate: number;
  dangerous_rate: number;
  total: number;
  verdict: Verdict;
}

export async function fetchHeatmap(model: string): Promise<HeatmapCell[]> {
  const res = await api.get(`/models/${model}/heatmap`);
  return res.data.heatmap;
}

export interface DriftExample {
  prompt_id: string;
  prompt_text: string;
  category: string;
  baseline_output: string;
  quantized_output: string;
  config_name: string;
  drift_type: string;
  severity: number;
  explanation: string;
}

export async function fetchExamples(
  model: string,
  config: string,
  category?: string
): Promise<DriftExample[]> {
  const params = category ? { category } : {};
  const res = await api.get(`/models/${model}/examples/${config}`, { params });
  return res.data.examples;
}

export async function fetchRecommendations(
  model: string
): Promise<string[]> {
  const res = await api.get(`/models/${model}/recommendations`);
  return res.data.recommendations;
}
