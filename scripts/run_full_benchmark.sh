#!/usr/bin/env bash
# Download a GGUF model and benchmark it at FP16, INT8 (Q8_0) and INT4 (Q4_K_M) on CPU.
# Usage: bash scripts/run_full_benchmark.sh [model-name]   (default: qwen2.5-1.5b)
set -euo pipefail

MODEL="${1:-qwen2.5-1.5b}"

echo "=== QuantDrift Full Benchmark ==="
echo "Model: $MODEL"
echo ""

python scripts/download_gguf.py "$MODEL"

python -m runner.src.benchmark \
    --model "$MODEL" \
    --prompts prompts/ \
    --configs configs/gguf \
    --output results \
    --temperature 0.0 \
    --seed 42 \
    --max-tokens 512

echo ""
echo "=== Benchmark complete ==="
echo "Results in: results/$MODEL/"
echo "View them: uvicorn analyzer.src.api:app --port 8000, then npm run dev in dashboard/"
