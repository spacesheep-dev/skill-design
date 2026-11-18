// The page a Shepherd turn copies (design/assets/shepherd.html): made from base.html, and still a starter page.
// Run with `node --test test/shepherd.test.js`.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { make } = require("../tools/shepherd.js");

const ASSETS = path.join(__dirname, "..", "design", "assets");
const BASE = fs.readFileSync(path.join(ASSETS, "base.html"), "utf8");
const PAGE = fs.readFileSync(path.join(ASSETS, "shepherd.html"), "utf8");
const scripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

test("shepherd.html is what tools/shepherd.js makes from base.html", () => {
  assert.equal(PAGE, make(BASE), "run node tools/shepherd.js after changing base.html");
});

test("it fits in one use_skill read and keeps the starter's metas, with no ss-workspace and no Export", () => {
  assert.ok([...PAGE].length <= 20000, `${[...PAGE].length} characters`);
  for (const meta of ['<meta name="ss-chat" content="open">', '<meta name="ss-canvas" content="on">', '<meta name="ss-canvas-focus" content="all">'])
    assert.ok(PAGE.includes(meta), meta);
  assert.doesNotMatch(PAGE, /ss-workspace/);
  assert.doesNotMatch(PAGE, /class="export|switcher-views|ss-check/);
  assert.ok(PAGE.endsWith("<!-- design: end -->\n</body>\n</html>\n"));
});

test("its bar, tokens and sections are base.html's", () => {
  for (const cls of ["frame-back", "switcher-tabs", "tweaks-body", "data-tweaks-keep", "frame-zoom", "frame-use", "frame-round", "switcher-line", "switcher-answers"])
    assert.ok(PAGE.includes(cls), cls);
  const sections = (html) => [...html.matchAll(/^<section class="direction"[\s\S]*?^<\/section>$/gm)].map((m) => m[0]);
  assert.equal(sections(PAGE).length, 3);
  assert.deepEqual(sections(PAGE), sections(BASE));
  for (const slug of ["first", "second", "third"]) assert.ok(PAGE.includes(`<!-- part:${slug} -->`) && PAGE.includes(`<!-- /part:${slug} -->`), slug);
});

test("its scripts parse, declare nothing at their top, and keep the switcher's marks for fold.js kit", () => {
  const all = scripts(PAGE);
  assert.equal(all.length, 1);
  for (const src of all) {
    const tab = vm.createContext({});
    for (let n = 0; n < 2; n++) assert.throws(() => vm.runInContext(`throw 0;\n${src}`, tab), (e) => e === 0, "a second run declares a name again");
  }
  assert.equal(PAGE.split("/* switcher: start */").length, 3, "one span in the styles, one in the script");
  assert.match(all[0], /function ssControls\(\)/);
  assert.match(all[0], /function ssDraw\(fn\)/);
});

test("it keeps the rule that hides the card menu on the drawing, behind an open direction and for a single direction", () => {
  const rule = /section\.direction :is\(\.use-this,\.card-menu\),html:has\(\.frame-back:not\(\[hidden\]\)\) :is\(\.use-this,\.card-menu\),html:not\(:has\(section\.direction:not\(\[data-view-of\]\) ~ section\.direction:not\(\[data-view-of\]\)\)\) :is\(\.use-this,\.card-menu\)\{display:none;\}/;
  assert.match(PAGE, rule);
  assert.doesNotMatch(PAGE.slice(0, PAGE.indexOf("</style>")), /\.direction\[data-view-of\]/);
});
