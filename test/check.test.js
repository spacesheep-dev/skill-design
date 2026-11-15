// check.js on a folder made here: no network, no space. Run with `node --test test/check.test.js`.
// A live push that changes a script runs the page's scripts again in the same tab. A name a script declares
// at its top with const, let or class is then declared twice, and the browser skips that whole script.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const CHECK = path.join(__dirname, "..", "design", "assets", "check.js");
const BASE = fs.readFileSync(path.join(__dirname, "..", "design", "assets", "base.html"), "utf8");
const SAID = "at its top (const, let or class)";

// check.js's lines about scripts a second run would stop, for direction "first" with one part holding these
// scripts. A script whose code ran would hang check.js (see the loop below), so a timeout fails the test.
function secondRun(...scripts) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "check-test-"));
  try {
    fs.mkdirSync(path.join(folder, "work"));
    fs.mkdirSync(path.join(folder, "draw", "first"), { recursive: true });
    fs.writeFileSync(path.join(folder, "work", "index.html"), BASE);
    fs.writeFileSync(path.join(folder, "draw", "first", "01.html"),
      "<!-- status: First: script -->\n" + scripts.map((s) => `<script>\n${s}\n</script>`).join("\n"));
    const r = spawnSync(process.execPath, [CHECK, "-C", folder, "first"], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.error, undefined, `check.js didn't finish: ${r.error}`);
    return r.stdout.split("\n").filter((l) => l.includes(SAID));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

test("a script that declares a name at its top with const, let or class is flagged, with the name", () => {
  for (const [src, name] of [["const rows = [];", "rows"], ["let open = false;", "open"], ["class Row {}", "Row"]]) {
    const lines = secondRun(src);
    assert.equal(lines.length, 1, `${src}: ${lines.join(" | ") || "not flagged"}`);
    assert.match(lines[0], new RegExp(`declares "${name}" ${SAID.replace(/[()]/g, "\\$&")}`));
    assert.match(lines[0], /draw\/first\/01\.html:\d+/);
  }
});

test("names inside a function, an arrow or a block pass, and so do top-level functions and var", () => {
  assert.deepEqual(secondRun(
    "(() => { const rows = []; let n = 0; class Row {} })();",
    "{ const a = 1; let b = 2; }",
    "function draw() { const c = 3; } var v = 1; if (window.x) { const y = 1; }",
    "ssDraw(() => { const list = document.querySelector('ul'); });",
  ), []);
});

test("none of a script's code runs: an endless loop before its const doesn't hang the check", () => {
  const lines = secondRun("while (true) {}\nconst z = 1;");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /declares "z"/);
});

test("every script in the starter runs a second time in the same tab", () => {
  const scripts = [...BASE.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  assert.ok(scripts.length >= 2, "the starter's scripts weren't found");
  assert.deepEqual(secondRun(...scripts), []);
});

test("the starter's controls as v1.2.4 had them are flagged: this is the script that left the tabs bar empty", () => {
  const lines = secondRun("const ssControls = () => [...document.querySelectorAll('.tweaks input[data-var]')].slice(0, 6);\nconst ssStep = (i) => i.dataset.kind === 'switch';");
  assert.equal(lines.length, 1); // one line per script: the second run stops at its first name
  assert.match(lines[0], /declares "ssControls"/);
});

// check.js's lines about the Decisions log, for the starter with this log before </body>.
function decisions(log) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "check-test-"));
  try {
    fs.mkdirSync(path.join(folder, "work"));
    fs.writeFileSync(path.join(folder, "work", "index.html"), BASE.replace("</body>", `${log}\n</body>`));
    const r = spawnSync(process.execPath, [CHECK, "-C", folder], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.error, undefined, `check.js didn't finish: ${r.error}`);
    return r.stdout.split("\n").filter((l) => l.includes("Decisions log"));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

test("a Decisions log the canvas would draw over the first frame is flagged, with its line", () => {
  for (const log of [
    '<details class="no-print" data-ss-id="decisions"><summary>Decisions</summary><p>15 Nov, v4: picked Big Eighteen</p></details>',
    '<details class="no-print" data-ss-id="decisions" style="display:none"><summary>Decisions</summary></details>',
    '<details class="no-print" data-ss-id="decisions" data-ss-canvas="pin"><summary>Decisions</summary></details>',
    // read as the browser reads the tag: spaces around "=", the display that wins, a ">" in a quoted value
    '<details data-ss-id = "decisions"><summary>Decisions</summary></details>',
    '<details data-ss-id="decisions" data-ss-canvas="pin" style="display:none;display:block"><summary>Decisions</summary></details>',
    '<details data-ss-id="decisions" data-ss-canvas="pin" style="display:block !important; display:none"><summary>Decisions</summary></details>',
    '<details title="a > b" data-ss-id=decisions data-ss-canvas=pin><summary>Decisions</summary></details>',
    '<details data-ss-id="decisions" data-ss-canvas="PIN" style="display:none"><summary>Decisions</summary></details>', // the canvas matches "pin" exactly
  ]) {
    const lines = decisions(log);
    assert.equal(lines.length, 1, `${log}: ${lines.join(" | ") || "not flagged"}`);
    assert.match(lines[0], /work\/index\.html:\d+/);
  }
});

test("a Decisions log pinned off the canvas and out of sight passes, and so does a page without one", () => {
  assert.deepEqual(decisions('<details class="no-print" data-ss-id="decisions" data-ss-canvas="pin" style="display:none"><summary>Decisions</summary><p>15 Nov, v4: picked Big Eighteen</p></details>'), []);
  assert.deepEqual(decisions(""), []);
  for (const log of [
    '<details class="no-print" data-ss-id = "decisions" data-ss-canvas = \'pin\' style = "display: block; display : none"><summary>Decisions</summary></details>',
    '<details data-ss-id=decisions data-ss-canvas=pin style="display:none !important; display:block"><summary>Decisions</summary></details>',
  ]) assert.deepEqual(decisions(log), [], log);
});

test("the starter's switcher writes the address only when a tab is clicked, never on its own at load", () => {
  const SWITCHER = fs.readFileSync(path.join(__dirname, "..", "design", "assets", "switcher.html"), "utf8");
  for (const [name, src] of [["base.html", BASE], ["switcher.html", SWITCHER]]) {
    const writes = src.split("\n").filter((l) => /history\.(replaceState|pushState)|location\.hash\s*=/.test(l));
    assert.equal(writes.length, 1, `${name}: ${writes.join(" | ")}`);
    assert.match(writes[0], /addEventListener\('click'/, `${name}: ${writes[0]}`);
  }
});
