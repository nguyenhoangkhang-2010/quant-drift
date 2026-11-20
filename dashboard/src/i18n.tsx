import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cap } from "./lib";

export type Lang = "en" | "vi";

const en = {
  "nav.heatmap": "Heatmap",
  "nav.examples": "Examples",
  "nav.report": "Report",

  "guide.title": "How to read",
  "guide.no_drift": "Identical to the FP16 baseline.",
  "guide.benign": "Reworded, but meaning and answer are intact.",
  "guide.dangerous": "Wrong answer, broken code or lost meaning.",

  "top.model": "Model",
  "theme.toLight": "Switch to light theme",
  "theme.toDark": "Switch to dark theme",
  "lang.label": "Language",

  "app.emptyTitle": "No results yet",
  "app.emptyHint": "Run the benchmark, or generate the demo data with scripts/generate_sample_results.py.",
  "err.title": "Could not reach the analyzer",
  "err.retry": "Try again",

  "verdict.safe": "Safe",
  "verdict.caution": "Caution",
  "verdict.unsafe": "Unsafe",
  "drift.no_drift": "No drift",
  "drift.benign": "Benign",
  "drift.dangerous": "Dangerous",

  "cat.chat": "Chat",
  "cat.code": "Code",
  "cat.math": "Math",
  "cat.summarization": "Summarization",
  "cat.translation": "Translation",

  "common.all": "All",
  "common.none": "None",
  "common.task": "Task",

  "load.warm": "The first request warms up the embedding model and can take up to a minute. After that it is instant.",
  "load.compare": "Comparing every quantized output against the FP16 baseline.",

  "heat.eyebrow": "01 · Overview",
  "heat.title": "Where quantization breaks",
  "heat.lede": "Share of prompts whose output turned dangerous after quantization, per task type, measured against the FP16 baseline.",
  "heat.loading": "Analyzing drift",
  "heat.emptyTitle": "No results for this model",
  "heat.emptyHint": "Run the benchmark first, then reload.",
  "heat.secTitle": "Dangerous drift by task and config",
  "heat.secSub": "Select a cell to read the examples behind it.",
  "heat.anyDrift": "{n}% any drift",
  "heat.cellAria": "{task} at {cfg}: {rate}% dangerous, {drift}% any drift, verdict {verdict}. Open examples.",
  "heat.ruleSafe": "0% dangerous",
  "heat.ruleCaution": "under 5%",
  "heat.ruleUnsafe": "5% or more",
  "heat.chartTitle": "Compression level, side by side",
  "heat.chartSub": "Dangerous drift rate per task type.",

  "ex.eyebrow": "02 · Examples",
  "ex.title": "Baseline versus quantized",
  "ex.lede": "Every prompt, side by side. Highlighted words are what the quantized model changed.",
  "ex.config": "Config",
  "ex.task": "Task",
  "ex.result": "Result",
  "ex.cfgAria": "Quantization config",
  "ex.taskAria": "Task type",
  "ex.typeAria": "Drift type",
  "ex.showing": "Showing {a} of {b} prompts",
  "ex.expandAll": "Expand all",
  "ex.collapseAll": "Collapse all",
  "ex.nothingTitle": "Nothing to compare",
  "ex.nothingHint": "This model only has FP16 results. Run another quantization config.",
  "ex.noMatchTitle": "No examples match",
  "ex.noMatchHint": "Try another task type or result filter.",
  "ex.loading": "Loading examples",
  "ex.baseline": "Baseline · FP16",
  "ex.quantized": "Quantized · {cfg}",

  "rep.eyebrow": "03 · Report",
  "rep.title": "What is safe to quantize",
  "rep.lede": "The verdict per config and task type, from every prompt compared against the FP16 baseline.",
  "rep.loading": "Building the report",
  "rep.heroLabel": "Dangerous drift, all comparisons",
  "rep.heroCap": "{d} of {t} prompt comparisons gave a wrong answer, broken code or lost meaning.",
  "rep.safeCombos": "Safe combinations",
  "rep.safeCombosSub": "task and config pairs with no dangerous drift",
  "rep.worst": "Worst combination",
  "rep.worstSub": "{n}% dangerous drift",
  "rep.compared": "Prompts compared",
  "rep.comparedSub": "{n} configs against FP16",
  "rep.guideTitle": "Deployment guide",
  "rep.guideSub": "Which task types each config can take.",
  "rep.lineAllSafe": "Safe for every task type tested.",
  "rep.lineNoneSafe": "Unsafe for every task type tested. Keep FP16.",
  "rep.lineMixed": "Use for {a}. Keep FP16 for {b}.",
  "rep.overall": "{n}% dangerous overall",
  "rep.safeFor": "Safe for",
  "rep.avoidFor": "Avoid for",
  "rep.rankTitle": "Risk ranking",
  "rep.rankSub": "Every task and config pair, worst first.",
} as const;

