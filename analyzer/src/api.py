"""FastAPI endpoints for the analyzer."""

from pathlib import Path
from dataclasses import asdict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .drift_detector import DriftDetector
from .classifier import DriftType
from .statistics import compute_task_stats, generate_recommendations

app = FastAPI(title="QuantDrift Analyzer", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_DIR = Path("results")


@app.get("/api/models")
def list_models():
    """List available model result directories."""
    if not RESULTS_DIR.exists():
        return {"models": []}
    models = [d.name for d in RESULTS_DIR.iterdir() if d.is_dir()]
    return {"models": sorted(models)}


@app.get("/api/models/{model}/configs")
def list_configs(model: str):
    """List available configs for a model."""
    model_dir = RESULTS_DIR / model
    if not model_dir.exists():
        return {"configs": []}
    configs = [f.stem for f in model_dir.glob("*.json")]
    return {"configs": sorted(configs)}


@app.get("/api/models/{model}/drift/{config}")
def get_drift(model: str, config: str):
    """Get drift analysis for a specific config vs baseline."""
    detector = DriftDetector(RESULTS_DIR / model)
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
        "drifts": [asdict(d) for d in drifts],
    }


@app.get("/api/models/{model}/heatmap")
def get_heatmap(model: str):
    """Get drift heatmap: task × config matrix."""
    detector = DriftDetector(RESULTS_DIR / model)
    model_dir = RESULTS_DIR / model

    configs = [f.stem for f in model_dir.glob("*.json") if f.stem != "fp16"]
    heatmap = []

    for config in sorted(configs):
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
    """Get per-task recommendations."""
    detector = DriftDetector(RESULTS_DIR / model)
    model_dir = RESULTS_DIR / model

    configs = [f.stem for f in model_dir.glob("*.json") if f.stem != "fp16"]
    all_stats = []

    for config in sorted(configs):
        drifts = detector.detect(config)
        all_stats.extend(compute_task_stats(drifts))

    recommendations = generate_recommendations(all_stats)
    return {"model": model, "recommendations": recommendations}


@app.get("/api/models/{model}/examples/{config}")
def get_examples(model: str, config: str, category: str | None = None, drift_type: str | None = None):
    """Get specific drift examples, optionally filtered."""
    detector = DriftDetector(RESULTS_DIR / model)
    drifts = detector.detect(config)

    if category:
        drifts = [d for d in drifts if d.category == category]
    if drift_type:
        drifts = [d for d in drifts if d.drift_type.value == drift_type]

    examples = [asdict(d) for d in drifts[:50]]
    return {"model": model, "config": config, "examples": examples}
