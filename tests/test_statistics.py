import pytest

from analyzer.src.classifier import DriftType
from analyzer.src.drift_detector import DriftResult
from analyzer.src.statistics import (
    build_report,
    compute_task_stats,
    generate_recommendations,
    verdict,
)


def drift(category: str, kind: DriftType, config: str = "int8", severity: float = 0.5) -> DriftResult:
    return DriftResult("id", "prompt", category, "a", "b", config, kind, severity, "why")


@pytest.mark.parametrize(
    ("rate", "expected"),
    [(0, "safe"), (0.0, "safe"), (0.1, "caution"), (4.9, "caution"), (5.0, "unsafe"), (100, "unsafe")],
)
def test_verdict_thresholds(rate, expected):
    assert verdict(rate) == expected


def test_task_stats_counts_and_rates():
    drifts = (
        [drift("math", DriftType.NO_DRIFT)] * 5
        + [drift("math", DriftType.BENIGN)] * 3
        + [drift("math", DriftType.DANGEROUS)] * 2
    )
    (stat,) = compute_task_stats(drifts)
    assert (stat.total, stat.no_drift, stat.benign, stat.dangerous) == (10, 5, 3, 2)
    assert stat.drift_rate == 50.0
    assert stat.dangerous_rate == 20.0
    assert stat.config == "int8"


def test_task_stats_groups_by_category_sorted():
    drifts = [drift("math", DriftType.BENIGN), drift("chat", DriftType.DANGEROUS), drift("code", DriftType.NO_DRIFT)]
    stats = compute_task_stats(drifts)
    assert [s.category for s in stats] == ["chat", "code", "math"]
    assert stats[0].dangerous_rate == 100.0
    assert stats[1].drift_rate == 0.0


def test_task_stats_average_severity():
    drifts = [drift("math", DriftType.BENIGN, severity=0.2), drift("math", DriftType.DANGEROUS, severity=1.0)]
    assert compute_task_stats(drifts)[0].avg_severity == 0.6


def test_task_stats_empty():
    assert compute_task_stats([]) == []


def test_recommendations_use_verdict_levels():
    stats = (
        compute_task_stats([drift("math", DriftType.BENIGN)])
        + compute_task_stats([drift("code", DriftType.DANGEROUS)])
        + compute_task_stats([drift("chat", DriftType.DANGEROUS)] + [drift("chat", DriftType.NO_DRIFT)] * 39)
    )
    recs = generate_recommendations(stats)
    by_category = {category: next(r for r in recs if f"for {category}" in r) for category in ("math", "code", "chat")}
    assert "SAFE" in by_category["math"] and "UNSAFE" not in by_category["math"]
    assert "UNSAFE" in by_category["code"]
    assert "CAUTION" in by_category["chat"]  # 1 of 40 = 2.5% dangerous


def test_build_report():
    report = build_report({
        "int8": [drift("math", DriftType.BENIGN, "int8")] * 4,
        "int4": [drift("math", DriftType.DANGEROUS, "int4")] * 6,
    })
    assert report.configs_compared == ["int8", "int4"]
    assert report.total_prompts == 6
    assert len(report.task_stats) == 2
    assert len(report.recommendations) == 2
