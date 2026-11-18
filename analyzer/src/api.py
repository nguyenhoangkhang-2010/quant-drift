"""FastAPI endpoints for the analyzer."""

import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .drift_detector import DriftDetector
from .classifier import DriftType
from .statistics import compute_task_stats, generate_recommendations
from .verifiers.semantic_verifier import SemanticVerifier


@asynccontextmanager
async def lifespan(_: FastAPI):
    threading.Thread(target=lambda: SemanticVerifier().model, daemon=True).start()
    yield


app = FastAPI(title="QuantDrift Analyzer", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_DIR = Path(os.environ.get("RESULTS_DIR", "results"))


def _serialize_drift(d):
    data = asdict(d)
    data["drift_type"] = d.drift_type.value
    return data


def _get_model_dir(model: str) -> Path:
    model_dir = RESULTS_DIR / model
    if not model_dir.exists():
        raise HTTPException(404, f"Model '{model}' not found in results")
    return model_dir


def _non_baseline_configs(model_dir: Path) -> list[str]:
    return sorted(f.stem for f in model_dir.glob("*.json") if f.stem != "fp16")


@app.get("/api/models")
def list_models():
    if not RESULTS_DIR.exists():
        return {"models": []}
    models = [d.name for d in RESULTS_DIR.iterdir() if d.is_dir()]
    return {"models": sorted(models)}


@app.get("/api/models/{model}/configs")
def list_configs(model: str):
    model_dir = _get_model_dir(model)
    configs = [f.stem for f in model_dir.glob("*.json")]
    return {"configs": sorted(configs)}


@app.get("/api/models/{model}/drift/{config}")
def get_drift(model: str, config: str):
    model_dir = _get_model_dir(model)
    detector = DriftDetector(model_dir)
    drifts = detector.detect(config)

    return {
        "model": model,
        "config": config,
        "baseline": "fp16",
        "total": len(drifts),
        "summary": {
            "no_drift": sum(1 for d in drifts if d.drift_type == DriftType.NO_DRIFT),
            "benign": sum(1 for d in drifts if d.drift_type == DriftType.BENIGN),
            "dangerous": sum(1 for d in drifts if d.drift_type == DriftType.DANGEROUS),
        },
        "drifts": [_serialize_drift(d) for d in drifts],
    }


@app.get("/api/models/{model}/heatmap")
def get_heatmap(model: str):
    model_dir = _get_model_dir(model)
    detector = DriftDetector(model_dir)
    configs = _non_baseline_configs(model_dir)
    heatmap = []

    for config in configs:
        drifts = detector.detect(config)
        stats = compute_task_stats(drifts)
        for stat in stats:
            heatmap.append({
                "config": config,
                "category": stat.category,
                "drift_rate": stat.drift_rate,
                "dangerous_rate": stat.dangerous_rate,
                "total": stat.total,
            })

    return {"model": model, "baseline": "fp16", "heatmap": heatmap}


@app.get("/api/models/{model}/recommendations")
def get_recommendations(model: str):
    model_dir = _get_model_dir(model)
    detector = DriftDetector(model_dir)
    configs = _non_baseline_configs(model_dir)
    all_stats = []

    for config in configs:
        drifts = detector.detect(config)
        all_stats.extend(compute_task_stats(drifts))

    recommendations = generate_recommendations(all_stats)
    return {"model": model, "recommendations": recommendations}


@app.get("/api/models/{model}/examples/{config}")
def get_examples(
    model: str,
    config: str,
    category: str | None = None,
    drift_type: str | None = None,
):
    model_dir = _get_model_dir(model)
    detector = DriftDetector(model_dir)
    drifts = detector.detect(config)

    if category:
        drifts = [d for d in drifts if d.category == category]
    if drift_type:
        drifts = [d for d in drifts if d.drift_type.value == drift_type]

    examples = [_serialize_drift(d) for d in drifts[:50]]
    return {"model": model, "config": config, "examples": examples}
