import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import fetch from "node-fetch";

const DOWNLOAD_DIR = "/data/downloads";
const STATE_FILE = "/data/downloads_state.json";

let tasks = new Map();
let activeCount = 0;
let options = { max_speed: 500000, max_concurrent: 3 };

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

try {
  const saved = JSON.parse(fs.readFileSync(STATE_FILE));
  for (const t of saved) {
    tasks.set(t.id, t);
    if (t.status === "downloading") t.status = "queued";
  }
} catch { }

function persistState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify([...tasks.values()], null, 2));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function throttle(downloaded, maxSpeed, startTime) {
  const expected = (downloaded / maxSpeed) * 1000;
  const elapsed = Date.now() - startTime;
  if (expected > elapsed) 
    await sleep(expected - elapsed);
}

export function setOptions(o) { options = { ...options, ...o }; }

export function createDownload({ url, filename }) {
  const id = randomUUID();
  const task = { id, url, filename, status: "queued", downloaded: 0, total: 0, controller: null, startTime: null };
  tasks.set(id, task); 
  persistState(); 
  processQueue(); 
  return id;
}

export function getTask(id) {
  return tasks.get(id);
}
export function pause(id) {
  const t = tasks.get(id); if (!t) return; t.status = "paused"; t.controller?.abort(); persistState();
}
export function resume(id) {
  const t = tasks.get(id); if (!t) return; if (t.status !== "done") { t.status = "queued"; processQueue(); }
}
export function cancel(id) {
  const t = tasks.get(id); if (!t) return; t.status = "cancelled"; t.controller?.abort(); persistState();
}

async function processQueue() {
  for (const task of [...tasks.values()].filter(t => t.status === "queued")) {
    if (activeCount >= options.max_concurrent)
      break;
    activeCount++; task.status = "downloading"; task.startTime = Date.now(); persistState();
    runTask(task).finally(() => {
      activeCount--; persistState(); processQueue();
    });
  }
}

async function runTask(task) {
  const controller = new AbortController();
  task.controller = controller;
  const filePath = path.join(DOWNLOAD_DIR, task.filename);
  const start = task.downloaded;

  const res = await fetch(task.url, { headers: start ? { Range: `bytes=${start}-` } : {}, signal: controller.signal });
  const len = res.headers.get("content-length");
  if (len)
    task.total = parseInt(len) + start;

  const stream = fs.createWriteStream(filePath, { flags: start ? "a" : "w" });
  for await (const chunk of res.body) {
    if (task.status !== "downloading")
      break;
    stream.write(chunk);
    task.downloaded += chunk.length;
    await throttle(task.downloaded, options.max_speed, task.startTime);
    persistState();
  }
  stream.close();
  if (task.status === "downloading")
    task.status = "done";
  persistState();
}
