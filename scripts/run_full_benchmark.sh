#!/usr/bin/env bash
set -euo pipefail

MODEL="${1:-meta-llama/Meta-Llama-3.1-8B-Instruct}"
OUTPUT_DIR="results/$(basename "$MODEL")"

mkdir -p "$OUTPUT_DIR"

echo "=== QuantDrift Full Benchmark ==="
echo "Model: $MODEL"
echo "Output: $OUTPUT_DIR"
echo ""

for config in configs/*.yaml; do
    config_name=$(basename "$config" .yaml)
    echo "--- Running config: $config_name ---"

    python -m runner.src.benchmark \
        --model "$MODEL" \
        --prompts prompts/ \
        --configs "$config" \
        --output "$OUTPUT_DIR/${config_name}.json" \
        --temperature 0.0 \
        --seed 42 \
        --max-tokens 512

    echo "Saved: $OUTPUT_DIR/${config_name}.json"
    echo ""
done

echo "=== Benchmark complete ==="
echo "Results in: $OUTPUT_DIR/"
echo "Start the analyzer: docker compose up analyzer dashboard"
