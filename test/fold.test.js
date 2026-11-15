// fold.js against a stand-in spacesheep CLI: no network, no space. Run with `node --test test/fold.test.js`.
// The stand-in logs every call (one JSON array of its arguments a line) and answers as the CLI does.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const FOLD = path.join(__dirname, "..", "design", "assets", "fold.js");
const BASE = fs.readFileSync(path.join(__dirname, "..", "design", "assets", "base.html"), "utf8");
const SPACE = "11111111-2222-4333-8444-555555555555";

const CLI = `#!/usr/bin/env node
const fs = require("fs"), path = require("path");
const a = process.argv.slice(2), dir = process.env.FAKE_DIR;
fs.appendFileSync(path.join(dir, "calls.log"), JSON.stringify(a) + "\\n");
if (a[0] === "call") { fs.readFileSync(0); process.exit(0); }
if (a[0] === "deploy" && a.includes("--json")) {
  fs.writeFileSync(path.join(dir, "first.html"), fs.readFileSync("work/index.html"));
  console.log(JSON.stringify({ space: { id: "${SPACE}", url: "https://stage.test/s" } }));
  process.exit(0);
}
if (a[0] === "deploy" && process.env.FAKE_REFUSE) {
  const n = fs.statSync("work/index.html").size;
  console.error("= index.html unchanged");
  console.error("↑ index.html (" + n + " bytes)");
  console.error("✗ index.html would shrink from 38318 to " + n + " bytes (90% smaller), which looks like a page lost rather than a page edited. Nothing was published; the space keeps its current version. To publish this smaller page on purpose, send the same call again with drop_files: true.");
  process.exit(1);
}
if (a[0] === "deploy") { console.log("✓ Updated https://stage.test/s"); process.exit(0); }
process.exit(0);
`;

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fold-test-"));
  const bin = path.join(root, "bin"), folder = path.join(root, "folder");
  fs.mkdirSync(bin);
  fs.mkdirSync(folder);
  fs.writeFileSync(path.join(bin, "spacesheep"), CLI, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_DIR: root };
  const fold = (args, more = {}) => spawnSync(process.execPath, [FOLD, "-C", folder, ...args], { env: { ...env, ...more }, encoding: "utf8", timeout: 120000 });
  const calls = () => fs.readFileSync(path.join(root, "calls.log"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  return { root, folder, fold, calls };
}

test("a new space's first version is a page under 2 KB, and the starter waits in work/", () => {
  const { root, folder, fold } = setup();
  const r = fold(["start", "--new", "Lift <out of service>"]);
  assert.equal(r.status, 0, r.stderr);
  const first = fs.readFileSync(path.join(root, "first.html"), "utf8");
  assert.ok(Buffer.byteLength(first) < 2048, `first version is ${Buffer.byteLength(first)} bytes`);
  assert.match(first, /<title>Lift &lt;out of service&gt;<\/title>/);
  assert.match(first, /<meta name="ss-chat"/);
  // Not a design, so `start <link>` on it later puts the starter in work/.
  assert.doesNotMatch(first, /data-ss-id|class="direction/);
  assert.equal(fs.readFileSync(path.join(folder, "work", "index.html"), "utf8"), BASE);
  assert.equal(fs.readFileSync(path.join(folder, "draw", "space"), "utf8").trim(), SPACE);
});

test("a refused save ends 'save refused' with the reason and the instruction to stop, not the refusal's advice", () => {
  const { folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Notice"]).status, 0);
  fs.writeFileSync(path.join(folder, "work", "index.html"), "<!DOCTYPE html><title>Notice</title><p>The lift is out of service.</p>");
  assert.equal(fold(["save", "Notice", "Saving the notice"], { FAKE_REFUSE: "1" }).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 1, "wait must fail on a refused save");
  const last = w.stdout.trim().split("\n").pop();
  assert.match(last, /^\d\d:\d\d:\d\d save refused: index\.html would shrink from 38318 to \d+ bytes/);
  assert.match(last, /Nothing was published; the space keeps its current version\./);
  assert.match(last, /Publish no other way \(no create_version, deploy or upload\).*Tell the person in one line why, and stop$/);
  assert.doesNotMatch(last, /drop_files|unchanged|↑/);
});

test("the writer sends a part's status before the page", () => {
  const { folder, fold, calls } = setup();
  assert.equal(fold(["start", "--new", "Notice"]).status, 0);
  fs.writeFileSync(path.join(folder, "work", "index.html"),
    '<!DOCTYPE html><title>Notice</title><section class="direction" data-ss-id="direction-lift"><!-- part:lift --><p>Drawing</p><!-- /part:lift --></section>');
  fs.mkdirSync(path.join(folder, "draw", "lift"));
  fs.writeFileSync(path.join(folder, "draw", "lift", "01.html"), '<!-- status: Lift: the dates -->\n<p data-ss-id="lift-dates">The lift is out of service from 18 to 20 November.</p>\n');
  spawnSync("sleep", ["0.5"]); // older than the 300 ms a part waits, so the first pass folds it
  assert.equal(fold(["write"]).status, 0);
  const s = fold(["stop"]);
  assert.equal(s.status, 0, s.stdout + s.stderr);
  const log = calls();
  const status = log.findIndex((a) => a[0] === "live" && a.includes("Lift: the dates"));
  const page = log.findIndex((a, i) => i > log.findIndex((b) => b[0] === "live" && b.includes("Reading your brief")) && a[0] === "call" && a[1] === "push_live");
  assert.ok(status >= 0, "the part's status was pushed");
  assert.ok(page >= 0, "the page was pushed");
  assert.ok(status < page, `status was call ${status}, page call ${page}`);
});
