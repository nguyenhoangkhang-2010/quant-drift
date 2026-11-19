import json
import os

import pytest

from analyzer.src import drift_detector
from analyzer.src.classifier import DriftType
from analyzer.src.drift_detector import DriftDetector

from .conftest import write_results


@pytest.fixture(autouse=True)
def clear_cache():
    drift_detector._detect_cache.clear()
    yield
    drift_detector._detect_cache.clear()


def model_dir(results_dir):
    return results_dir / "toy-model"


def by_id(drifts):
    return {d.prompt_id: d for d in drifts}


def test_detect_classifies_each_prompt(results_dir, similarity):
    similarity.value = 0.5
    drifts = by_id(DriftDetector(model_dir(results_dir)).detect("int8"))

    assert set(drifts) == {"math_001", "math_002", "code_001", "chat_001", "trans_001"}
    assert drifts["math_001"].drift_type == DriftType.DANGEROUS  # 408 -> 336
    assert drifts["math_002"].drift_type == DriftType.NO_DRIFT  # identical
    assert drifts["code_001"].drift_type == DriftType.BENIGN  # n * 2 vs n + n
    assert drifts["chat_001"].drift_type == DriftType.NO_DRIFT
    assert drifts["trans_001"].drift_type == DriftType.DANGEROUS  # similarity stubbed to 0.5
    assert all(d.config_name == "int8" for d in drifts.values())


def test_missing_baseline_raises(tmp_path):
    write_results(tmp_path / "m", "int8", [("a", "chat", "x")])
    with pytest.raises(FileNotFoundError):
        DriftDetector(tmp_path / "m").detect("int8")


def test_missing_quantized_config_gives_no_drifts(results_dir):
    assert DriftDetector(model_dir(results_dir)).detect("int4") == []


def test_prompts_missing_from_quantized_run_are_skipped(tmp_path):
    write_results(tmp_path, "fp16", [("a", "chat", "x"), ("b", "chat", "y")])
    write_results(tmp_path, "int8", [("a", "chat", "x")])
    assert [d.prompt_id for d in DriftDetector(tmp_path).detect("int8")] == ["a"]


def test_inference_errors_are_dangerous(tmp_path):
    write_results(tmp_path, "fp16", [("a", "chat", "fine")])
    write_results(tmp_path, "int8", [("a", "chat", "ERROR: out of memory")])
    (drift,) = DriftDetector(tmp_path).detect("int8")
    assert drift.drift_type == DriftType.DANGEROUS
    assert drift.severity == 1.0
    assert "error" in drift.explanation.lower()


def test_unicode_outputs_round_trip(tmp_path):
    write_results(tmp_path, "fp16", [("a", "translation", "Xin chào thế giới — 你好")])
    write_results(tmp_path, "int8", [("a", "translation", "Xin chào thế giới — 你好")])
    (drift,) = DriftDetector(tmp_path).detect("int8")
    assert drift.drift_type == DriftType.NO_DRIFT


def test_results_are_cached_until_a_file_changes(results_dir, similarity):
    detector = DriftDetector(model_dir(results_dir))
    detector.detect("int8")
    calls_after_first = similarity.calls

    detector.detect("int8")
    assert similarity.calls == calls_after_first  # served from cache

    path = model_dir(results_dir) / "int8.json"
    rows = json.loads(path.read_text(encoding="utf-8"))
    rows[0]["output"] = "17 * 24 = 408"
    path.write_text(json.dumps(rows), encoding="utf-8")
    bumped = path.stat().st_mtime_ns + 1_000_000_000
    os.utime(path, ns=(bumped, bumped))

    fresh = by_id(detector.detect("int8"))
    assert fresh["math_001"].drift_type == DriftType.NO_DRIFT


def test_cached_list_is_a_copy(results_dir):
    detector = DriftDetector(model_dir(results_dir))
    detector.detect("int8").clear()
    assert len(detector.detect("int8")) == 5
