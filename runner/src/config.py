"""Load quantization config from YAML."""

from dataclasses import dataclass
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


def load_config(config_path: Path, model_name: str) -> QuantConfig:
    with open(config_path) as f:
        raw = yaml.safe_load(f)

    model_path = raw.get("model_path", "").format(model=model_name)

    return QuantConfig(
        name=raw["name"],
        backend=raw["backend"],
        model_name=model_name,
        model_path=model_path if model_path else None,
        quantization=raw.get("quantization", "none"),
        dtype=raw.get("dtype", "float16"),
        device=raw.get("device", "auto"),
    )