export type Key = keyof typeof en;

const vi: Record<Key, string> = {
  "nav.heatmap": "Bản đồ nhiệt",
  "nav.examples": "Ví dụ",
  "nav.report": "Báo cáo",

  "guide.title": "Cách đọc",
  "guide.no_drift": "Giống hệt baseline FP16.",
  "guide.benign": "Diễn đạt khác nhưng ý và đáp án vẫn đúng.",
  "guide.dangerous": "Sai đáp án, code lỗi hoặc mất ý nghĩa.",

  "top.model": "Model",
  "theme.toLight": "Chuyển sang giao diện sáng",
  "theme.toDark": "Chuyển sang giao diện tối",
  "lang.label": "Ngôn ngữ",

  "app.emptyTitle": "Chưa có kết quả",
  "app.emptyHint": "Hãy chạy benchmark hoặc tạo dữ liệu demo bằng scripts/generate_sample_results.py.",
  "err.title": "Không kết nối được tới analyzer",
  "err.retry": "Thử lại",

  "verdict.safe": "An toàn",
  "verdict.caution": "Thận trọng",
  "verdict.unsafe": "Không an toàn",
  "drift.no_drift": "Không lệch",
  "drift.benign": "Lệch vô hại",
  "drift.dangerous": "Nguy hiểm",

  "cat.chat": "Hội thoại",
  "cat.code": "Code",
  "cat.math": "Toán",
  "cat.summarization": "Tóm tắt",
  "cat.translation": "Dịch thuật",

  "common.all": "Tất cả",
  "common.none": "Không có",
  "common.task": "Loại task",

  "load.warm": "Lần gọi đầu tiên phải nạp model embedding nên có thể mất tới một phút. Sau đó sẽ trả về ngay.",
  "load.compare": "Đang so sánh từng output đã quantize với baseline FP16.",

  "heat.eyebrow": "01 · Tổng quan",
  "heat.title": "Quantization làm hỏng ở đâu",
  "heat.lede": "Tỷ lệ prompt có output trở nên nguy hiểm sau khi quantize, theo từng loại task, so với baseline FP16.",
  "heat.loading": "Đang phân tích độ lệch",
  "heat.emptyTitle": "Model này chưa có kết quả",
  "heat.emptyHint": "Hãy chạy benchmark rồi tải lại trang.",
  "heat.secTitle": "Tỷ lệ lệch nguy hiểm theo task và config",
  "heat.secSub": "Chọn một ô để xem các ví dụ phía sau.",
  "heat.anyDrift": "{n}% có lệch",
  "heat.cellAria": "{task} ở {cfg}: {rate}% nguy hiểm, {drift}% có lệch, kết luận {verdict}. Mở ví dụ.",
  "heat.ruleSafe": "0% nguy hiểm",
  "heat.ruleCaution": "dưới 5%",
  "heat.ruleUnsafe": "từ 5% trở lên",
  "heat.chartTitle": "So sánh các mức nén",
  "heat.chartSub": "Tỷ lệ lệch nguy hiểm theo loại task.",

  "ex.eyebrow": "02 · Ví dụ",
  "ex.title": "Baseline và bản quantize",
  "ex.lede": "Từng prompt đặt cạnh nhau. Phần được tô sáng là chỗ model đã quantize thay đổi.",
  "ex.config": "Config",
  "ex.task": "Loại task",
  "ex.result": "Kết quả",
  "ex.cfgAria": "Config quantization",
  "ex.taskAria": "Loại task",
  "ex.typeAria": "Loại độ lệch",
  "ex.showing": "Hiển thị {a}/{b} prompt",
  "ex.expandAll": "Mở tất cả",
  "ex.collapseAll": "Thu gọn tất cả",
  "ex.nothingTitle": "Chưa có gì để so sánh",
  "ex.nothingHint": "Model này mới chỉ có kết quả FP16. Hãy chạy thêm một config quantization.",
  "ex.noMatchTitle": "Không có ví dụ phù hợp",
  "ex.noMatchHint": "Thử loại task hoặc bộ lọc kết quả khác.",
  "ex.loading": "Đang tải ví dụ",
  "ex.baseline": "Baseline · FP16",
  "ex.quantized": "Đã quantize · {cfg}",

  "rep.eyebrow": "03 · Báo cáo",
  "rep.title": "Quantize được gì an toàn",
  "rep.lede": "Kết luận theo từng config và loại task, dựa trên mọi prompt được so với baseline FP16.",
  "rep.loading": "Đang tạo báo cáo",
  "rep.heroLabel": "Lệch nguy hiểm, tất cả phép so sánh",
  "rep.heroCap": "{d} trên {t} phép so sánh prompt cho đáp án sai, code lỗi hoặc mất ý nghĩa.",
  "rep.safeCombos": "Tổ hợp an toàn",
  "rep.safeCombosSub": "cặp task–config không có lệch nguy hiểm",
  "rep.worst": "Tổ hợp tệ nhất",
  "rep.worstSub": "{n}% lệch nguy hiểm",
  "rep.compared": "Prompt đã so sánh",
  "rep.comparedSub": "{n} config so với FP16",
  "rep.guideTitle": "Hướng dẫn triển khai",
  "rep.guideSub": "Mỗi config dùng được cho loại task nào.",
  "rep.lineAllSafe": "An toàn cho mọi loại task đã thử.",
  "rep.lineNoneSafe": "Không an toàn cho mọi loại task đã thử. Hãy giữ FP16.",
  "rep.lineMixed": "Dùng cho {a}. Giữ FP16 cho {b}.",
  "rep.overall": "{n}% nguy hiểm tổng thể",
  "rep.safeFor": "An toàn cho",
  "rep.avoidFor": "Tránh dùng cho",
  "rep.rankTitle": "Xếp hạng rủi ro",
  "rep.rankSub": "Mọi cặp task và config, tệ nhất trước.",
};

