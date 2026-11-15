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
if (a[0] === "call") { fs.appendFileSync(path.join(dir, "stdin.log"), JSON.stringify(JSON.parse(fs.readFileSync(0, "utf8"))) + "\\n"); process.exit(0); }
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
if (a[0] === "spaces" && a[1] === "get") { console.log("title: Untitled\\n  id: ${SPACE}"); process.exit(0); }
if (a[0] === "read") { fs.mkdirSync("work", { recursive: true }); fs.writeFileSync("work/index.html", fs.readFileSync(process.env.FAKE_PAGE)); console.log("↓ index.html"); process.exit(0); }
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
  // What each push_live call carried: the page, or an empty status (the work card down).
  const sent = () => { try { return fs.readFileSync(path.join(root, "stdin.log"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
  return { root, folder, fold, calls, sent };
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

test("stop alone after a save takes the work card down with an empty status, and stop again sends nothing", () => {
  const { fold, calls, sent } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  assert.equal(fold(["save", "Three poster looks", "Checking details"]).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 0, w.stdout + w.stderr);
  const s = fold(["stop"]);
  assert.equal(s.status, 0, s.stdout + s.stderr);
  assert.match(s.stdout, /took the work card down/);
  const log = calls();
  const status = log.findIndex((a) => a[0] === "live" && a.includes("Checking details"));
  assert.ok(status > log.findIndex((a) => a[0] === "deploy" && a.includes("Three poster looks")), "the save's status came after its deploy");
  assert.deepEqual(sent().at(-1), { space: SPACE, status: "" });
  assert.deepEqual(log.at(-1), ["call", "push_live", "-"], "the empty status is the last call");
  const n = calls().length;
  assert.equal(fold(["stop"]).status, 0);
  assert.equal(calls().length, n, "a second stop sends nothing");
});

test("stop with a message saves, and that save takes the work card down: no empty status", () => {
  const { fold, calls, sent } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  assert.equal(fold(["save", "Frame", "Drawing three directions"]).status, 0);
  assert.equal(fold(["wait"]).status, 0);
  const s = fold(["stop", "Three poster looks"]);
  assert.equal(s.status, 0, s.stdout + s.stderr);
  const log = calls();
  assert.ok(log.at(-1)[0] === "deploy" && log.at(-1).includes("Three poster looks"), `last call: ${JSON.stringify(log.at(-1))}`);
  assert.ok(!sent().some((b) => b.status === ""), "no empty status");
});

test("start says the next step, and push names the starter's placeholders after their sections without touching the rest", () => {
  const { folder, fold, sent } = setup();
  const r = fold(["start", "--new", "Poster"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^next: .*leave every <!-- part:… --> placeholder as it is.*fold\.js save "Frame" "Drawing three directions", fold\.js write.*draw\/<slug>\/01\.html/m);
  const page = path.join(folder, "work", "index.html");
  // Step 2's Edits: the opening tags only. The placeholders keep the starter's names.
  const edited = BASE.replace('data-ss-id="direction-first" data-ss-thing="direction/first" data-ss-label="First"', 'data-ss-id="direction-night-watch" data-ss-thing="direction/night-watch" data-ss-label="Night &amp; Watch"');
  fs.writeFileSync(page, edited);
  assert.equal(fold(["push"]).status, 0);
  const named = fs.readFileSync(page, "utf8");
  // Only the first placeholder changes: its marker, its id and its heading. The one in "second" keeps its names.
  const expected = edited.replace('<!-- part:first --><div class="drawing" data-ss-id="first-drawing"><h2>First</h2>', '<!-- part:night-watch --><div class="drawing" data-ss-id="night-watch-drawing"><h2>Night &amp; Watch</h2>').replace("<!-- /part:first -->", "<!-- /part:night-watch -->");
  assert.notEqual(expected, edited);
  assert.equal(named, expected);
  assert.equal(sent().at(-1).html, named, "the named page is the one pushed");
});

test("a new build saved with no part marker left gets a status naming its directions, and the log says why", () => {
  const { folder, fold, calls } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  fs.writeFileSync(path.join(folder, "work", "index.html"), '<!DOCTYPE html><title>Poster</title>' +
    ['sunny-bunting" data-ss-label="Sunny Bunting', 'stacked-type" data-ss-label="Stacked Type', 'long-table" data-ss-label="Long Table']
      .map((a) => `<section class="direction" data-ss-id="direction-${a}"><h1>Summer Street Party</h1></section>`).join(""));
  assert.equal(fold(["save", "Three poster looks", "Checking details"]).status, 0);
  const w = fold(["wait"]);
  assert.equal(w.status, 0, w.stdout + w.stderr);
  assert.match(w.stdout, /no part's status reached the person: the directions were drawn in work\/index\.html, not as parts/);
  assert.ok(calls().some((a) => a[0] === "live" && a.includes("Sunny Bunting, Stacked Type and Long Table are up. Checking details")), "the status names the three");
});

test("a page drawn as parts, or a revision of a space that held a design, keeps the save's own status", () => {
  for (const revision of [false, true]) {
    const { folder, fold, calls } = setup();
    assert.equal(fold(["start", "--new", "Poster"]).status, 0);
    const marker = revision ? "" : "<!-- part:bunting --><p>Drawn</p><!-- /part:bunting -->";
    if (revision) fs.rmSync(path.join(folder, "draw", "starter")); // as start <link> does on a space with a design
    fs.writeFileSync(path.join(folder, "work", "index.html"), `<!DOCTYPE html><title>Poster</title><section class="direction" data-ss-id="direction-bunting" data-ss-label="Bunting">${marker}</section>`);
    assert.equal(fold(["save", "Three directions", "Checking details"]).status, 0);
    const w = fold(["wait"]);
    assert.equal(w.status, 0, w.stdout + w.stderr);
    assert.doesNotMatch(w.stdout, /no part's status/);
    assert.ok(calls().some((a) => a[0] === "live" && a.at(-1) === "Checking details"), `revision ${revision}: the save's own status`);
  }
});

// The page sheep.new (and a space made empty) starts as: spacesheep's starterHtml("Untitled"), as it is.
const PLATFORM_BLANK = `<!doctype html>
<html lang="en" data-ss-id="root">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Untitled</title>
<style>
  html{background:#fff}
  body{margin:0;min-height:100vh;box-sizing:border-box;padding:48px clamp(20px,7vw,96px) 40vh;background:#fff;color:#1a1a1f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;line-height:1.6}
  body:not(:has(> :not(script,style,link,template,[class^="ss-"]))){background-image:radial-gradient(circle,#dcdfe5 1px,transparent 1.3px);background-size:22px 22px}
  h1{font-size:2rem;line-height:1.2;margin:0 0 .5em}
  h2{font-size:1.4rem;margin:1.2em 0 .4em}
  p,li{max-width:40em;margin:0 0 .7em}
</style>
</head>
<body data-ss-id="body"></body>
</html>`;

// start <link> on a page in the space: what it leaves in work/, and whether it laid the starter.
function startOn(page) {
  const { root, folder, fold } = setup();
  fs.writeFileSync(path.join(root, "page.html"), page);
  const r = fold(["start", "https://stage.test/s"], { FAKE_PAGE: path.join(root, "page.html") });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return { r, work: fs.readFileSync(path.join(folder, "work", "index.html"), "utf8"), starter: fs.existsSync(path.join(folder, "draw", "starter")) };
}

test("start on a known empty page lays down the starter: an empty file, sheep.new's page whatever its title, and start --new's first version", () => {
  const { root, fold } = setup();
  assert.equal(fold(["start", "--new", "Lift <notice>"]).status, 0);
  const pages = {
    "an empty file": "",
    "sheep.new": PLATFORM_BLANK,
    "sheep.new, another title": PLATFORM_BLANK.replace("<title>Untitled</title>", "<title>Summer party &amp; street fair</title>"),
    "start --new": fs.readFileSync(path.join(root, "first.html"), "utf8"),
  };
  for (const [name, page] of Object.entries(pages)) {
    const { r, work, starter } = startOn(page);
    assert.equal(work, BASE, `${name}: the starter is in work/`);
    assert.ok(starter, `${name}: draw/starter is written`);
    assert.match(r.stdout, /held no design: the starter is in its place\nnext: /, name);
  }
});

test("start keeps every other page, however empty it looks: a design, words, a picture, a script, CSS that draws, any mark added to sheep.new's page", () => {
  const body = (inner, attrs = "") => PLATFORM_BLANK.replace('<body data-ss-id="body"></body>', `<body data-ss-id="body"${attrs}>${inner}</body>`);
  const pages = {
    design: '<!DOCTYPE html><title>Poster</title><section class="direction" data-ss-section data-ss-id="direction-bunting"><h1 data-ss-id="bunting-title">Summer Street Party</h1></section>',
    "no data-ss-id": "<!DOCTYPE html><title>Notice</title><p>The lift is out of service.</p>",
    "words on sheep.new's page": body("<p>Poster for the street party, 18 July</p>"),
    "an image": body('<img src="photo.jpg" alt="">'),
    "drawn by a script": body('<script>document.body.append("Open daily")</script>'),
    "a script in the head": PLATFORM_BLANK.replace("</head>", '<script>addEventListener("load", () => document.body.append("Open daily"))</script>\n</head>'),
    "words from CSS": PLATFORM_BLANK.replace("</style>", '  body::before { content: "Open daily" }\n</style>'),
    "a picture from CSS": body("", ' style="background: url(photo.jpg) center / cover"'),
    "a picture from CSS, unquoted": body("", " style=background:url(poster.png)"),
    "a picture from an attribute": body("", ' background="poster.png"'),
    "an outside stylesheet": PLATFORM_BLANK.replace("</head>", '<link rel="stylesheet" href="https://example.com/poster.css">\n</head>'),
    "words in a .ss- mark": body('<p class="ss-note">Keep me</p>'),
    "an empty .ss- mark that draws": body('<div class="ss-poster" style="width:200px;height:200px;background:red"></div>'),
    "the platform's own marks": body('\n<style data-ss-id="ss-style">p{color:red}</style>\n<div class="ss-mark"></div>\n'),
    "words after </body>": PLATFORM_BLANK.replace("</html>", "<p>Open daily</p>\n</html>"),
  };
  for (const [name, page] of Object.entries(pages)) {
    const { r, work, starter } = startOn(page);
    assert.equal(work, page, `${name}: work/ holds the page as it was`);
    assert.ok(!starter, `${name}: no draw/starter`);
    assert.doesNotMatch(r.stdout, /starter/, name);
  }
});

// fold.js keeps a copy of Spacesheep's new page. Run with SPACESHEEP_SRC=<the spacesheep repo> to check the copy
// against the platform's starterHtml: if they drift, start reads a new page as a design, the agent lays the
// starter by hand, and this test says so.
test("fold.js's copy of Spacesheep's new page matches starterHtml", { skip: !process.env.SPACESHEEP_SRC && "set SPACESHEEP_SRC to the spacesheep repo" }, () => {
  const src = fs.readFileSync(path.join(process.env.SPACESHEEP_SRC, "packages", "app", "src", "index.ts"), "utf8");
  const theirs = /function starterHtml\(title: string\): string \{\n  return `([\s\S]*?)`;\n\}/.exec(src);
  assert.ok(theirs, "starterHtml not found in packages/app/src/index.ts");
  const ours = /const platformBlank = \(title\) => `([\s\S]*?)`;/.exec(fs.readFileSync(FOLD, "utf8"));
  assert.equal(ours[1], theirs[1].replace("${escapeHtml(title)}", "${title}"));
  assert.equal(PLATFORM_BLANK, theirs[1].replace("${escapeHtml(title)}", "Untitled"));
});

test("focus sets the canvas's focus meta, and nothing else, then pushes the page; all puts it back", () => {
  const { folder, fold, sent } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const page = path.join(folder, "work", "index.html");
  const edited = BASE.replace('data-ss-id="direction-first" data-ss-thing="direction/first"', 'data-ss-id="direction-night-watch" data-ss-thing="direction/night-watch"');
  fs.writeFileSync(page, edited);
  assert.match(edited, /<meta name="ss-canvas-focus" content="all">/);
  const r = fold(["focus", "night-watch"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^focus: direction-night-watch, pushed$/m);
  const focused = edited.replace('<meta name="ss-canvas-focus" content="all">', '<meta name="ss-canvas-focus" content="direction-night-watch">');
  assert.equal(fs.readFileSync(page, "utf8"), focused);
  assert.equal(sent().at(-1).html, focused, "the focused page is the one pushed");
  assert.equal(fold(["focus", "all"]).status, 0);
  assert.equal(fs.readFileSync(page, "utf8"), edited);
});

test("focus refuses a direction the page doesn't have, and changes and pushes nothing", () => {
  const { folder, fold, sent } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const before = sent().length;
  const r = fold(["focus", "night-watch"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /focus: give all or a direction on the page \(first, second, third\)/);
  assert.equal(fs.readFileSync(path.join(folder, "work", "index.html"), "utf8"), BASE);
  assert.equal(sent().length, before, "nothing pushed");
});

test("focus gives a page from before the meta its focus beside the ss-canvas meta, in the writer's frame too", () => {
  const { folder, fold } = setup();
  assert.equal(fold(["start", "--new", "Poster"]).status, 0);
  const old = BASE.replace('<meta name="ss-canvas-focus" content="all">\n', "");
  for (const f of [["work", "index.html"], ["draw", "frame.html"]]) fs.writeFileSync(path.join(folder, ...f), old);
  assert.equal(fold(["focus", "second"]).status, 0);
  for (const f of [["work", "index.html"], ["draw", "frame.html"]])
    assert.equal(fs.readFileSync(path.join(folder, ...f), "utf8"), old.replace('<meta name="ss-canvas" content="on">', '<meta name="ss-canvas" content="on">\n<meta name="ss-canvas-focus" content="direction-second">'), f.join("/"));
});
