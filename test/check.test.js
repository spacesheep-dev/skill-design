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
