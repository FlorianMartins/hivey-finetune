#!/usr/bin/env node
// Runs each expert through the extension's REAL agent code, with the model replaced by the expert's
// next step: system prompt, tools, page block and tool results are what a model would really get.
// Keeps a conversation only if the world's own check passes. No model, no card.
//   node gen.mjs --out data/expert.jsonl [--scale 1] [--seed 1]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { FORBIDDEN, rng } from "./families.mjs";
import { FAMILIES2 as FAMILIES } from "./families2.mjs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const HERE = dirname(new URL(import.meta.url).pathname);
const OUT = arg("out", `${HERE}/data/expert.jsonl`);
const SCALE = Number(arg("scale", "1"));
const lib = (f) => import(`${HERE}/sidebar/src/lib/${f}`);
const conversation = await lib("conversation.js");
const storage = await lib("storage.js");
(await lib("i18n.js")).setLang("fr");
const DEFAULTS = storage.DEFAULTS || storage.DEFAULT_SETTINGS || {};
const settings = {
  ...DEFAULTS, provider: "custom", models: { ...(DEFAULTS.models || {}), custom: "expert" }, baseUrls: { ...(DEFAULTS.baseUrls || {}), custom: "http://expert.invalid/v1" },
  responseLang: "Auto", blockPayments: true, compressHistory: true, cleanContext: true, maxPageChars: DEFAULTS.maxPageChars || 12000, thinkLevel: "none",
};

const lastToolText = (messages) => {
  const last = messages[messages.length - 1];
  if (last.role !== "tool" && last.role !== "user") return "";
  return typeof last.content === "string" ? last.content : JSON.stringify(last.content);
};

function sse(delta) {
  const lines = [{ choices: [{ index: 0, delta, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: delta.tool_calls ? "tool_calls" : "stop" }] }];
  return new Response(lines.map((l) => `data: ${JSON.stringify(l)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
}

let current = null;
let callId = 0;
globalThis.fetch = async (url, opts = {}) => {
  const body = JSON.parse(opts.body);
  if (!body.tools?.length) throw new Error("a request without tools: not a step of the agent");
  const step = current.steps[current.at++];
  if (!step) throw new Error("the expert has no step left");
  const next = step(lastToolText(body.messages));
  current.request = body;
  if (next.say !== undefined) {
    current.reply = { role: "assistant", content: next.say };
    return sse({ content: next.say });
  }
  const args = JSON.stringify(next.args);
  const id = `call_${++callId}`;
  current.reply = { role: "assistant", content: "", tool_calls: [{ id, type: "function", function: { name: next.tool, arguments: args } }] };
  return sse({ tool_calls: [{ index: 0, id, type: "function", function: { name: next.tool, arguments: args } }] });
};

const counts = {};
const failed = {};
const lines = [];
const r = rng(Number(arg("seed", "1")));
for (const [family, howMany] of FAMILIES) {
  for (let i = 0; i < howMany * SCALE; i++) {
    const task = { tab: "agent", ...family(r) };
    const browser = task.world();
    browser.observe = true;
    current = { steps: task.steps, at: 0 };
    let note = "";
    try {
      const out = await conversation.benchTurns({ task, settings, browser, page: browser.activePage(), signal: new AbortController().signal, thinkLevel: "none", lean: true });
      const answer = (out.answers || []).at(-1) || "";
      const verdict = task.check({ answer, answers: out.answers, browser });
      if (!verdict.pass) note = `check: ${verdict.why}`;
      else if (current.at !== task.steps.length) note = "steps left";
    } catch (e) {
      note = String(e.message || e).slice(0, 120);
    }
    if (note) {
      const key = `${task.family}: ${note}`;
      failed[key] = (failed[key] || 0) + 1;
      continue;
    }
    const text = JSON.stringify({ family: task.family, messages: [...current.request.messages, current.reply], tools: current.request.tools });
    if (FORBIDDEN.test(JSON.stringify([...current.request.messages, current.reply].filter((m) => m.role !== "system")))) {
      failed[`${task.family}: names something of the held-out set`] = (failed[`${task.family}: names something of the held-out set`] || 0) + 1;
      continue;
    }
    lines.push(text);
    counts[task.family] = (counts[task.family] || 0) + 1;
  }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n") + "\n");
console.log("kept", lines.length, counts);
if (Object.keys(failed).length) console.log("dropped", failed);
