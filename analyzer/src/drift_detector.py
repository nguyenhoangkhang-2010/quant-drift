"""Compare outputs between baseline and quantized configs."""

import json
import threading
from dataclasses import dataclass
from pathlib import Path

from .classifier import DriftClassifier, DriftType


@dataclass
class DriftResult:
    prompt_id: str
    prompt_text: str
    category: str
    baseline_output: str
    quantized_output: str
    config_name: str
    drift_type: DriftType
    severity: float
    explanation: str


_detect_cache: dict[tuple, list] = {}
_cache_lock = threading.Lock()


class DriftDetector:
    def __init__(self, results_dir: Path, baseline_config: str = "fp16"):
        self.results_dir = results_dir
        self.baseline_config = baseline_config
        self.classifier = DriftClassifier()

    def _cache_key(self, quantized_config: str) -> tuple | None:
        try:
            base_mtime = (self.results_dir / f"{self.baseline_config}.json").stat().st_mtime_ns
            quant_mtime = (self.results_dir / f"{quantized_config}.json").stat().st_mtime_ns
        except OSError:
            return None
        return (str(self.results_dir.resolve()), self.baseline_config, quantized_config, base_mtime, quant_mtime)

    def load_results(self, config_name: str) -> dict[str, dict]:
        """Load results keyed by prompt_id."""
        result_file = self.results_dir / f"{config_name}.json"
        if not result_file.exists():
            return {}
        with open(result_file, encoding="utf-8") as f:
            results = json.load(f)
        return {r["prompt_id"]: r for r in results}

    def detect(self, quantized_config: str) -> list[DriftResult]:
        """Compare baseline vs quantized outputs for all prompts (cached by file mtime)."""
        key = self._cache_key(quantized_config)
        if key is not None:
            with _cache_lock:
                cached = _detect_cache.get(key)
            if cached is not None:
                return list(cached)

        drifts = self._detect_uncached(quantized_config)

        if key is not None:
            with _cache_lock:
                _detect_cache[key] = drifts
        return list(drifts)

    def _detect_uncached(self, quantized_config: str) -> list[DriftResult]:
        baseline = self.load_results(self.baseline_config)
        quantized = self.load_results(quantized_config)

        if not baseline:
            raise FileNotFoundError(
                f"Baseline results not found: {self.results_dir / self.baseline_config}.json"
            )

        drifts = []
        for prompt_id, base_result in baseline.items():
            quant_result = quantized.get(prompt_id)
            if not quant_result:
                continue

            base_output = base_result["output"]
            quant_output = quant_result["output"]

            if base_output.startswith("ERROR:") or quant_output.startswith("ERROR:"):
                drifts.append(DriftResult(
                    prompt_id=prompt_id,
                    prompt_text=base_result["prompt_text"],
                    category=base_result["category"],
                    baseline_output=base_output,
                    quantized_output=quant_output,
                    config_name=quantized_config,
                    drift_type=DriftType.DANGEROUS,
                    severity=1.0,
                    explanation="Inference error in one or both configs",
                ))
                continue

            drift_type, severity, explanation = self.classifier.classify(
                category=base_result["category"],
                baseline_output=base_output,
                quantized_output=quant_output,
                prompt_text=base_result["prompt_text"],
            )

            drifts.append(DriftResult(
                prompt_id=prompt_id,
                prompt_text=base_result["prompt_text"],
                category=base_result["category"],
                baseline_output=base_output,
                quantized_output=quant_output,
                config_name=quantized_config,
                drift_type=drift_type,
                severity=severity,
                explanation=explanation,
            ))

        return drifts
