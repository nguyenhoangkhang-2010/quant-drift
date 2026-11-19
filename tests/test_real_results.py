"""Checks against the committed Qwen2.5-1.5B run, so the shipped demo data stays sane.

Only math and code are asserted: they are decided by deterministic verifiers, so these
tests do not depend on the embedding model.
"""

import pytest

from analyzer.src.classifier import DriftType
from analyzer.src.drift_detector import DriftDetector

from .conftest import REPO_ROOT

MODEL_DIR = REPO_ROOT / "results" / "qwen2.5-1.5b"

pytestmark = pytest.mark.skipif(not (MODEL_DIR / "fp16.json").exists(), reason="no committed results")


@pytest.fixture(scope="module")
def detector():
    return DriftDetector(MODEL_DIR)


def dangerous(drifts, category):
    return [d for d in drifts if d.category == category and d.drift_type == DriftType.DANGEROUS]


def test_all_configs_cover_the_same_prompts(detector):
    baseline_ids = set(detector.load_results("fp16"))
    assert len(baseline_ids) == 45
    for config in ("int8", "int4"):
        assert set(detector.load_results(config)) == baseline_ids


def test_int8_code_keeps_its_behavior(detector):
    """Q8_0 is near-lossless: none of its code answers should change behavior."""
    assert dangerous(detector.detect("int8"), "code") == []


def test_int8_math_keeps_its_answers(detector):
    assert dangerous(detector.detect("int8"), "math") == []


def test_int4_math_gets_a_known_answer_wrong(detector):
    wrong = {d.prompt_id: d for d in dangerous(detector.detect("int4"), "math")}
    assert "math_001" in wrong  # 17 * 24: 408 -> 336
    assert "408" in wrong["math_001"].explanation


def test_int4_code_changes_behavior(detector):
    assert dangerous(detector.detect("int4"), "code")
