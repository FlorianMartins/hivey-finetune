#!/bin/bash
# trial.sh <name> [learning rate] [max samples]: train, convert, quantize as the browser's file, measure on the held-out tasks.
cd /root/projects/hivey-finetune || exit 1
NAME=$1; LR=${2:-2e-4}; LIMIT=${3:-2400}
mkdir -p models
sha256sum -c frozen.sha256 || { echo "THE TEST CHANGED"; exit 1; }
venv/bin/python train.py ${DATA:-data/prepared-lean} "models/$NAME" "$LR" "$LIMIT" > "models/$NAME.train.log" 2>&1
tail -6 "models/$NAME.train.log" | cut -c1-120
[ -f "models/$NAME/merged/config.json" ] || { echo "TRAINING FAILED"; exit 1; }
cp base/Qwen3.5-4B/chat_template.jinja "models/$NAME/merged/" 2>/dev/null
venv/bin/python /opt/llm/llama.cpp/convert_hf_to_gguf.py "models/$NAME/merged" --outtype f16 --outfile "models/$NAME/f16.gguf" 2>&1 | tail -1 | cut -c1-120
LD_LIBRARY_PATH=llama-build/bin llama-build/bin/llama-quantize "models/$NAME/f16.gguf" "models/$NAME/Q4_K_M.gguf" Q4_K_M 2>&1 | tail -1 | cut -c1-120
ls -la "models/$NAME/Q4_K_M.gguf" | cut -c25-120
rm -f "models/$NAME/f16.gguf"
bash measure.sh "$PWD/models/$NAME/Q4_K_M.gguf" "$NAME" ${MEASURE_TASKS:-heldout.mjs} --lean
