"""Load quantization config from YAML."""

from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class QuantConfig:
    name: str
    backend: str
    model_name: str
    model_path: str | None
    quantization: str
    dtype: str
    device: str
    n_ctx: int = 4096
    n_gpu_layers: int = -1
    extra: dict = field(default_factory=dict)


def load_config(config_path: Path, model_name: str) -> QuantConfig:
    with open(config_path) as f:
        raw = yaml.safe_load(f)

    model_path = raw.get("model_path", "").format(model=model_name)

    known_keys = {"name", "backend", "model_path", "quantization", "dtype", "device", "n_ctx", "n_gpu_layers"}
    extra = {k: v for k, v in raw.items() if k not in known_keys}

    return QuantConfig(
        name=raw["name"],
        backend=raw["backend"],
        model_name=model_name,
        model_path=model_path if model_path else None,
        quantization=raw.get("quantization", "none"),
        dtype=raw.get("dtype", "float16"),
        device=raw.get("device", "auto"),
        n_ctx=raw.get("n_ctx", 4096),
        n_gpu_layers=raw.get("n_gpu_layers", -1),
        extra=extra,
    )
