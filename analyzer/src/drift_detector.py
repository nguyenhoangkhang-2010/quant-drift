"""Compare outputs between baseline and quantized configs."""

import json
from pathlib import Path
from dataclasses import dataclass

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


class DriftDetector:
    def __init__(self, results_dir: Path, baseline_config: str = "fp16"):
        self.results_dir = results_dir
        self.baseline_config = baseline_config
        self.classifier = DriftClassifier()

    def load_results(self, config_name: str) -> dict[str, dict]:
        """Load results keyed by prompt_id."""
        result_file = self.results_dir / f"{config_name}.json"
        if not result_file.exists():
            return {}
        with open(result_file) as f:
            results = json.load(f)
        return {r["prompt_id"]: r for r in results}

    def detect(self, quantized_config: str) -> list[DriftResult]:
        """Compare baseline vs quantized outputs for all prompts."""
        baseline = self.load_results(self.baseline_config)
        quantized = self.load_results(quantized_config)

        drifts = []
        for prompt_id, base_result in baseline.items():
            quant_result = quantized.get(prompt_id)
            if not quant_result:
                continue

            drift_type, severity, explanation = self.classifier.classify(
                category=base_result["category"],
                baseline_output=base_result["output"],
                quantized_output=quant_result["output"],
                prompt_text=base_result["prompt_text"],
            )

            drifts.append(DriftResult(
                prompt_id=prompt_id,
                prompt_text=base_result["prompt_text"],
                category=base_result["category"],
                baseline_output=base_result["output"],
                quantized_output=quant_result["output"],
                config_name=quantized_config,
                drift_type=drift_type,
                severity=severity,
                explanation=explanation,
            ))

        return drifts
