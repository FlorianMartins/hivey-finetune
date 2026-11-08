#!/bin/bash
# What the scripts expect next to them: the sidebar the tasks run through, the training tools,
# llama.cpp's quantize and split tools, and the base model.
#   SIDEBAR_REF: the HiveyAI-Sidebar commit to test (main by default).
#   LLAMA_CPP: a llama.cpp checkout (its server runs the models).
set -euo pipefail
cd "$(dirname "$0")"
git clone -q https://github.com/FlorianMartins/HiveyAI-Sidebar.git sidebar 2>/dev/null || true
git -C sidebar fetch -q origin
git -C sidebar checkout -q "${SIDEBAR_REF:-origin/main}"
python3 -m venv venv
venv/bin/pip install -q -r requirements.txt
LLAMA_CPP=${LLAMA_CPP:-/opt/llm/llama.cpp}
cmake -S "$LLAMA_CPP" -B llama-build -DCMAKE_BUILD_TYPE=Release -DGGML_CUDA=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_SERVER=OFF > /dev/null
cmake --build llama-build --target llama-quantize llama-gguf-split -j "$(nproc)" > /dev/null
venv/bin/hf download Qwen/Qwen3.5-4B --local-dir base/Qwen3.5-4B
sha256sum -c frozen.sha256
