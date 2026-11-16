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

test("the starter's switcher writes the address only when a tab is clicked (or, on the canvas, a number key pressed), never on its own at load", () => {
  const SWITCHER = fs.readFileSync(path.join(__dirname, "..", "design", "assets", "switcher.html"), "utf8");
  for (const [name, src, keys] of [["base.html", BASE, 1], ["switcher.html", SWITCHER, 0]]) {
    const writes = src.split("\n").filter((l) => /history\.(replaceState|pushState)|location\.hash\s*=/.test(l));
    assert.equal(writes.length, 1 + keys, `${name}: ${writes.join(" | ")}`);
    // Each write is inside the listener of a person's click or key: the nearest addEventListener before it.
    const by = writes.map((w) => { const at = src.indexOf(w) + w.search(/history|location/), from = src.lastIndexOf("addEventListener(", at); return src.slice(from, from + 26); });
    assert.equal(by.filter((x) => x.startsWith("addEventListener('click'")).length, 1, `${name}: ${by.join(" | ")}`);
    assert.equal(by.filter((x) => x.startsWith("addEventListener('keydown'")).length, keys, `${name}: ${by.join(" | ")}`);
  }
});

// A device view: its own frame after its direction, data-view-of naming it, built for its own width.
function withView({ of = "first", css = "", tokens = true, place = "third" } = {}) {
  const view = `\n<section class="direction" data-view-of="${of}" data-ss-frame="phone" data-ss-section data-ss-id="direction-first-phone" data-ss-thing="direction/first/phone" data-ss-label="First · Phone" data-ss-x="0" data-ss-y="896">
  <style>${css}</style>
  <div class="first-phone-top" data-ss-id="first-phone-top"><h2>First</h2><p>On a phone.</p></div>
</section>`;
  const at = BASE.indexOf("</section>", BASE.indexOf(`data-ss-id="direction-${place}" data-ss-thing`)) + "</section>".length;
  let page = BASE.slice(0, at) + view + BASE.slice(at);
  if (tokens) page = page.replace('[data-ss-id="direction-first"]  {', '[data-ss-id="direction-first"], [data-view-of="first"] {');
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "check-test-"));
  try {
    fs.mkdirSync(path.join(folder, "work"));
    fs.writeFileSync(path.join(folder, "work", "index.html"), page);
    const r = spawnSync(process.execPath, [CHECK, "-C", folder], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.error, undefined, `check.js didn't finish: ${r.error}`);
    return r.stdout.trim().split("\n").filter((l) => !/^all pass: 3 directions, 1 view,|to fix/.test(l));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

test("a phone view that takes its direction's tokens and asks its frame's width passes", () => {
  assert.deepEqual(withView({ css: "@container (min-width: 48rem) { .first-phone-top { padding: 2rem; } } .first-phone-top h2 { font-size: clamp(2rem, 6cqi, 3rem); }" }), []);
});

test("a view without its direction's tokens, or of no direction on the page, is flagged", () => {
  const bare = withView({ tokens: false });
  assert.equal(bare.length, 1, bare.join(" | "));
  assert.match(bare[0], /^first-phone .*list \[data-view-of="first"\] beside \[data-ss-id="direction-first"\]/);
  const lost = withView({ of: "fourth" });
  assert.equal(lost.length, 1, lost.join(" | "));
  assert.match(lost[0], /data-view-of="fourth" names no direction on the page/);
});

test("a view before a direction is flagged: the canvas would number it among the directions", () => {
  const early = withView({ place: "first" });
  assert.equal(early.length, 1, early.join(" | "));
  assert.match(early[0], /^first-phone .*the view comes before 2 directions: move its section after the last direction's, so the canvas numbers the directions 1 to 3/);
});

test("the starter's switcher steps a direction's number key through its views on the canvas, and runs without tabs", () => {
  assert.match(BASE, /if \(!window\.ssViewKeys\) \{\n    window\.ssViewKeys = true;\n    addEventListener\('keydown', /);
  assert.match(BASE, /const d = all\(\)\[\+k - 1\], set = d \? \[d, \.\.\.viewsOf\(d\)\] : \[\];\n      if \(set\.length < 2\) return;/);
  assert.match(BASE, /\}, true\);/);
  assert.doesNotMatch(BASE, /if \(!tabsNow\(\)\) return;/);
});

test("a width rule on the window, or a size in vw, is flagged with the frame's way to say it", () => {
  const lines = withView({ css: "@media (min-width: 48rem) { .first-phone-top { padding: 2rem; } } @media screen and (max-width: 30rem) { .first-phone-top p { margin: 0; } } .first-phone-top h2 { font-size: clamp(2rem, 6vw, 3rem); }" });
  assert.equal(lines.length, 3, lines.join(" | "));
  assert.match(lines[0], /"@media \(min-width: 48rem\)" asks the window's width.*write it as @container \(min-width: 48rem\)/);
  assert.match(lines[1], /write it as @container \(max-width: 30rem\)/);
  assert.match(lines[2], /6vw.*use cqi/);
});

test("the starter's kit lays out at its frame's width, and its switcher makes no tab of a view", () => {
  const head = BASE.slice(0, BASE.indexOf("</head>"));
  assert.doesNotMatch(head, /@media[^{]*width/, "a kit rule still asks the window's width");
  assert.match(head, /\.direction, \[data-ss-frame\] \{ container-type: inline-size; \}/);
  assert.match(BASE, /const all = \(\) => \[\.\.\.document\.querySelectorAll\('section\.direction:not\(\[data-view-of\]\)'\)\];/);
  assert.match(BASE, /<div class="switcher-views" role="group" aria-label="Device views"><\/div>/);
});
