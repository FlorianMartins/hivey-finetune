#!/bin/bash
# The MoE: its GGUF to measure, its full weights to prune. Network and disk only, not the card.
cd /root/projects/hivey-finetune || exit 1
venv/bin/hf download unsloth/Qwen3.6-35B-A3B-GGUF Qwen3.6-35B-A3B-UD-Q4_K_M.gguf --local-dir /root/projects/hivey-local-ai-cache/models 2>&1 | tail -1 | cut -c1-120
ls -la /root/projects/hivey-local-ai-cache/models/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf | cut -c25-140
venv/bin/hf download Qwen/Qwen3.6-35B-A3B --local-dir base/Qwen3.6-35B-A3B 2>&1 | tail -1 | cut -c1-120
du -sh base/Qwen3.6-35B-A3B
python3 -c "import json; c=json.load(open('base/Qwen3.6-35B-A3B/config.json')); t=c.get('text_config', c); print({k: t.get(k) for k in ('num_experts','num_experts_per_tok','num_hidden_layers','moe_intermediate_size','hidden_size','shared_expert_intermediate_size')})"
