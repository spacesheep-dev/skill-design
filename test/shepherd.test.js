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
  assert.ok([...PAGE].length <= 24000, `${[...PAGE].length} characters`);
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

test("the questions card comes first in the body, within the first 4,000 characters, pinned, with its button off", () => {
  const body = PAGE.indexOf("<body>"), card = PAGE.indexOf('<div class="ss-questions');
  assert.ok(body > 0 && card > body && PAGE.slice(body + 6, card).trim() === "", "the card is the body's first element");
  const end = PAGE.indexOf("</div>", card) + 6;
  assert.ok(end <= 4000, `the card ends at ${end}`);
  const tag = PAGE.slice(card, PAGE.indexOf(">", card));
  for (const a of ['data-ss-canvas="pin"', 'data-ss-id="design-questions"', 'data-ss-comments="off"']) assert.ok(tag.includes(a), a);
  assert.match(PAGE.slice(card, end), /<button type="button" class="ss-start" data-ss-say="" disabled>/);
  assert.ok(PAGE.indexOf(".ss-questions{") < card, "its styles come before it");
  assert.match(PAGE, /\.ss-questions\[hidden\]\{display:none;\}/);
});

test("the page's script turns the button on and says every answer in one line, and the card hides on the turn's edit", () => {
  const card = PAGE.match(/<div class="ss-questions[\s\S]*?\n<\/div>/)[0];
  const js = scripts(PAGE)[0].match(/\/\* questions: start \*\/[\s\S]*?\/\* questions: end \*\//)[0];
  // A small stand-in for the card's DOM: two fieldsets as the example has them.
  const input = (type, name, value, checked) => ({ type, name, value, checked, disabled: false });
  const sets = [
    { legend: "How should it feel?", inputs: [input("radio", "look", "Warm and homely", true), input("radio", "look", "Clean and modern", false)] },
    { legend: "What must it show?", inputs: [input("checkbox", "must", "Opening hours", true), input("checkbox", "must", "Prices", true)], text: { type: "text", value: " Allergens ", disabled: false } },
  ];
  const go = { dataset: { ssSay: "" }, disabled: true, textContent: "Getting the page ready…", title: "" };
  const listeners = {};
  const fieldset = (f) => ({
    querySelector: (s) => (s === "legend" ? { textContent: f.legend } : s === 'input[type="text"]' ? f.text || null : null),
    querySelectorAll: (s) => (s === "input:checked" ? f.inputs.filter((i) => i.checked) : []),
  });
  const el = { dataset: {}, querySelector: (s) => (s === ".ss-start" ? go : null), querySelectorAll: (s) => (s === "fieldset" ? sets.map(fieldset) : []),
    addEventListener: (t, fn) => { listeners[t] = fn; } };
  const tab = vm.createContext({ document: { querySelector: (s) => (s === ".ss-questions" ? el : null) }, window: {}, setTimeout: (fn) => fn() });
  tab.window.parent = {};
  vm.runInContext(js, tab);
  assert.equal(go.disabled, false);
  assert.equal(go.textContent, "Start designing");
  assert.equal(go.dataset.ssSay, "Start designing with my answers. How should it feel? Warm and homely · What must it show? Opening hours, Prices, Allergens");
  sets[0].inputs[0].checked = false; sets[0].inputs[1].checked = true; listeners.change();
  assert.match(go.dataset.ssSay, /How should it feel\? Clean and modern/);
  listeners.click({ target: { closest: (s) => (s === ".ss-start" ? go : null) } });
  assert.ok("sent" in el.dataset);
  assert.equal(go.textContent, "Designing… the directions come next");
  vm.runInContext(js, tab);
  assert.equal(go.textContent, "Designing… the directions come next", "a second run leaves a sent card as it is");
  assert.match(card, /<div class="ss-questions no-print"/, "shepherd.md's turn 2 hides it by writing hidden before class");
});
