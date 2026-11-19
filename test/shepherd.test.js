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
  assert.ok([...PAGE].length <= 26000, `${[...PAGE].length} characters`);
  for (const meta of ['<meta name="ss-chat" content="open">', '<meta name="ss-canvas-focus" content="all">'])
    assert.ok(PAGE.includes(meta), meta);
  assert.doesNotMatch(PAGE, /<meta name="ss-canvas"[ >]/, "no whole-page canvas meta");
  assert.match(PAGE, /\n<div data-ss-canvas-area>\n\n<section class="direction"[\s\S]*<\/section>\n\n<\/div>\n/, "the directions are in the canvas area");
  assert.doesNotMatch(PAGE, /ss-workspace/);
  assert.doesNotMatch(PAGE, /class="export|switcher-views|ss-check/);
  assert.ok(PAGE.endsWith("<!-- design: end -->\n</body>\n</html>\n"));
});

test("its bar, tokens and sections are base.html's", () => {
  for (const cls of ["frame-back", "switcher-tabs", "tweaks-body", "data-tweaks-keep", "frame-use", "frame-round", "switcher-line", "switcher-answers"])
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

test("the questions card comes first in the body, within the first 4,000 characters, above the canvas area, with its button off", () => {
  const body = PAGE.indexOf("<body>"), card = PAGE.indexOf('<div class="ss-questions');
  assert.ok(body > 0 && card > body && PAGE.slice(body + 6, card).trim() === "", "the card is the body's first element");
  const end = PAGE.indexOf("</div>", card) + 6;
  assert.ok(end <= 4000, `the card ends at ${end}`);
  const tag = PAGE.slice(card, PAGE.indexOf(">", card));
  for (const a of ['data-ss-id="design-questions"', 'data-ss-comments="off"']) assert.ok(tag.includes(a), a);
  assert.ok(!tag.includes("data-ss-canvas"), "a block of the page, not of the canvas");
  assert.ok(card < PAGE.indexOf("<div data-ss-canvas-area>"), "above the canvas area");
  assert.match(PAGE.slice(card, end), /<button type="button" class="ss-start" data-ss-say="" disabled>Getting ready…<\/button>/);
  assert.ok(PAGE.indexOf(".ss-questions{") < card, "its styles come before it");
  assert.match(PAGE, /\.ss-questions\[hidden\]\{display:none;\}/);
});

// A small stand-in for the card's DOM: two fieldsets as the example has them, a button, and the card's listeners.
function cardTab() {
  const input = (type, name, value, checked) => ({ type, name, value, checked, disabled: false });
  const sets = [
    { legend: "How should it feel?", inputs: [input("radio", "look", "Warm and homely", true), input("radio", "look", "Clean and modern", false)] },
    { legend: "What must it show?", inputs: [input("checkbox", "must", "Opening hours", true), input("checkbox", "must", "Prices", true)], text: { type: "text", value: " Allergens ", disabled: false } },
  ];
  const attrs = {};
  let watch = null;
  const go = { dataset: { ssSay: "" }, disabled: true, textContent: "Getting ready…", title: "",
    getAttribute: (n) => (n === "title" ? go.title : n in attrs ? attrs[n] : null), hasAttribute: (n) => n === "title" || n in attrs,
    setAttribute: (n, v) => { if (n === "title") go.title = String(v); else attrs[n] = String(v); if (watch) watch(); },
    removeAttribute: (n) => { delete attrs[n]; }, before: (w) => { why = w; } };
  let why = null;
  const listeners = {};
  const fieldset = (f) => ({
    querySelector: (q) => (q === "legend" ? { textContent: f.legend } : q === 'input[type="text"]' ? f.text || null : null),
    querySelectorAll: (q) => (q === "input:checked" ? f.inputs.filter((i) => i.checked) : []),
  });
  const all = () => sets.flatMap((f) => [...f.inputs, ...(f.text ? [f.text] : [])]);
  const el = { dataset: {},
    querySelector: (q) => (q === ".ss-start" ? go : q === ".ss-why" ? why : null),
    querySelectorAll: (q) => (q === "fieldset" ? sets.map(fieldset) : q === "input, .ss-start" ? [...all(), go] : []),
    addEventListener: (t, fn) => { listeners[t] = fn; } };
  const document = { querySelector: (q) => (q === ".ss-questions" ? el : null),
    createElement: () => ({ textContent: "", className: "", setAttribute(n, v) { this[n] = v; } }) };
  // Timers: a tap's (0 ms) runs at once, longer ones wait for later().
  const waiting = [];
  const window = { parent: {}, MutationObserver: function (fn) { this.observe = () => { watch = fn; }; } };
  const tab = vm.createContext({ document, window, setTimeout: (fn, ms) => (ms ? waiting.push(fn) : fn()) });
  const js = scripts(PAGE)[0].match(/\/\* questions: start \*\/[\s\S]*?\/\* questions: end \*\//)[0];
  const run = () => vm.runInContext(js, tab);
  // A tap: the card's listener first, then the viewer's on the document, unless the card stopped it.
  const press = () => { let on = true; listeners.click({ target: { closest: (q) => (q === ".ss-start" ? go : null) }, stopPropagation: () => { on = false; } }); return on; };
  // The viewer's refusal (chat-actions.ts): the button's title is its reason for 1.5 s, its own kept in data-ss-title.
  const refuse = (text) => {
    if (!go.hasAttribute("data-ss-title")) go.setAttribute("data-ss-title", go.title);
    go.setAttribute("title", text);
    listeners["ss:say-refused"]({ detail: { why: text } });
  };
  const restore = () => { go.setAttribute("title", go.getAttribute("data-ss-title")); go.removeAttribute("data-ss-title"); };
  const later = () => waiting.splice(0).forEach((fn) => fn());
  return { sets, go, el, attrs, listeners, all, run, press, refuse, restore, later, why: () => why };
}

test("the page's script turns the button on and says every answer in one line, and the card hides on the turn's edit", () => {
  const card = PAGE.match(/<div class="ss-questions[\s\S]*?\n<\/div>/)[0];
  const t = cardTab();
  t.run();
  assert.equal(t.go.disabled, false);
  assert.equal(t.go.textContent, "Start designing");
  assert.equal(t.go.dataset.ssSay, "Start designing with my answers. How should it feel? Warm and homely · What must it show? Opening hours, Prices, Allergens");
  t.sets[0].inputs[0].checked = false; t.sets[0].inputs[1].checked = true; t.listeners.change();
  assert.match(t.go.dataset.ssSay, /How should it feel\? Clean and modern/);
  t.press();
  assert.ok("sent" in t.el.dataset);
  assert.equal(t.go.textContent, "Designing… the directions come next");
  assert.ok(t.all().every((i) => i.disabled), "every toggle and the button are off once sent");
  t.run();
  assert.equal(t.go.textContent, "Designing… the directions come next", "a second run leaves a sent card as it is");
  assert.match(card, /<div class="ss-questions no-print"/, "shepherd.md's turn 2 hides it by writing hidden before class");
});

test("a say the viewer refuses opens the card again with the picks kept and the reason shown, and a retry sends", () => {
  const t = cardTab();
  t.run();
  t.sets[0].inputs[0].checked = false; t.sets[0].inputs[1].checked = true; t.listeners.change();
  const line = t.go.dataset.ssSay;
  t.press();
  assert.ok("sent" in t.el.dataset);
  t.refuse("Not sent: you typed or clicked outside the page just now. Tap again in a few seconds.");
  assert.ok(!("sent" in t.el.dataset), "the card is open again");
  assert.ok(t.all().every((i) => i === t.go || !i.disabled), "the toggles are on");
  assert.equal(t.go.disabled, true, "the button waits while the viewer shows its reason in the title");
  assert.equal(t.go.textContent, "Start designing");
  assert.equal(t.press(), false, "a tap that gets through anyway never reaches the viewer, which would only fill the chat box");
  assert.ok(!("sent" in t.el.dataset), "and the card doesn't lock");
  t.restore();
  assert.equal(t.go.disabled, false, "the button is on once the title is the line again");
  assert.equal(t.why().textContent, "Not sent: you typed or clicked outside the page just now. Tap again in a few seconds.");
  assert.equal(t.why().role, "status");
  assert.equal(t.sets[0].inputs[1].checked, true, "the picks are kept");
  assert.equal(t.go.dataset.ssSay, line, "the button says the same answers");
  t.press();
  assert.ok("sent" in t.el.dataset, "a retry sends");
  assert.equal(t.why().textContent, "", "the reason goes once it's sent");
  assert.equal(t.go.textContent, "Designing… the directions come next");
});

test("answers changed while the viewer shows a refusal are what its title comes back to, so the retry sends them", () => {
  const t = cardTab();
  t.run();
  t.press();
  t.refuse("Not sent: you typed or clicked outside the page just now. Tap again in a few seconds.");
  t.sets[0].inputs[0].checked = false; t.sets[0].inputs[1].checked = true; t.listeners.change();
  assert.match(t.go.dataset.ssSay, /Clean and modern/);
  assert.equal(t.go.disabled, true);
  t.restore();
  assert.equal(t.go.title, t.go.dataset.ssSay, "the viewer puts back the new line, not the old one");
  assert.equal(t.go.disabled, false);
  assert.equal(t.press(), true);
  assert.ok("sent" in t.el.dataset);
});

test("with no observer, the button comes back on after the refusal's moment", () => {
  const t = cardTab();
  t.run();
  t.press();
  t.refuse("Not sent.");
  t.go.title = t.go.getAttribute("data-ss-title"); // put back without an attribute write
  assert.equal(t.go.disabled, true);
  t.later();
  assert.equal(t.go.disabled, false);
});

test("a tap the viewer greys (it can't take a say) leaves the card open with the viewer's reason", () => {
  const t = cardTab();
  t.run();
  t.attrs["aria-disabled"] = "true";
  t.go.title = "Turn on page actions to send";
  t.press();
  assert.ok(!("sent" in t.el.dataset));
  assert.ok(t.all().every((i) => !i.disabled));
  assert.equal(t.why().textContent, "Turn on page actions to send");
});

test("while the card shows, the bar and the canvas area (its frames and labels with it) are hidden; its styles come first", () => {
  const head = PAGE.slice(0, PAGE.indexOf('<div class="ss-questions'));
  const rule = head.match(/body:has\(>\.ss-questions:not\(\[hidden\]\)\)>:is\(([^)]*)\)\{display:none!important;\}/);
  assert.ok(rule, "the hiding rule is in the card's own styles");
  for (const s of [".switcher", "[data-ss-canvas-area]"]) assert.ok(rule[1].split(",").includes(s), s);
  assert.doesNotMatch(rule[1], /ss-questions/, "never the card itself");
});

test("each section runs from its opening tag to the </section> after its own part marker, as shepherd.md says to match it", () => {
  const md = fs.readFileSync(path.join(__dirname, "..", "design", "references", "shepherd.md"), "utf8");
  for (const n of ["first", "second", "third"]) {
    const whole = new RegExp(`<section class="direction"[^>]*data-ss-id="direction-${n}"[\\s\\S]*?<!-- /part:${n} -->\\n</section>`, "g");
    const found = PAGE.match(whole) || [];
    assert.equal(found.length, 1, n);
    assert.doesNotMatch(found[0].slice(1), /<section/, `${n} holds no other section`);
    assert.ok(md.includes(`<!-- /part:${n} -->`), `shepherd.md names ${n}'s own marker`);
  }
});

test("on the slim bar, which sits outside the canvas area, Esc on a tab goes Back and a tab's number opens its direction", () => {
  const js = scripts(PAGE)[0].match(/\/\* switcher: start \*\/[\s\S]*?\/\* switcher: end \*\//)[0];
  class El {
    constructor(is = [], data = {}) { this.is = is; this.dataset = data; this.children = []; this.attrs = {}; this.clicks = 0; this.classList = { toggle() {} }; }
    closest(sel) { return sel.split(",").some((p) => this.is.includes(p.trim())) ? this : null; }
    hasAttribute(n) { return n in this.attrs; }
    setAttribute(n, v) { this.attrs[n] = v; }
    toggleAttribute(n, on) { if (on) this.attrs[n] = ""; else delete this.attrs[n]; }
    replaceChildren(...k) { this.children = k; }
    addEventListener() {}
    contains(x) { return x === this; }
    click() { this.clicks++; }
  }
  const dirs = ["first", "second", "third"].map((s) => new El([], { ssId: `direction-${s}`, ssLabel: s }));
  const bar = { ".switcher-tabs": new El(), ".frame-back": new El(), ".switcher": new El(), "[data-ss-canvas-area]": new El() };
  const heard = {}, location = { hash: "" };
  const document = { querySelector: (s) => bar[s] || null, querySelectorAll: (s) => (s === "section.direction:not([data-view-of])" ? dirs : []),
    getElementById: () => null, createElement: () => new El(), addEventListener() {}, body: {} };
  const win = { document, location, history: { replaceState: (a, b, h) => { location.hash = h; } }, CSS: { escape: (s) => s }, HashChangeEvent: class {},
    MutationObserver: class { observe() {} }, addEventListener: (n, f) => (heard[n] = heard[n] || []).push(f), dispatchEvent() {} };
  win.window = win;
  vm.runInNewContext(js, win);
  const tab = new El(["button", "[role=tab]", ".switcher"]);
  const key = (k) => { let taken = false; (heard.keydown || []).forEach((f) => f({ key: k, target: tab, preventDefault: () => { taken = true; } })); return taken; };
  win.ss = { canvas: { open: "direction-second", zoom: 1 } };
  assert.ok(key("Escape"), "Esc is taken");
  assert.equal(bar[".frame-back"].clicks, 1, "and goes Back");
  win.ss = { canvas: { open: null, zoom: 0.3 } };
  assert.equal(key("Escape"), false, "with nothing open, Esc is left alone");
  assert.ok(key("3"));
  assert.equal(location.hash, "#direction-third", "a tab's 3 opens the third direction");
  assert.equal(key("7"), false, "a number with no direction is left alone");
});
