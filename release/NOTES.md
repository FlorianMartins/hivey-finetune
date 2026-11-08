Model files downloaded by Hivey Browser's local AI. Not a browser release.

**Hivey agent 4B** (`hivey-agent-4b-Q4_K_M`, two parts, loaded together by llama.cpp from the first one): Qwen3.5 4B (Apache 2.0, © Qwen team, Alibaba Cloud), fine-tuned with LoRA for the browser's agent on conversations solved by Qwen3.8 27B and scripted ones, then quantised to Q4_K_M.

Measured with the browser's tools, three runs each, RTX 3090:
- 30-task bench: 26, 24, 27 (the original 4B: 23, 25, 21)
- 12 unseen agent tasks (web answers, sources, forms, music): 11, 11, 12 (the original 4B: 10, 11, 10; Qwen3.8 27B: 11, 12, 11)

| File | Bytes | SHA-256 |
|---|---|---|
| hivey-agent-4b-Q4_K_M-00001-of-00002.gguf | 1803653824 | b792449bc5b4791c14111b7232d8da9994a8b994ad9e47ad61e74ce358c0fd75 |
| hivey-agent-4b-Q4_K_M-00002-of-00002.gguf | 905150464 | c71a863904cae09d34620789da578b8dabbf678c40a5c0d9cb46ec9199d3e9f1 |
