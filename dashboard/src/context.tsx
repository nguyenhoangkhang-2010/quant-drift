import { createContext, useContext } from "react";

export interface ModelCtx {
  models: string[];
  selected: string;
  setSelected: (m: string) => void;
  status: "loading" | "ready" | "error";
  error?: string;
  reload: () => void;
}

export const ModelContext = createContext<ModelCtx>({
  models: [],
  selected: "",
  setSelected: () => {},
  status: "loading",
  reload: () => {},
});

export const useModel = () => useContext(ModelContext);

export type Theme = "light" | "dark";

export interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);
