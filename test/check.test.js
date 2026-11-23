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

// check.js's lines about ids off direction "first"'s slug, for one part holding these blocks.
function offSlug(html) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "check-test-"));
  try {
    fs.mkdirSync(path.join(folder, "work"));
    fs.mkdirSync(path.join(folder, "draw", "first"), { recursive: true });
    fs.writeFileSync(path.join(folder, "work", "index.html"), BASE);
    fs.writeFileSync(path.join(folder, "draw", "first", "01.html"), `<!-- status: First: list -->\n${html}`);
    const r = spawnSync(process.execPath, [CHECK, "-C", folder, "first"], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.error, undefined, `check.js didn't finish: ${r.error}`);
    return r.stdout.split("\n").filter((l) => l.includes("doesn't start with"));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

test("ids Spacesheep adds on save (auto-<tag>-<hash>) pass in a direction, and other ids off its slug still fail", () => {
  assert.deepEqual(offSlug('<ul data-ss-id="first-list"><li data-ss-id="auto-li-1rcmmd">Shoyu</li><li data-ss-id="auto-li-1rcmmd-2">Shoyu</li><p data-ss-id="auto-p-0a9zx3">Open late</p></ul>'), []);
  for (const id of ["night-list", "auto-li", "auto-li-1rcmm", "auto-li-1rcmmdx", "auto-LI-1rcmmd", "first"]) {
    const lines = offSlug(`<div data-ss-id="${id}">x</div>`);
    assert.equal(lines.length, 1, `${id}: ${lines.join(" | ") || "not flagged"}`);
  }
});

// check.js's lines about tight display type, for one part of direction "first" holding this CSS.
function tightType(css) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "check-test-"));
  try {
    fs.mkdirSync(path.join(folder, "work"));
    fs.mkdirSync(path.join(folder, "draw", "first"), { recursive: true });
    fs.writeFileSync(path.join(folder, "work", "index.html"), BASE);
    fs.writeFileSync(path.join(folder, "draw", "first", "01.html"), `<!-- status: First: date -->\n<style>\n${css}\n</style>\n<h1 class="first-name" data-ss-id="first-name">Street party</h1><p class="first-date" data-ss-id="first-date">18</p>`);
    const r = spawnSync(process.execPath, [CHECK, "-C", folder, "first"], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.error, undefined, `check.js didn't finish: ${r.error}`);
    return r.stdout.split("\n").filter((l) => l.includes("display type"));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

test("display type under line-height 1 without a fifth of its size clear is flagged, whatever font draws it", () => {
  for (const css of [
    ".first-date { font-size: 30cqi; line-height: .9; margin: 8px 0; }", // the poster run's date: it rose into its heading in Rockwell
    ".first-date { font: 900 120px/0.85 Rockwell, serif; margin: 0; }",
    ".first-date { font-size: 6rem; line-height: 90%; margin-top: .3em; }", // clear above, not below
    ".first-date { font-size: 120px; line-height: .9; margin: -.2em 0; padding: .2em 0; }", // the margin takes the room back
    ".first-date { font-size: 120px; line-height: .9; margin-top: .2em; margin-bottom: .2em; margin: 0; }", // the last one wins
  ]) {
    const lines = tightType(css);
    assert.equal(lines.length, 1, `${css}: ${lines.join(" | ") || "not flagged"}`);
    assert.match(lines[0], /draw\/first\/01\.html:\d+/);
    assert.match(lines[0], /give it a margin of a fifth of its size above and below; keep the line-height$/); // room, never looser type
  }
  for (const css of [
    ".first-date { font-size: 30cqi; line-height: .9; margin: .2em 0; }",
    ".first-date { font-size: 30cqi; line-height: .9; margin-block: 0; padding-block: .25em; }",
    ".first-date { font-size: 120px; line-height: .9; margin: .1em 0; padding: .1em 0; }", // margin and padding together
    ".first-date { line-height: .9; font: 900 120px Rockwell, serif; margin: 0; }", // the font shorthand sets line-height back to normal
    ".first-date { font-size: 30cqi; line-height: 1; margin: 0; }",
    ".first-date { font-size: 18px; line-height: .9; margin: 0; }", // not display type
    ".first-date::first-letter { font-size: 5em; line-height: .8; }", // a drop cap
    ".first-date span { float: left; font-size: 96px; line-height: .8; }",
  ]) assert.deepEqual(tightType(css), [], css);
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

test("the starter's switcher writes the address only when a tab or a card's pill is clicked (or, on the canvas, a number key pressed, or a chat button asks for a direction), never on its own at load", () => {
  const src = BASE, keys = 1, clicks = 2, chat = 1;
  const writes = src.split("\n").filter((l) => /history\.(replaceState|pushState)|location\.hash\s*=/.test(l));
  assert.equal(writes.length, clicks + keys + chat, writes.join(" | "));
  // Each write is inside the listener of a person's click or key, or of the chat button they tapped (show-direction):
  // the nearest listener before it.
  const by = writes.map((w) => { const at = src.indexOf(w) + w.search(/history|location/), from = Math.max(src.lastIndexOf("addEventListener(", at), src.lastIndexOf("ss.on(", at)); return src.slice(from, from + 26); });
  assert.equal(by.filter((x) => x.startsWith("addEventListener('click'")).length, clicks, by.join(" | "));
  assert.equal(by.filter((x) => x.startsWith("addEventListener('keydown'")).length, keys, by.join(" | "));
  assert.equal(by.filter((x) => x.startsWith("ss.on('chat-action'")).length, chat, by.join(" | "));
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
    // The starter's about blocks are still placeholders here: their lines are the about test's, below.
    return r.stdout.trim().split("\n").filter((l) => !/^all pass: 3 directions, 1 view,|to fix/.test(l) && !/\babout (block|intro|spec)\b|\bcaption\b/.test(l));
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
  // A direction with no views is the canvas's to open, unless the key comes from a tab in the bar, outside the area.
  assert.match(BASE, /const d = all\(\)\[\+k - 1\], set = d \? \[d, \.\.\.viewsOf\(d\)\] : \[\], bar = [^\n]*\n      if \(!set\.length \|\| \(set\.length < 2 && !bar\)\) return;/);
  assert.doesNotMatch(BASE, /if \(!tabsNow\(\)\) return;/);
});

// The switcher's script run in a stand-in page: which listeners it adds to the window and the document.
function switcherListeners(already) {
  const vm = require("vm");
  const src = BASE.slice(BASE.indexOf("/* switcher: start */\n(() => {"), BASE.indexOf("/* switcher: end */\n/* controls"));
  const added = [], el = () => ({ children: [], replaceChildren() {}, setAttribute() {}, classList: { toggle() {} }, dataset: {} });
  const tabs = el(), document = { querySelector: (s) => (s === ".switcher-tabs" ? tabs : null), querySelectorAll: () => [], addEventListener: (n) => added.push("document " + n) };
  const win = { ...already, document, location: { hash: "" }, history: { replaceState() {} }, matchMedia: () => ({ matches: false }), CSS: { escape: (s) => s },
    MutationObserver: class { observe() {} takeRecords() {} }, HashChangeEvent: class {}, addEventListener: (n) => added.push("window " + n), dispatchEvent() {} };
  win.window = win;
  vm.runInNewContext(src, win);
  assert.equal(typeof win.ssFrame, "function", "each run leaves its frame() for the zoom's listener");
  return added.sort();
}

test("the frame's listeners go in on a page an older starter set up, whose tab already has the number keys", () => {
  const menu = ["document click", "document keydown"], exp = ["document click", "document keydown", "document ss:pdf-result", "window message"];
  const put = (l) => [...l, ...menu, ...exp].sort();
  const fresh = switcherListeners({});
  assert.deepEqual(fresh, put(["document click", "document ss:canvas", "window hashchange", "window keydown", "window keydown"]));
  // An older starter's tab: its number-key listener is in, so only the frame's are added on the push.
  assert.deepEqual(switcherListeners({ ssViewKeys: true }), put(["document click", "document ss:canvas", "window hashchange", "window keydown"]));
  // A tab whose frame listened to the canvas before ssFrameHeard: the canvas's listener that calls the newest frame() goes in.
  assert.deepEqual(switcherListeners({ ssViewKeys: true, ssFrameKeys: true }), put(["document click", "document ss:canvas", "window hashchange"]));
  // A tab whose frame came before the cards' pills: the pill's tap goes in on the push.
  assert.deepEqual(switcherListeners({ ssViewKeys: true, ssFrameKeys: true, ssFrameHeard: true }), put(["document click", "window hashchange"]));
  // A tab from before the cards' menus: the menu's tap and keys go in on the push.
  assert.deepEqual(switcherListeners({ ssViewKeys: true, ssFrameKeys: true, ssFrameHeard: true, ssPillTaps: true }), put(["window hashchange"]));
  // A tab from before Export: its menu's tap and keys, and Spacesheep's answer to a PDF, go in on the push.
  assert.deepEqual(switcherListeners({ ssViewKeys: true, ssFrameKeys: true, ssFrameHeard: true, ssPillTaps: true, ssMenus: true }), [...exp, "window hashchange"].sort());
  // This starter's tab, pushed again: nothing twice.
  assert.deepEqual(switcherListeners({ ssViewKeys: true, ssFrameKeys: true, ssFrameHeard: true, ssPillTaps: true, ssMenus: true, ssExportHeard: true }), ["window hashchange"]);
});

// The switcher's script on a stand-in page with three directions: what its bar's pill and tabs show.
function barPage(flags = {}) {
  const vm = require("vm"), heard = {}, watchers = [];
  const camel = (n) => n.slice(5).replace(/-([a-z])/g, (m, c) => c.toUpperCase());
  class El {
    constructor(data = {}) { this.dataset = { ...data }; this.attrs = new Map(); this.children = []; this.hidden = false; this.classList = { toggle() {} }; }
    hasAttribute(n) { return n.startsWith("data-") ? camel(n) in this.dataset : this.attrs.has(n); }
    setAttribute(n, v) { if (n.startsWith("data-")) this.dataset[camel(n)] = String(v); else this.attrs.set(n, String(v)); }
    toggleAttribute(n, on) { if (on) this.setAttribute(n, ""); else if (n.startsWith("data-")) delete this.dataset[camel(n)]; else this.attrs.delete(n); }
    replaceChildren(...k) { this.children = k; }
    addEventListener() {}
    contains(x) { return x === this; }
    // What a stand-in matches: its own simple selectors (is), and whether it sits in the canvas area.
    closest(sel) {
      const is = this.is || [], any = (list) => list.split(",").some((p) => is.includes(p.trim()));
      if (sel === "[data-ss-canvas-area]") return this.inArea ? {} : null;
      const inner = /^\[data-ss-canvas-area\] :is\((.*)\)$/.exec(sel);
      if (inner) return this.inArea && any(inner[1]) ? this : null;
      return any(sel) ? this : null;
    }
    click() { this.clicks = (this.clicks || 0) + 1; }
  }
  const dirs = ["first", "second", "third"].map((s) => new El({ ssId: `direction-${s}`, ssLabel: s[0].toUpperCase() + s.slice(1), line: s }));
  const bar = { ".switcher-tabs": new El(), ".switcher-line": new El(), ".switcher-views": new El(), ".frame-back": new El(), ".switcher": new El(), ".frame-use": new El(), ".frame-round": new El(), '[data-ss-canvas-area]': new El(), "section.direction": dirs[0] };
  const document = {
    body: { getAttribute: () => null }, contains: () => true, getElementById: () => null, createElement: () => new El(),
    querySelector: (s) => bar[s] || dirs.find((d) => s === `[data-ss-id="${d.dataset.ssId}"]`) || null,
    querySelectorAll: (s) => (s === "section.direction:not([data-view-of])" ? dirs : []),
    addEventListener: (n, f) => (heard[n] = heard[n] || []).push(f),
  };
  const winHeard = {}, location = { hash: "" };
  const win = { ...flags, document, location, history: { replaceState: (a, b, h) => { location.hash = h; } }, matchMedia: () => ({ matches: false }), CSS: { escape: (s) => s },
    MutationObserver: class { constructor(f) { watchers.push(f); } observe() {} takeRecords() {} }, HashChangeEvent: class {}, addEventListener: (n, f) => (winHeard[n] = winHeard[n] || []).push(f), dispatchEvent() {} };
  win.window = win;
  // A listener an older frame added, which knows nothing of the pill, as the frame before it did.
  if (flags.ssFrameKeys) heard["ss:canvas"] = [() => {}];
  vm.runInNewContext(BASE.slice(BASE.indexOf("/* switcher: start */\n(() => {"), BASE.indexOf("/* switcher: end */\n/* controls")), win);
  const canvas = (open) => { win.ss = { canvas: { zoom: open ? 0.87 : 0.35, open } }; (heard["ss:canvas"] || []).forEach((f) => f()); };
  // A key on a stand-in element: whether a listener took it (preventDefault), what Back's clicks and the address are after.
  const key = (k, target) => {
    let taken = false;
    const e = { key: k, target, preventDefault: () => { taken = true; }, stopImmediatePropagation() {}, stopPropagation() {} };
    (winHeard.keydown || []).forEach((f) => f(e));
    return { taken, back: bar[".frame-back"].clicks || 0, hash: location.hash };
  };
  const tab = (inArea) => Object.assign(new El(), { is: ["button", "[role=tab]"], inArea });
  return { dirs, key, tab, bar: bar[".switcher"], pill: bar[".frame-use"], round: bar[".frame-round"], tabs: bar[".switcher-tabs"], canvas, observe: () => watchers.forEach((f) => f()) };
}

test("the bar's pill follows the open direction on a tab an older frame set up, and a live pick marks it and its tab", () => {
  const old = barPage({ ssViewKeys: true, ssFrameKeys: true });
  old.canvas("direction-first");
  assert.equal(old.pill.hidden, false, "an older frame's tab shows the pill once a direction opens");
  assert.equal(old.pill.dataset.ssSay, "Use First");
  old.canvas(null);
  assert.equal(old.pill.hidden, true, "and hides it back on the canvas");
  const page = barPage();
  page.canvas("direction-second");
  assert.equal(page.pill.disabled, false);
  assert.deepEqual([page.round.hidden, page.round.dataset.ssSay, page.round.title], [false, "Another round of Second", "Another round of Second"], "Another round beside it says its line");
  page.canvas(null);
  assert.equal(page.round.hidden, true, "and goes with it on the canvas");
  assert.ok(page.bar.hasAttribute("data-canvas-view"), "on the canvas the bar says so, and no tab is filled");
  page.canvas("direction-first");
  assert.ok(!page.bar.hasAttribute("data-canvas-view"), "a direction open full page fills its tab");
  page.canvas("direction-second");
  // The agent's pick arrives as an attribute on the section, in a live push that keeps the node.
  page.dirs[1].setAttribute("data-chosen", "");
  page.observe();
  assert.equal(page.pill.disabled, true, "the pill is pressed out at once");
  assert.ok(page.pill.hasAttribute("data-chosen"), "and reads Chosen");
  assert.deepEqual(page.tabs.children.map((b) => b.hasAttribute("data-chosen")), [false, true, false], "its tab carries the mark");
});

test("on the bar, which sits outside the canvas area, Esc on a tab goes Back and a tab's number opens its direction; inside the area the canvas keeps them", () => {
  const page = barPage();
  page.canvas("direction-second");
  assert.deepEqual(page.key("Escape", page.tab(false)), { taken: true, back: 1, hash: "" }, "Esc on a bar tab goes Back");
  assert.equal(page.key("Escape", page.tab(true)).back, 1, "a tab inside the area is the canvas's");
  page.canvas(null);
  assert.equal(page.key("Escape", page.tab(false)).back, 1, "with nothing open, Esc does nothing");
  assert.deepEqual(page.key("3", page.tab(false)), { taken: true, back: 1, hash: "#direction-third" }, "a bar tab's 3 opens the third direction");
  assert.equal(page.key("2", page.tab(true)).taken, false, "inside the area, a direction with no views is the canvas's to open");
});

test("a width rule on the window, or a size in vw, is flagged with the frame's way to say it", () => {
  const lines = withView({ css: "@media (min-width: 48rem) { .first-phone-top { padding: 2rem; } } @media screen and (max-width: 30rem) { .first-phone-top p { margin: 0; } } .first-phone-top h2 { font-size: clamp(2rem, 6vw, 3rem); }" });
  assert.equal(lines.length, 3, lines.join(" | "));
  assert.match(lines[0], /"@media \(min-width: 48rem\)" asks the window's width.*write it as @container \(min-width: 48rem\)/);
  assert.match(lines[1], /write it as @container \(max-width: 30rem\)/);
  assert.match(lines[2], /6vw.*use cqi/);
});

test("overflow or a height on a direction's own section is flagged: its frame couldn't scroll on the canvas", () => {
  const lines = withView({ css: '.direction { overflow: hidden; } [data-ss-id="direction-first-phone"][data-leads="2"] { max-height: 900px; } .first-phone-top { overflow: hidden; height: 4rem; } .direction-hero, .direction .first-phone-top { height: 2rem; }' });
  assert.equal(lines.length, 2, lines.join(" | "));
  assert.match(lines[0], /overflow: hidden on the direction's section \(".direction"\): its frame can't scroll on the canvas/);
  assert.match(lines[1], /max-height: 900px on the direction's section/);
});

test("the same rule is read in the page's own styles: the head, or a style between directions", () => {
  const run = (page) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "check-test-"));
    try {
      fs.mkdirSync(path.join(folder, "work"));
      fs.writeFileSync(path.join(folder, "work", "index.html"), page);
      const r = spawnSync(process.execPath, [CHECK, "-C", folder], { encoding: "utf8", timeout: 20000 });
      assert.equal(r.error, undefined, `check.js didn't finish: ${r.error}`);
      return r.stdout.split("\n").filter((l) => l.includes("on the direction's section"));
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  };
  assert.deepEqual(run(BASE), [], "the starter sets neither");
  const head = run(BASE.replace("</head>", '<style>[data-ss-id="direction-first"] { overflow: hidden; height: 600px }</style>\n</head>'));
  assert.equal(head.length, 2, head.join(" | "));
  assert.match(head[0], /^page .*work\/index\.html:\d+.*overflow: hidden on the direction's section \("\[data-ss-id="direction-first"\]"\)/);
  assert.match(head[1], /height: 600px on the direction's section/);
  const between = run(BASE.replace(/<section class="direction"(?=[^>]*data-ss-id="direction-second")/, '<style>.direction { max-height: 100vh; }</style>\n$&'));
  assert.equal(between.length, 1, between.join(" | "));
  assert.match(between[0], /max-height: 100vh on the direction's section \("\.direction"\)/);
});

test("the starter's Export is last in the bar's row, its PDF items name sections by data-ss-id, and the end mark is the body's last node", () => {
  const row = BASE.slice(BASE.indexOf('<div class="switcher-row">'), BASE.indexOf('<div class="switcher-views"'));
  assert.match(row, /<div class="export no-print">[\s\S]*<\/p><\/div>\n  <\/div>\n  $/, "Export closes the row");
  for (const c of ["export-pdf", "export-pdf-all", "export-html", "export-prompt"]) assert.match(row, new RegExp(`class="${c}" role="menuitem"`), c);
  assert.equal((row.match(/data-ss-pdf=""/g) || []).length, 2, "both PDF items carry data-ss-pdf, filled in when the menu opens");
  assert.match(BASE, /dataset\.ssPdf = d \? d\.dataset\.ssId : ''/, "this direction: its section's data-ss-id");
  assert.match(BASE, /dataset\.ssPdf = dirs\.map\(\(v\) => v\.dataset\.ssId\)\.join\(' '\)/, "every direction: their data-ss-id, in page order");
  // The end mark: once, as the body's last node, and never inside another comment, which it would close.
  assert.equal(BASE.split("<!-- design: end -->").length, 2);
  assert.match(BASE, /<\/script>\n<!-- design: end -->\n<\/body>\n<\/html>\n?$/);
  const head = BASE.slice(BASE.indexOf("<!--"), BASE.indexOf("-->") + 3);
  assert.ok(BASE.indexOf("<html") > BASE.indexOf(head) + head.length - 1 && !/<!--[\s\S]*<!--/.test(head), "the page's opening comment holds no comment of its own");
});

// The controls' script run in a stand-in page with two controls on direction First, framed or not.
function tweaksPage(framed) {
  const vm = require("vm");
  const src = BASE.slice(BASE.indexOf("/* controls: the inputs"), BASE.indexOf("/* kit: the filters' fold button"));
  const listeners = [], copied = [];
  const section = { dataset: { ssLabel: "First" }, style: { setProperty() {} } };
  const input = (label, attrs) => {
    const out = { isConnected: true, textContent: "" }, lab = { firstChild: { textContent: label + " " }, querySelector: () => out };
    return { ...attrs, closest: (s) => (s === "label" ? lab : null), setAttribute() {}, addEventListener() {} };
  };
  const controls = [input("Accent", { type: "color", value: "#112233", dataset: { var: "--brand-accent" } }), input("Density", { type: "range", value: "1", dataset: { var: "--density" } })];
  const keep = { dataset: { ssSay: "" }, title: "", textContent: "Keep these" };
  keep.closest = (s) => (s === "[data-tweaks-keep]" ? keep : null);
  const document = {
    querySelector: (s) => (s === "section.direction.on" ? section : s === "[data-tweaks-keep]" ? keep : null),
    querySelectorAll: (s) => (s === ".tweaks input[data-var]" ? controls : []),
    addEventListener: (n, f, capture) => listeners.push({ n, f, capture }), createElement: () => ({ isConnected: false }), documentElement: {},
  };
  const win = { document, getComputedStyle: () => ({ getPropertyValue: (v) => (v === "--brand-accent" ? "#112233" : "1") }), MutationObserver: class { observe() {} },
    navigator: { clipboard: { writeText: async (t) => { copied.push(t); } } }, prompt() {} };
  win.window = win;
  win.parent = framed ? {} : win;
  const run = () => vm.runInNewContext(src, win);
  run();
  return { run, listeners, copied, keep, controls, tap: () => Promise.all(listeners.filter((l) => l.n === "click").map((l) => l.f({ target: keep }))) };
}

test("Tweaks' Keep these carries its line in data-ss-say, current at the tap; with no frame around the page it copies the line", async () => {
  assert.match(BASE, /<button type="button" data-tweaks-keep data-ss-say="">Keep these<\/button>/);
  assert.doesNotMatch(BASE, /data-tweaks-copy|Copy for the chat/);
  const line = "Keep these for First: Accent #112233, Density 1";
  const page = tweaksPage(true);
  assert.deepEqual([page.keep.dataset.ssSay, page.keep.title], [line, line], "the line is on the button from load, as its title too, so Spacesheep's send counts it as shown");
  page.run();
  assert.deepEqual(page.listeners.map((l) => [l.n, l.capture]), [["click", true]], "one listener, in the capture phase, however often the script runs");
  // A value changed with nothing seen yet: the tap's own first step brings the line up to date, before Spacesheep's listener reads it.
  page.controls[1].value = "1.1";
  await page.tap();
  assert.equal(page.keep.dataset.ssSay, "Keep these for First: Accent #112233, Density 1.1");
  assert.deepEqual(page.copied, [], "in Spacesheep's frame the line goes through data-ss-say, nothing is copied");
  const alone = tweaksPage(false);
  await alone.tap();
  assert.deepEqual(alone.copied, [line], "a page opened outside Spacesheep copies the line");
  assert.equal(alone.keep.textContent, "Copied: paste it in the chat");
});

// The switcher's script run in a stand-in page whose Spacesheep SDK is loaded, with a direction "second".
function switcherChat() {
  const vm = require("vm");
  const src = BASE.slice(BASE.indexOf("/* switcher: start */\n(() => {"), BASE.indexOf("/* switcher: end */\n/* controls"));
  const heard = [], el = () => ({ children: [], replaceChildren() {}, setAttribute() {}, classList: { toggle() {} }, dataset: {} });
  const tabs = el();
  const document = { readyState: "complete", querySelector: (s) => (s === ".switcher-tabs" ? tabs : s === 'section.direction[data-ss-id="direction-second"]' ? {} : null), querySelectorAll: () => [], addEventListener() {} };
  const win = { document, location: { hash: "" }, history: { replaceState() {} }, matchMedia: () => ({ matches: false }), CSS: { escape: (s) => s },
    MutationObserver: class { observe() {} takeRecords() {} }, HashChangeEvent: class {}, addEventListener() {}, dispatchEvent() {}, ss: { on: (n, f) => heard.push([n, f]) } };
  win.window = win;
  const run = () => vm.runInNewContext(src, win);
  run();
  return { run, heard, win };
}

test("a chat button's show-direction opens the direction its id names, as its #direction link does, heard once however often the switcher runs", () => {
  const page = switcherChat();
  page.run();
  assert.deepEqual(page.heard.map((h) => h[0]), ["chat-action"]);
  const act = page.heard[0][1];
  act({ name: "show-direction", data: { id: "direction-nope" } });
  act({ name: "another", data: { id: "direction-second" } });
  assert.equal(page.win.location.hash, "", "an id the page hasn't got, or another action, changes nothing");
  act({ name: "show-direction", data: { id: "direction-second" } });
  assert.equal(page.win.location.hash, "direction-second");
});

test("the starter's kit lays out at its frame's width, and its switcher makes no tab of a view", () => {
  const head = BASE.slice(0, BASE.indexOf("</head>"));
  assert.doesNotMatch(head, /@media[^{]*width/, "a kit rule still asks the window's width");
  assert.match(head, /\.direction, \[data-ss-frame\] \{ container-type: inline-size; \}/);
  assert.match(BASE, /<div class="switcher-views" role="group" aria-label="Device views"><\/div>/);
});

// check.js's lines about the canvas area, for this page.
function areaLines(page) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "check-test-"));
  try {
    fs.mkdirSync(path.join(folder, "work"));
    fs.writeFileSync(path.join(folder, "work", "index.html"), page);
    const r = spawnSync(process.execPath, [CHECK, "-C", folder], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.error, undefined, `check.js didn't finish: ${r.error}`);
    return r.stdout.split("\n").filter((l) => l.includes("canvas area"));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
test("a direction outside the canvas area is flagged with its line; the starter, and a page from before the area, are not", () => {
  assert.deepEqual(areaLines(BASE), []);
  assert.deepEqual(areaLines(BASE.replace('<meta name="ss-canvas-focus"', '<meta name="ss-canvas" content="on">\n<meta name="ss-canvas-focus"')
    .replace("<div data-ss-canvas-area>\n\n", "").replace("</section>\n\n</div>\n", "</section>\n")), [], "the save gives an older page its area");
  const out = BASE.replace(/\n(<section class="direction"[^>]*data-ss-id="direction-third"[\s\S]*?<\/section>)\n\n<\/div>\n/, "\n</div>\n\n$1\n");
  const lines = areaLines(out);
  assert.equal(lines.length, 1, lines.join("\n"));
  assert.match(lines[0], new RegExp(`work/index\\.html:${out.split("\n").findIndex((l) => l.startsWith("<section") && l.includes('data-ss-id="direction-third"')) + 1}\\b.*direction-third is outside the canvas area`));
  assert.match(areaLines(BASE.replace("</section>\n\n</div>\n", "</section>\n"))[0] || "", /never closed/);
});

// Each direction's about block: what it is for and how to try it, its spec row, and a caption per frame with its size.
// The starter's placeholders are named; a filled block passes; each fault is named on its own line.
const ABOUT_FILLED = (() => {
  const about = (slug, name, extra) => `<p class="about-intro" data-ss-id="${slug}-about-intro">${name} puts every bill on one ledger, due date first, for owners who check once a month. Tap a bill to open it, or press N to add one.</p>
  <dl class="about-spec" data-ss-id="${slug}-about-spec"><div><dt>Type</dt><dd>Iowan Old Style headings, Avenir Next text</dd></div><div><dt>Colour</dt><dd>Pale sea ground, pine accent</dd></div><div><dt>Density</dt><dd>Roomy</dd></div><div><dt>Modes</dt><dd>Light</dd></div></dl>
  <ol class="about-frames" data-ss-id="${slug}-about-frames"><li data-frame="direction-${slug}">Ledger, light · Desktop 1280 × 800 · six bills, the next one due on top</li>${extra}</ol>`;
  let page = BASE.replace('[data-ss-id="direction-first"]  {', '[data-ss-id="direction-first"], [data-view-of="first"] {');
  for (const [slug, name] of [["first", "First"], ["second", "Second"], ["third", "Third"]])
    page = page.replace(new RegExp(`<p data-ss-id="${slug}-about-drawing">[^<]*</p>`), () => about(slug, name, slug === "first" ? '<li data-frame="direction-first-phone">Ledger in a hand · Phone 390 × 844 · one column, pay within reach</li>' : ""));
  return page.replace("</section>\n\n</div>", '</section>\n\n<section class="direction" data-view-of="first" data-ss-frame="phone" data-ss-section data-ss-id="direction-first-phone" data-ss-thing="direction/first/phone" data-ss-label="First · Phone" data-ss-x="0" data-ss-y="896">\n  <h2 data-ss-id="first-phone-title">Bills</h2>\n</section>\n\n</div>');
})();
function aboutLines(page, brief) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "check-test-"));
  try {
    fs.mkdirSync(path.join(folder, "work"));
    fs.writeFileSync(path.join(folder, "work", "index.html"), page);
    if (brief) { fs.mkdirSync(path.join(folder, "draw")); fs.writeFileSync(path.join(folder, "draw", "BRIEF.md"), brief); }
    const r = spawnSync(process.execPath, [CHECK, "-C", folder], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.error, undefined, `check.js didn't finish: ${r.error}`);
    return r.stdout.split("\n").filter((l) => /about|caption/.test(l));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}
test("each direction's about block has an intro of 2 or 3 sentences, a spec row and a caption with its size for each of its frames, where its direction is", () => {
  assert.deepEqual(aboutLines(BASE).map((l) => l.split("  ")[0]), ["first", "second", "third"], "the starter's placeholders are named");
  assert.match(aboutLines(BASE)[0], /^first  work\/index\.html:\d+  its about block still says it is being drawn: write its about block, draw\/first-about\/01\.html/);
  assert.deepEqual(aboutLines(ABOUT_FILLED), [], "a filled block, with its view's caption, passes");
  const broken = ABOUT_FILLED.replace("<div><dt>Density</dt><dd>Roomy</dd></div>", "")
    .replace('<li data-frame="direction-first-phone">Ledger in a hand · Phone 390 × 844 · one column, pay within reach</li>', "")
    .replace("Desktop 1280 × 800 · six bills", "Desktop 1440 × 900 · six bills")
    .replace('data-about-of="third" data-ss-id="third-about" data-ss-x="3200"', 'data-about-of="third" data-ss-id="third-about" data-ss-x="3000"')
    .replace("Third puts every bill on one ledger, due date first, for owners who check once a month. Tap a bill to open it, or press N to add one.", "Third puts every bill on one ledger.");
  const lines = aboutLines(broken).map((l) => l.replace(/  work\/index\.html:\d+  /, "  "));
  assert.deepEqual(lines, [
    'first  its about spec row lacks Density: a <dl class="about-spec" data-ss-id="first-about-spec"> with a <div><dt>…</dt><dd>…</dd></div> for each of Type, Colour, Density and Modes',
    "first  the caption for direction-first doesn't give its size: say Desktop 1280 × 800, then what it shows",
    'first  no caption for the frame direction-first-phone: an <li data-frame="direction-first-phone"> in its about block\'s <ol class="about-frames">, what it shows and its size (Phone 390 × 844)',
    'third  its about block stands apart from it: give it data-ss-x="3200" data-ss-y="-680", 680 px above its direction',
    "third  its about intro is 1 sentence and 7 words: 2 or 3 sentences, at most 60 words, what it is for and how to try it",
  ]);
  const noBlock = ABOUT_FILLED.replace(/<aside class="about no-print" data-about-of="second"[\s\S]*?<\/aside>\n\n/, "");
  assert.match(aboutLines(noBlock).join("\n"), /^second  work\/index\.html  no about block: add <aside class="about no-print" data-about-of="second" data-ss-id="second-about">/m);
  const quoted = aboutLines(ABOUT_FILLED.replace("for owners who check once a month", "so owners never miss a mooring fee"), "ask: Make sure owners never miss a mooring fee again\n<!-- end brief -->\n");
  assert.deepEqual(quoted.map((l) => l.split("  ")[0]), ["first"], quoted.join("\n"));
  assert.match(quoted[0], /its about block quotes the request \("owners never miss a mooring fee"\): say what the direction does in your own words$/);
  const older = BASE.replace(/<aside class="about[\s\S]*?<\/aside>\n\n/g, "");
  assert.deepEqual(aboutLines(older), [], "a page made before about blocks isn't asked for them");
});
