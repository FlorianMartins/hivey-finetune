#!/usr/bin/env node
// Runs a set of tasks through the extension's real agent code, the way scripts/bench.mjs does.
//   node run.mjs --tasks heldout.mjs --url http://127.0.0.1:18770/v1 --as NAME [--jobs 1] [--capture FILE]
// --capture appends, for each task that passes, the exact conversation the model had: what training reads.
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const HERE = dirname(new URL(import.meta.url).pathname);
const LABEL = arg("as", "run");
const OUT = arg("out", `${HERE}/results/${LABEL}.json`);
const CAPTURE = arg("capture", "");
const JOBS = Number(arg("jobs", "1"));
const TIMEOUT_S = Number(arg("timeout", "900"));
const ONLY = (arg("only", "") || "").split(",").filter(Boolean);
const LEVEL = arg("level", "none");
const LEAN = process.argv.includes("--lean");
const lib = (f) => import(`${HERE}/sidebar/src/lib/${f}`);
const conversation = await lib("conversation.js");
const storage = await lib("storage.js");
(await lib("i18n.js")).setLang("fr");
const mod = await import(pathToFileURL(resolve(arg("tasks", "heldout.mjs"))).href);
const tasks = (mod.HELDOUT || mod.TASKS).filter((t) => !ONLY.length || ONLY.includes(t.id));

const MODEL = arg("model", "local");
const DEFAULTS = storage.DEFAULTS || storage.DEFAULT_SETTINGS || {};
const settings = {
  ...DEFAULTS, provider: "custom", models: { ...(DEFAULTS.models || {}), custom: MODEL },
  baseUrls: { ...(DEFAULTS.baseUrls || {}), custom: arg("url", "http://127.0.0.1:18770/v1") },
  responseLang: "Auto", blockPayments: true, compressHistory: true, cleanContext: true, maxPageChars: DEFAULTS.maxPageChars || 12000, thinkLevel: LEVEL,
};

// Each task runs in its own async context: its requests find it whatever signal the agent combines.
const taskOf = new AsyncLocalStorage();
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const response = await realFetch(url, opts);
  const box = taskOf.getStore();
  if (box && /chat\/completions$/.test(String(url)) && typeof opts.body === "string") {
    const body = JSON.parse(opts.body);
    box.request = { messages: body.messages, tools: body.tools };
    box.replies = (box.replies || 0) + 1;
    const text = await response.clone().text();
    box.last = text;
  }
  return response;
};

/** The last reply, from SSE or plain JSON, as one assistant message. */
function replyOf(text) {
  if (!text) return null;
  if (!text.trimStart().startsWith("data:")) {
    try { return JSON.parse(text).choices[0].message; } catch { return null; }
  }
  const message = { role: "assistant", content: "" };
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:") || line.includes("[DONE]")) continue;
    let delta;
    try { delta = JSON.parse(line.slice(5)).choices?.[0]?.delta; } catch { continue; }
    if (delta?.content) message.content += delta.content;
  }
  return message;
}

async function runTask(task) {
  const ctl = new AbortController();
  const box = taskOf.getStore();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_S * 1000);
  const started = Date.now();
  const browser = task.world();
  let out = { answers: [] };
  let error = "";
  try {
    browser.observe = LEAN;
    out = await conversation.benchTurns({ task, settings, browser, page: browser.activePage(), signal: ctl.signal, thinkLevel: LEVEL, lean: LEAN });
  } catch (e) {
    error = ctl.signal.aborted ? `timeout after ${TIMEOUT_S}s` : String(e?.message || e).slice(0, 300);
  } finally {
    clearTimeout(timer);
  }
  const answer = (out.answers || []).at(-1) || "";
  let verdict;
  try {
    verdict = error ? { pass: false, why: error } : task.check({ answer, answers: out.answers || [], browser });
  } catch (e) {
    verdict = { pass: false, why: `check failed: ${e.message}` };
  }
  if (verdict.pass && CAPTURE && box.request) {
    const final = replyOf(box.last);
    if (final) appendFileSync(CAPTURE, JSON.stringify({ id: task.id, messages: [...box.request.messages, final], tools: box.request.tools }) + "\n");
  }
  const toolLog = browser.log.filter((e) => e.type === "tool");
  return { id: task.id, pass: !!verdict.pass, why: error || (verdict.pass ? "" : verdict.why), seconds: Math.round((Date.now() - started) / 100) / 10, requests: box.replies || 0, actions: toolLog.map((e) => e.name), urls: browser.visited(), answer: answer.slice(0, 4000) };
}

const results = [];
let next = 0;
async function worker() {
  while (next < tasks.length) {
    const task = tasks[next++];
    const r = await taskOf.run({}, () => runTask(task));
    results.push(r);
    console.log(`[${r.id}] ${r.pass ? "PASS" : "FAIL"} ${r.seconds}s ${r.requests} req${r.why ? ` — ${r.why}` : ""}`);
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));
const passed = results.filter((r) => r.pass).length;
const seconds = Math.round(results.reduce((n, r) => n + r.seconds, 0));
console.log(`${LABEL}: ${passed}/${results.length} — ${seconds} s`);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ label: LABEL, passed, total: results.length, seconds, results }, null, 2));
