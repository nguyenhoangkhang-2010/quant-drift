import pytest
from fastapi.testclient import TestClient

from analyzer.src import api, drift_detector


@pytest.fixture
def client(results_dir, monkeypatch):
    monkeypatch.setattr(api, "RESULTS_DIR", results_dir)
    drift_detector._detect_cache.clear()
    # Not used as a context manager on purpose: that would run the lifespan hook,
    # which warms the real embedding model.
    return TestClient(api.app)


def test_list_models(client):
    assert client.get("/api/models").json() == {"models": ["toy-model"]}


def test_unknown_model_is_404(client):
    assert client.get("/api/models/nope/configs").status_code == 404
    assert client.get("/api/models/nope/heatmap").status_code == 404


def test_list_configs(client):
    assert client.get("/api/models/toy-model/configs").json() == {"configs": ["fp16", "int8"]}


def test_drift_summary(client):
    body = client.get("/api/models/toy-model/drift/int8").json()
    assert body["baseline"] == "fp16"
    assert body["total"] == 5
    # similarity is stubbed to 0.9: the changed translation counts as an alternate (benign) one
    assert body["summary"] == {"no_drift": 2, "benign": 2, "dangerous": 1}
    assert {d["prompt_id"] for d in body["drifts"]} == {"math_001", "math_002", "code_001", "chat_001", "trans_001"}


def test_heatmap_has_verdicts_and_excludes_baseline(client):
    cells = client.get("/api/models/toy-model/heatmap").json()["heatmap"]
    assert {c["config"] for c in cells} == {"int8"}
    by_category = {c["category"]: c for c in cells}
    assert by_category["math"]["dangerous_rate"] == 50.0
    assert by_category["math"]["verdict"] == "unsafe"
    assert by_category["code"]["dangerous_rate"] == 0.0
    assert by_category["code"]["verdict"] == "safe"
    assert by_category["math"]["total"] == 2


def test_recommendations(client):
    recs = client.get("/api/models/toy-model/recommendations").json()["recommendations"]
    assert any("UNSAFE for math" in r for r in recs)
    assert any("SAFE for code" in r for r in recs)


def test_examples_filters(client):
    all_examples = client.get("/api/models/toy-model/examples/int8").json()["examples"]
    assert len(all_examples) == 5

    math = client.get("/api/models/toy-model/examples/int8", params={"category": "math"}).json()["examples"]
    assert {e["category"] for e in math} == {"math"}

    dangerous = client.get(
        "/api/models/toy-model/examples/int8", params={"category": "math", "drift_type": "dangerous"}
    ).json()["examples"]
    assert [e["prompt_id"] for e in dangerous] == ["math_001"]
    assert dangerous[0]["baseline_output"] == "17 * 24 = 408"
    assert dangerous[0]["quantized_output"] == "17 * 24 = 336"
