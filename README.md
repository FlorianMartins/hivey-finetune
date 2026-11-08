# hivey-finetune

The local models of [Hivey Browser](https://github.com/FlorianMartins/hivey-browser)'s agent: how they are
trained, and the tests that decide whether one ships. The agent runs through the real code of
[HiveyAI-Sidebar](https://github.com/FlorianMartins/HiveyAI-Sidebar), on a simulated web where every answer is
checked against facts (what was submitted, visited, paid, played), never by a judge model.

## What ships

| Machine | Model | 30-task bench | Final test (12 unseen tasks) |
|---|---|---|---|
| 16 GB of RAM or more | Qwen3.6 35B-A3B, Unsloth UD-IQ2_M (11.5 GB, MoE, 3B active) | 27, 28, 30 | 12, 12, 12 |
| Less | **Hivey agent 4B** (this repo, release `models-1`, 2.7 GB) | 26, 24, 27 | 11, 11, 12 |
| For reference | Qwen3.8 27B, dense (12.2 GB) | 29, 30, 30 | 11, 12, 11 |
| For reference | Qwen3.5 4B, untouched | 23, 25, 21 | 10, 11, 10 |

Three runs at once each, RTX 3090, with the browser's agent tools. The final test is `heldout3.mjs`; three of its
checks rejected right answers (an outdated source cited as such, a price of another product near the word), and
the scores above count them right (`rescore3.py`; the test file itself was not changed after it was opened).

## What was learned

- Moving the work into the browser (pages with their actions, whole forms in one call, web search with
  sources, a short prompt) gave more than any training: the 27B went from ~80 s to ~15 s a task.
- A model trained on scripted conversations only learns them by heart (12/12 on similar tasks, worse on the
  bench). Conversations solved by a large model, kept only when the world's own check passes, transfer.
- More of the same data, or harder generated worlds, did not move the bench further (`ft5`, `ft6`).
- Pruning a MoE's least-used experts collapses it (keep 50 %: 10/30); compressing every expert harder does not
  (2-bit: 27 to 30/30). On a CPU the MoE writes as fast as the 4B (3B active parameters).
- On a CPU the time goes into writing (11-13 tokens/s), not reading: the prompt cache already works.

## Layout

| | |
|---|---|
| `families*.mjs`, `gen.mjs` | generated worlds, scripted experts, the conversations they produce |
| `teacher*.sh`, `self_play.sh`, `hard*.sh` | a model solves generated worlds; passed conversations are kept |
| `prepare.py`, `train.py`, `trial.sh` | the exact prompts the browser sends, LoRA, merge, GGUF, measure |
| `heldout*.mjs`, `frozen.sha256` | the tests; frozen before the work they judge |
| `measure.sh`, `bench30.sh`, `speed.sh` | three runs at once; the sidebar's own bench; one user at a time on a CPU |
| `moe_*.py`, `prune*.sh`, `moe_quants.sh` | the MoE: routing statistics, pruning, quantisations |

`setup.sh` fetches the sidebar, the training tools, llama.cpp's tools and the base model. The scripts run on one
machine with a 24 GB card and expect `llama-server` in `/opt/llm/llama.cpp/build/bin`.

## Licence

Code: MIT. The models are derived from Qwen3.5 4B, Apache 2.0, © Qwen team, Alibaba Cloud.
