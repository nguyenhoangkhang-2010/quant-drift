#!/usr/bin/env bash
set -euo pipefail

MODEL_ID="${1:-meta-llama/Meta-Llama-3.1-8B-Instruct}"
OUTPUT_DIR="${2:-models}"

echo "Downloading model: $MODEL_ID"
echo "Output directory: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

if command -v huggingface-cli &> /dev/null; then
    huggingface-cli download "$MODEL_ID" --local-dir "$OUTPUT_DIR/$(basename "$MODEL_ID")"
else
    echo "Error: huggingface-cli not found. Install with: pip install huggingface_hub[cli]"
    exit 1
fi

echo "Done. Model saved to $OUTPUT_DIR/$(basename "$MODEL_ID")"