const DICT: Record<Lang, Record<Key, string>> = { en, vi };

// The analyzer sends English explanations; map the known patterns so the UI stays in one language.
const EXPLAIN_VI: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Identical output$/, () => "Output giống hệt"],
  [/^Same answer, different wording$/, () => "Cùng đáp án, diễn đạt khác"],
  [/^Wrong answer: (.+) -> (.+)$/, (m) => `Sai đáp án: ${m[1]} → ${m[2]}`],
  [/^Same expression, different explanation$/, () => "Cùng biểu thức, giải thích khác"],
  [/^High similarity \((.+)\), no numeric answer found$/, (m) => `Độ tương đồng cao (${m[1]}), không tìm thấy đáp án số`],
  [/^Low similarity \((.+)\), no numeric answer found$/, (m) => `Độ tương đồng thấp (${m[1]}), không tìm thấy đáp án số`],
  [/^Quantized output has syntax errors$/, () => "Output đã quantize bị lỗi cú pháp"],
  [/^Both have syntax errors \((.+)\)$/, (m) => `Cả hai đều lỗi cú pháp (${m[1]})`],
  [/^Different code, same behavior$/, () => "Code khác nhưng hành vi giống nhau"],
  [/^Different code behavior$/, () => "Hành vi của code khác nhau"],
  [/^Similar code \((.+)\)$/, (m) => `Code tương tự (${m[1]})`],
  [/^Different code \((.+)\)$/, (m) => `Code khác nhau (${m[1]})`],
  [/^Near-identical translation \((.+)\)$/, (m) => `Bản dịch gần như giống hệt (${m[1]})`],
  [/^Alternate translation \((.+)\)$/, (m) => `Bản dịch diễn đạt khác (${m[1]})`],
  [/^Meaning changed \((.+)\)$/, (m) => `Ý nghĩa đã thay đổi (${m[1]})`],
  [/^Near-identical \((.+)\)$/, (m) => `Gần như giống hệt (${m[1]})`],
  [/^Paraphrase \((.+)\)$/, (m) => `Diễn đạt lại (${m[1]})`],
  [/^Significant drift \((.+)\)$/, (m) => `Lệch đáng kể (${m[1]})`],
  [/^Inference error in one or both configs$/, () => "Lỗi suy luận ở một hoặc cả hai config"],
];

type Vars = Record<string, string | number>;

export interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
  cat: (category: string) => string;
  fmt: (n: number, maxDigits?: number, minDigits?: number) => string;
  explain: (text: string) => string;
}

function makeI18n(lang: Lang, setLang: (l: Lang) => void): I18n {
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const t: I18n["t"] = (key, vars) => {
    const template = DICT[lang][key] ?? DICT.en[key] ?? key;
    return vars ? template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`)) : template;
  };
  return {
    lang,
    setLang,
    t,
    cat: (c) => {
      const key = `cat.${c}` as Key;
      return key in DICT.en ? t(key) : cap(c);
    },
    fmt: (n, maxDigits = 1, minDigits = 0) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: maxDigits, minimumFractionDigits: minDigits }).format(n),
    explain: (text) => {
      if (lang === "en") return text;
      for (const [re, fn] of EXPLAIN_VI) {
        const m = re.exec(text);
        if (m) return fn(m);
      }
      return text;
    },
  };
}

const I18nContext = createContext<I18n>(makeI18n("en", () => {}));

export const useI18n = () => useContext(I18nContext);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("qd-lang");
    if (saved === "en" || saved === "vi") return saved;
  } catch {
    /* storage unavailable: fall back to the browser language */
  }
  return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("qd-lang", l);
    } catch {
      /* the choice just won't persist */
    }
  }, []);

  const value = useMemo(() => makeI18n(lang, setLang), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
